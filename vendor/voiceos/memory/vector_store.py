import chromadb
from sentence_transformers import SentenceTransformer


class VectorStore:

    def __init__(self):

        self.client = chromadb.Client()

        self.collection = self.client.create_collection(
            name="voiceos_memory"
        )

        self.embedder = SentenceTransformer(
            "all-MiniLM-L6-v2"
        )

    def add_memory(self, text):

        embedding = self.embedder.encode(text).tolist()

        self.collection.add(
            documents=[text],
            embeddings=[embedding],
            ids=[str(hash(text))]
        )

    def search(self, query):

        embedding = self.embedder.encode(query).tolist()

        results = self.collection.query(
            query_embeddings=[embedding],
            n_results=3
        )

        return results["documents"]