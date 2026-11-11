import random


class ResponseSelector:

    def __init__(self):

        self.responses = [
            "mm-hmm",
            "I see",
            "right",
            "go on",
            "okay"
        ]

    def select(self):

        return random.choice(self.responses)