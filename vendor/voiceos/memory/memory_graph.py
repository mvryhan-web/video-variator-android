class MemoryGraph:

    def __init__(self):

        self.graph = []

    def add_fact(self, entity, relation, value):

        fact = {
            "entity": entity,
            "relation": relation,
            "value": value
        }

        self.graph.append(fact)

    def query(self, entity, relation):

        for fact in self.graph:

            if fact["entity"] == entity and fact["relation"] == relation:
                return fact["value"]

        return None