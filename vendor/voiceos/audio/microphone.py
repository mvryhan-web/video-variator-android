import sounddevice as sd
import numpy as np


class MicrophoneStream:

    def __init__(self, samplerate=16000, chunk_size=1024):

        self.samplerate = samplerate
        self.chunk_size = chunk_size

    def stream(self):

        with sd.InputStream(
            samplerate=self.samplerate,
            channels=1,
            blocksize=self.chunk_size,
            dtype="float32"
        ) as stream:

            while True:
                audio, _ = stream.read(self.chunk_size)
                yield audio.flatten()