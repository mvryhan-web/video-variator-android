import requests
from core.config import config
from core.logger import logger


class LLMClient:

    def __init__(self, model=None):

        self.model = model or config.llm_model
        self.url = config.llm_endpoint

    def generate(self, prompt):

        response = requests.post(
            self.url,
            json={
                "model": self.model,
                "prompt": prompt,
                "stream": False
            }
        )

        return response.json()["response"]