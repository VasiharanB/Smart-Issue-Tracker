import logging
from typing import Optional, Dict, Any
from django.conf import settings
from backend.models import Ticket
from .embedding_service import EmbeddingService
from .vector_store import FAISSVectorStore
from .gemini_verifier import GeminiVerifier

logger = logging.getLogger(__name__)

class DuplicateDetector:
    """
    Coordinator class orchestrating the Ticket Deduplication lifecycle.
    1. Translates tickets to sentence-transformer vector representation.
    2. Runs FAISS indices searches to get Top 5 database match candidates.
    3. Runs candidate comparisons through Gemini LLM verifications.
    """
    def __init__(self, index_file_path: str = "faiss_index.bin"):
        self.embedding_service = EmbeddingService()
        self.vector_store = FAISSVectorStore(dimension=384, index_file_path=index_file_path)
        self.verifier = GeminiVerifier()
        
        # Read matching configuration from Django settings (e.g. threshold confidence)
        self.confidence_threshold = getattr(settings, "DEDUPLICATION_CONFIDENCE_THRESHOLD", 80)
        self.similarity_threshold = getattr(settings, "DEDUPLICATION_SIMILARITY_THRESHOLD", 0.75)

    def register_ticket(self, ticket: Ticket):
        """
        Calculates and stores a ticket's embedding vector inside the FAISS index cache.
        Usually executed right after saving a new ticket to the database.
        
        Args:
            ticket (Ticket): The Django Ticket model instance.
        """
        try:
            payload = self._build_payload(
                category_name=ticket.category.name,
                subject=ticket.subject,
                description=ticket.description
            )
            embedding = self.embedding_service.get_embedding(payload)
            self.vector_store.add_vector(ticket.id, embedding)
            logger.info(f"Successfully registered vector for Ticket ID: {ticket.id} ({ticket.ticket_code})")
        except Exception as e:
            logger.error(f"Failed to calculate and store vector mapping for Ticket ID {ticket.id}: {e}")

    def detect_duplicate(self, new_ticket_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Deduplication execution flow. Finds if the incoming ticket details 
        are matching any previously logged tickets.
        
        Args:
            new_ticket_data (Dict[str, Any]): Ingested data containing:
                - category_name (str)
                - subject (str)
                - description (str)
                
        Returns:
            Optional[Dict[str, Any]]: Returns details of the match if validated, else None:
                - matched_ticket (Ticket): The duplicate source master ticket.
                - similarity_score (float): Numeric vector similarity.
                - confidence (int): LLM confidence score.
                - reason (str): Verification reasoning.
        """
        category_name = new_ticket_data.get("category_name", "")
        subject = new_ticket_data.get("subject", "")
        description = new_ticket_data.get("description", "")
        
        payload = self._build_payload(category_name, subject, description)
        
        # 1. Fetch text embedding from sentence-transformers
        try:
            query_embedding = self.embedding_service.get_embedding(payload)
        except Exception as e:
            logger.error(f"Deduplication process aborted. Embedding failed: {e}")
            return None

        # 2. Search FAISS index for Top 5 candidates
        candidates = self.vector_store.search(query_embedding, top_k=5)
        logger.info(f"FAISS vector search retrieved {len(candidates)} candidates.")

        best_candidate = None
        best_similarity = 0.0

        for candidate in candidates:
            ticket_id = candidate["ticket_id"]
            similarity = candidate["similarity"]

            # Fetch matching ticket from the database
            try:
                existing_ticket = Ticket.objects.get(id=ticket_id)
            except Ticket.DoesNotExist:
                logger.warning(f"Ticket ID {ticket_id} in FAISS index not found in DB. Cleaning index...")
                self.vector_store.remove_ticket(ticket_id)
                continue

            # Skip comparing tickets that are already flagged as duplicates
            if existing_ticket.status == Ticket.Status.DUPLICATE:
                continue

            # Only check tickets within the same category to maintain context logic
            if existing_ticket.category.name.lower() != category_name.lower():
                continue

            best_candidate = existing_ticket
            best_similarity = similarity
            break

        if best_candidate is None:
            return None

        # Rule A: Similarity >= 0.90 => automatic duplicate
        if best_similarity >= 0.90:
            return {
                "matched_ticket": best_candidate,
                "similarity_score": best_similarity,
                "confidence": 100,
                "reason": "Auto Duplicate: FAISS similarity score met or exceeded 90%.",
                "decision_flow": "Auto Duplicate (90%+)",
                "verification_source": "auto_duplicate"
            }

        # Rule B: Similarity >= 0.75 and < 0.90 => require Gemini verification
        elif best_similarity >= 0.75:
            existing_data = {
                "category": best_candidate.category.name,
                "subject": best_candidate.subject,
                "description": best_candidate.description
            }
            logger.info(f"Starting Gemini validation. Candidate: {best_candidate.ticket_code}, Sim Score: {best_similarity:.4f}")
            verification = self.verifier.verify(new_ticket_data, existing_data)

            if verification:
                v_source = verification.get("verification_source", "gemini")
                if v_source == "fallback":
                    # Rule C: similarity >= 75% and Gemini fails -> FAISS Fallback Duplicate
                    return {
                        "matched_ticket": best_candidate,
                        "similarity_score": best_similarity,
                        "confidence": int(round(best_similarity * 100)),
                        "reason": f"FAISS Fallback Duplicate: Gemini failed/disabled. Used FAISS similarity of {int(round(best_similarity * 100))}%.",
                        "decision_flow": "FAISS Fallback Duplicate",
                        "verification_source": "faiss_fallback"
                    }
                else:
                    # Rule B: Gemini available -> Gemini decides
                    if verification.get("same_issue"):
                        confidence = verification.get("confidence", 0)
                        if confidence >= self.confidence_threshold:
                            return {
                                "matched_ticket": best_candidate,
                                "similarity_score": best_similarity,
                                "confidence": confidence,
                                "reason": verification.get("reason", ""),
                                "decision_flow": "Gemini Verified",
                                "verification_source": "gemini"
                            }
            return None

        # Rule D: Similarity < 0.75 => unique (return None)
        return None

    def _build_payload(self, category_name: str, subject: str, description: str) -> str:
        """
        Concatenates metadata fields into a single search text block.
        """
        return f"Category: {category_name}\nSubject: {subject}\nDescription: {description}"
