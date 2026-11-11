from llm.llm_client import LLMClient


class Summarizer:

    def __init__(self):

        self.llm = LLMClient()

    def summarize(self, text):

        prompt = f"""
Summarize the following web content clearly:

{text[:4000]}
"""

        return self.llm.generate(prompt)