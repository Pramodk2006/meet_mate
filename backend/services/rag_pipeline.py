from typing import List, Generator
from fastembed import TextEmbedding
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from functools import lru_cache

class RagPipeline:
    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5"): # 384 dimensions
        self.embedding_model = TextEmbedding(model_name=model_name)
    
    def chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """
        Splits text into chunks of specified size (words/tokens approx) with overlap.
        Simple word-based chunking for now.
        """
        words = text.split()
        chunks = []
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i:i + chunk_size])
            chunks.append(chunk)
        return chunks

    def generate_embeddings(self, chunks: List[str]) -> Generator[List[float], None, None]:
        """
        Generates embeddings for a list of text chunks.
        """
        if not chunks:
            return []
        
        # fastembed returns a generator
        return self.embedding_model.embed(chunks)

@lru_cache()
def get_rag_pipeline():
    return RagPipeline()
