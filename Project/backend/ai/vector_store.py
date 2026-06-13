import os
import numpy as np
import faiss
import logging

logger = logging.getLogger(__name__)

from django.conf import settings

class FAISSVectorStore:
    """
    Manages vector storage and similarity searches using a FAISS Flat Inner Product index.
    Embeddings are L2 normalized before insertion and lookup to evaluate true Cosine Similarity.
    """
    def __init__(self, dimension: int = 384, index_file_path: str = None):
        self.dimension = dimension
        if index_file_path is None:
            index_file_path = getattr(settings, "FAISS_INDEX_PATH", "faiss_index.bin")
        self.index_file_path = index_file_path
        self.index = faiss.IndexFlatIP(self.dimension)
        
        # Maintains index mapping: FAISS position index -> Database Ticket ID
        self.id_map = []
        
        # Hydrate the index from disk if an existing cache is detected
        if os.path.exists(self.index_file_path):
            self.load()

    def add_vector(self, ticket_id: int, vector: list[float]):
        """
        Adds a single vector embedding to the index mapped to its database ticket ID.
        
        Args:
            ticket_id (int): Database key for the ticket.
            vector (list[float]): Raw 384-dimensional embedding coordinates.
        """
        if len(vector) != self.dimension:
            raise ValueError(f"Vector dimensions must be exactly {self.dimension}.")

        try:
            # Reshape vector to 2D numpy array for FAISS ingestion
            np_vector = np.array(vector, dtype=np.float32).reshape(1, -1)
            # Normalize vector to unit length
            faiss.normalize_L2(np_vector)
            
            # If the ticket ID already exists in index, we don't duplicate it.
            if ticket_id in self.id_map:
                logger.warning(f"Ticket ID {ticket_id} already exists in FAISS map. Skipping add.")
                return

            self.index.add(np_vector)
            self.id_map.append(ticket_id)
            self.save()
            logger.info(f"Added ticket ID {ticket_id} to vector index. Total: {self.index.ntotal}")
        except Exception as e:
            logger.exception(f"Failed to add vector to FAISS for ticket {ticket_id}")
            raise RuntimeError(f"FAISS add vector failure: {e}") from e

    def search(self, vector: list[float], top_k: int = 5) -> list[dict]:
        """
        Queries FAISS for the nearest semantic neighbors.
        
        Args:
            vector (list[float]): Embedding vector of the query.
            top_k (int): Number of similar candidate matches to retrieve.
            
        Returns:
            list[dict]: Array of matched dict payloads containing ticket_id and similarity score.
        """
        if len(vector) != self.dimension:
            raise ValueError(f"Query vector dimensions must be exactly {self.dimension}.")

        if self.index.ntotal == 0:
            return []
            
        try:
            np_vector = np.array(vector, dtype=np.float32).reshape(1, -1)
            faiss.normalize_L2(np_vector)
            
            actual_k = min(top_k, self.index.ntotal)
            # search returns (distances, indices)
            scores, indices = self.index.search(np_vector, actual_k)
            
            results = []
            stale_ids = []
            for score, idx in zip(scores[0], indices[0]):
                if idx == -1 or idx >= len(self.id_map):
                    continue
                ticket_id = self.id_map[idx]
                
                # Verify ticket exists in DB defensively to prevent downstream DoesNotExist exceptions
                from backend.models import Ticket
                if not Ticket.objects.filter(id=ticket_id).exists():
                    logger.warning(f"Ticket ID {ticket_id} cached in FAISS but missing in DB. Scheduling removal.")
                    stale_ids.append(ticket_id)
                    continue

                results.append({
                    "ticket_id": ticket_id,
                    "similarity": float(score)
                })

            # Clean stale IDs defensively
            for stale_id in stale_ids:
                try:
                    self.remove_ticket(stale_id)
                except Exception as clean_err:
                    logger.error(f"Failed to remove stale ticket {stale_id} from FAISS: {clean_err}")

            return results
        except Exception as e:
            logger.exception("FAISS search operation failed")
            raise RuntimeError(f"FAISS search operation failed: {e}") from e

    def remove_ticket(self, ticket_id: int):
        """
        Removes a vector embedding mapping from the FAISS store by database ticket ID.
        """
        if ticket_id not in self.id_map:
            return

        try:
            idx_to_remove = self.id_map.index(ticket_id)
            # FAISS IndexFlat supports deletion by ID using remove_ids
            # We map index locations dynamically
            ids_to_remove = np.array([idx_to_remove], dtype=np.int64)
            self.index.remove_ids(ids_to_remove)
            
            # Remove from mapping list
            self.id_map.pop(idx_to_remove)
            self.save()
            logger.info(f"Removed ticket ID {ticket_id} from vector store.")
        except Exception as e:
            logger.exception(f"Failed to remove vector index mapping for ticket {ticket_id}")
            raise RuntimeError(f"FAISS vector removal failed: {e}") from e

    def clear(self):
        """
        Wipes index data and deletes backing files.
        """
        self.index = faiss.IndexFlatIP(self.dimension)
        self.id_map = []
        
        if os.path.exists(self.index_file_path):
            try:
                os.remove(self.index_file_path)
                map_file = self.index_file_path + ".map"
                if os.path.exists(map_file):
                    os.remove(map_file)
                logger.info("Cleared FAISS index cache files from disk.")
            except Exception as e:
                logger.exception("Error removing FAISS disk cache")
                raise RuntimeError(f"FAISS clear operation failed: {e}") from e

    def save(self):
        """
        Persists index and mapping arrays to disk.
        """
        try:
            faiss.write_index(self.index, self.index_file_path)
            map_file = self.index_file_path + ".map"
            with open(map_file, "w") as f:
                f.write(",".join(map(str, self.id_map)))
        except Exception as e:
            logger.exception("Failed to serialize FAISS state")
            raise RuntimeError(f"FAISS serialization failure: {e}") from e

    def load(self):
        """
        Restores index and mapping from disk serialized files.
        """
        try:
            if os.path.exists(self.index_file_path):
                self.index = faiss.read_index(self.index_file_path)
                map_file = self.index_file_path + ".map"
                if os.path.exists(map_file):
                    with open(map_file, "r") as f:
                        content = f.read().strip()
                        if content:
                            self.id_map = [int(x) for x in content.split(",")]
                        else:
                            self.id_map = []
                logger.info(f"Successfully loaded FAISS index. Vectors cached: {self.index.ntotal}")
        except Exception as e:
            logger.exception(f"Failed to load FAISS state from {self.index_file_path}")
            raise RuntimeError(f"FAISS index load failure: {e}") from e
