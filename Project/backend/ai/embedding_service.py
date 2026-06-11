import os
import logging
import threading
import hashlib
import random

logger = logging.getLogger(__name__)


def get_deterministic_dummy_vector(text: str) -> list[float]:
    """
    Generates a deterministic pseudo-random unit vector of length 384 based on the input text.
    Ensures that identical text inputs produce identical vectors (similarity = 1.0),
    while different texts produce highly orthogonal vectors (similarity close to 0.0),
    safeguarding vector store calculations from division-by-zero or NaN errors.
    """
    cleaned = text.strip().replace("\n", " ")
    
    # Compute SHA-256 of the cleaned text to get a deterministic seed
    hasher = hashlib.sha256(cleaned.encode("utf-8"))
    seed_int = int(hasher.hexdigest()[:16], 16)
    
    # Initialize a local Random instance with the seed
    rng = random.Random(seed_int)
    
    # Generate 384 dimensions
    vector = [rng.uniform(-1.0, 1.0) for _ in range(384)]
    
    # L2-normalize the vector to unit length
    sq_sum = sum(x * x for x in vector)
    norm = sq_sum ** 0.5
    if norm > 1e-9:
        vector = [x / norm for x in vector]
    else:
        # Fallback to standard unit vector in the highly improbable case of zero norm
        vector = [1.0] + [0.0] * 383
        
    return vector


class EmbeddingService:
    """
    Singleton service class for generating dense vector embeddings.
    Supports lazy loading of the ML model weights and a cloud-safe disabled mode
    to prevent memory exhaustion crashes on restricted platforms like Render Free Tier.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super(EmbeddingService, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        if getattr(self, "_initialized", False):
            return
            
        self.model_name = model_name
        self.model = None
        self.device = None
        
        # Read cloud configurations: EMBEDDINGS_ENABLED defaults to True for local dev
        enabled_env = os.environ.get("EMBEDDINGS_ENABLED", "True")
        self.enabled = enabled_env.lower() in ("true", "1", "yes")
        
        if not self.enabled:
            logger.warning("EmbeddingService: Embeddings are disabled via EMBEDDINGS_ENABLED environment variable. Skip model load.")
        else:
            logger.info(
                f"EmbeddingService initialized with model '{model_name}'. "
                "PyTorch and model weights will be lazily loaded on the first request."
            )
            
        self._initialized = True

    def _load_model(self):
        """
        Private method to lazily import libraries and load the SentenceTransformer model.
        Guarantees that torch and sentence_transformers are never loaded in memory if
        embeddings are disabled.
        """
        if not self.enabled:
            logger.warning("EmbeddingService._load_model called but embeddings are disabled. Model skipped.")
            return

        if self.model is not None:
            return

        with self._lock:
            if self.model is not None:
                return

            try:
                logger.info("EmbeddingService: lazy loading torch and sentence_transformers libraries...")
                import torch
                from sentence_transformers import SentenceTransformer
                
                self.device = "cuda" if torch.cuda.is_available() else "cpu"
                logger.info(f"Loading SentenceTransformer model '{self.model_name}' on device '{self.device}'...")
                
                self.model = SentenceTransformer(self.model_name, device=self.device)
                logger.info(f"Successfully loaded SentenceTransformer model '{self.model_name}' on device '{self.device}'.")
            except Exception as e:
                logger.error(f"Failed to lazy-load SentenceTransformer model: {e}")
                raise e

    def get_embedding(self, text: str) -> list[float]:
        """
        Generate a 384-dimensional vector embedding for a single text input.
        
        Args:
            text (str): Input text payload.
            
        Returns:
            list[float]: Python list representing the embedding coordinates.
        """
        if not text:
            raise ValueError("Input text cannot be empty.")

        if not self.enabled:
            logger.info("EmbeddingService: Generating deterministic dummy embedding (embeddings disabled).")
            return get_deterministic_dummy_vector(text)

        self._load_model()
        
        try:
            logger.info("Embedding generation started.")
            cleaned_text = text.strip().replace("\n", " ")
            embedding = self.model.encode(cleaned_text, convert_to_numpy=True)
            logger.info("Embedding generation completed.")
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise e

    def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        """
        Generate vector embeddings for a batch of text inputs.
        
        Args:
            texts (list[str]): List of input text strings.
            
        Returns:
            list[list[float]]: List of float coordinate lists.
        """
        if not texts:
            return []

        if not self.enabled:
            logger.info(f"EmbeddingService: Generating deterministic dummy embeddings for batch of {len(texts)} texts (embeddings disabled).")
            return [get_deterministic_dummy_vector(t) for t in texts]

        self._load_model()
        
        try:
            logger.info(f"Batch embedding generation started for {len(texts)} texts.")
            cleaned_texts = [t.strip().replace("\n", " ") for t in texts]
            embeddings = self.model.encode(cleaned_texts, convert_to_numpy=True)
            logger.info("Batch embedding generation completed.")
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            raise e
