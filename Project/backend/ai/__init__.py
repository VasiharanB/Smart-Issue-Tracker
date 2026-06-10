# AI Deduplication Engine Package
from .embedding_service import EmbeddingService
from .vector_store import FAISSVectorStore
from .gemini_verifier import GeminiVerifier
from .duplicate_detector import DuplicateDetector

__all__ = [
    'EmbeddingService',
    'FAISSVectorStore',
    'GeminiVerifier',
    'DuplicateDetector',
]
