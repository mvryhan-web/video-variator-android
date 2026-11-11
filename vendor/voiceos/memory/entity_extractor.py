class EntityExtractor:

    def extract(self, text):

        if "my research topic is" in text.lower():

            topic = text.lower().split("is")[-1].strip()

            return {
                "entity": "user",
                "relation": "research_topic",
                "value": topic
            }

        return None