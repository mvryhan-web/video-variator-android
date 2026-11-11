import asyncio


class StreamPipeline:

    def __init__(self):

        self.audio_queue = asyncio.Queue()
        self.text_queue = asyncio.Queue()
        self.token_queue = asyncio.Queue()

    async def run(self, stt, llm, tts):

        while True:

            audio = await self.audio_queue.get()

            partial_text = stt.transcribe_stream(audio)

            for text in partial_text:

                await self.text_queue.put(text)

                tokens = llm.stream_response(text)

                for token in tokens:

                    await self.token_queue.put(token)

                    tts.speak_stream([token])