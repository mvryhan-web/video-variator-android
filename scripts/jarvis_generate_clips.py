"""Generate owner-voice clips through the already running LOCAL VoxCPM2 server."""
import argparse, hashlib, io, json, re, time, urllib.request, wave
from pathlib import Path

root = Path.home() / "Jarvis"
parser = argparse.ArgumentParser()
parser.add_argument("--all", action="store_true", help="Generate the complete approved catalog")
args = parser.parse_args()
token = (root / "voice-token.txt").read_text(encoding="utf-8").strip()
catalog = json.loads((root / "jarvix-phrases.json").read_text(encoding="utf-8"))
output = root / "app/src/main/assets/media/jarvix/clips"
output.mkdir(parents=True, exist_ok=True)
def synthesize(text, language):
    request = urllib.request.Request("http://127.0.0.1:8765/tts",
        data=json.dumps({"text":text,"language":language}).encode(),
        headers={"Content-Type":"application/json","Authorization":"Bearer "+token})
    with urllib.request.urlopen(request, timeout=180) as reply:
        data = reply.read()
    with wave.open(io.BytesIO(data)) as audio:
        if (audio.getframerate(),audio.getnchannels(),audio.getsampwidth()) != (48000,1,2):
            raise RuntimeError("Expected mono 48 kHz PCM16")
        return audio.readframes(audio.getnframes())
def save(identifier, text, language, separate=False):
    file = output / (identifier + ".wav")
    stamp = file.with_suffix(".json")
    signature = hashlib.sha256((language+"\n"+text+"\n"+str(separate)).encode()).hexdigest()
    if file.exists() and stamp.exists() and json.loads(stamp.read_text()).get("signature")==signature:
        with wave.open(str(file)) as audio:
            if audio.getnframes()>0 and audio.getframerate()==48000:
                print("Already ready:",identifier,flush=True);return
    parts = re.split(r"(?<=[.!?])\s+",text) if separate else [text]
    pcm = bytearray()
    for index, part in enumerate(parts):
        if index: pcm.extend(b"\0" * (int(48000*.3)*2))
        pcm.extend(synthesize(part,language))
    temporary=file.with_suffix(".partial.wav")
    with wave.open(str(temporary),"wb") as audio:
        audio.setnchannels(1);audio.setsampwidth(2);audio.setframerate(48000);audio.writeframes(pcm)
    temporary.replace(file)
    stamp.write_text(json.dumps({"id":identifier,"text":text,"language":language,"signature":signature},ensure_ascii=False),encoding="utf-8")
    print("Ready:",file,flush=True)
if not args.all:
    save("preview_natural","Привет! Я Джарвис. Рад вас слышать. Чем могу помочь?","ru")
    save("preview_pauses","Привет! Я Джарвис. Слушаю вас.","ru",separate=True)
    print("Listen to preview_natural.wav and preview_pauses.wav before generating the catalog.")
else:
    phrases=[(lang,item) for lang,items in catalog["phrases"].items() for item in items]
    identifiers=[item["id"] for lang,item in phrases]
    if len(phrases)!=200 or len(set(identifiers))!=200 or any(len(catalog["phrases"].get(lang,[]))!=50 for lang in ["ru","en","fr","es"]):
        raise RuntimeError("Expected 200 unique clips, 50 per language")
    for number,(lang,item) in enumerate(phrases,1):
        if not re.fullmatch(r"jarvix_(ru|en|fr|es)_\d{2}",item["id"]):raise RuntimeError("Invalid clip ID")
        print(str(number)+"/200",flush=True)
        save(item["id"],item["text"],lang)
    print("ALL 200 CLIPS READY")
