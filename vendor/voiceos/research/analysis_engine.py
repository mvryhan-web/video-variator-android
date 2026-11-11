from llm.llm_client import LLMClient


class AnalysisEngine:

    def __init__(self):

        self.llm = LLMClient()

    def analyze(self, summaries):

        combined = "\n\n".join(summaries)

        prompt = f"""
Analyze the following information collected from multiple web sources.

Provide:

1. Key insights
2. Important trends
3. Final concise answer

Content:

{combined}
"""

        return self.llm.generate(prompt)