import json


class ReasoningParser:

    def parse(self, llm_output):

        try:
            data = json.loads(llm_output)
            return data

        except Exception:

            return {
                "intent": "unknown",
                "reasoning": "Failed to parse model output",
                "tool_needed": False
            }