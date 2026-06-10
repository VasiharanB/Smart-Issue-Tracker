import torch
from sentence_transformers import SentenceTransformer
import logging

logger = logging.getLogger(__name__)

class EmbeddingService:
    """
    Singleton service class for generating dense vector embeddings using
    the 'sentence-transformers/all-MiniLM-L6-v2' model.
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(EmbeddingService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        if getattr(self, "_initialized", False):
            return
        
        self.model_name = model_name
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Initializing EmbeddingService with model '{model_name}' on device '{self.device}'")
        
        try:
            # Load the pre-trained SentenceTransformer model onto the selected device
            self.model = SentenceTransformer(model_name, device=self.device)
            self._initialized = True
        except Exception as e:
            logger.error(f"Failed to load sentence-transformer model: {e}")
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
            
        try:
            cleaned_text = text.strip().replace("\n", " ")
            embedding = self.model.encode(cleaned_text, convert_to_numpy=True)
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
            
        try:
            cleaned_texts = [t.strip().replace("\n", " ") for t in texts]
            embeddings = self.model.encode(cleaned_texts, convert_to_numpy=True)
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            raise e
