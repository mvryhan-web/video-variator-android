"""Validate and package generated clips only. Never includes keys or reference audio."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import wave
import zipfile


def package(root):
    catalog = json.loads((root / 'jarvix-phrases.json').read_text(encoding='utf-8'))
    phrases = [(language, item) for language, items in catalog['phrases'].items() for item in items]
    expected = catalog.get('totalPhrases')
    per_language = catalog.get('perLanguage')
    if len(phrases) != expected or any(len(catalog['phrases'].get(language, [])) != per_language for language in ['ru', 'en', 'fr', 'es']):
        raise ValueError('Phrase catalog totals do not match metadata')
    if len({item['id'] for _, item in phrases}) != expected:
        raise ValueError('Duplicate phrase IDs')
    folder = root / 'app/src/main/assets/media/jarvix/clips'
    checked = []
    # Validate every input before starting conversion or creating an archive.
    for language, item in phrases:
        identifier = item['id']
        if not re.fullmatch(r'jarvix_' + language + r'_\d{2}', identifier):
            raise ValueError('Invalid clip ID')
        file = folder / (identifier + '.wav')
        metadata = json.loads(file.with_suffix('.json').read_text(encoding='utf-8'))
        if metadata.get('text') != item['text'] or metadata.get('language') != language:
            raise ValueError('Clip text does not match catalog: ' + identifier)
        with wave.open(str(file)) as audio:
            if (audio.getframerate(), audio.getnchannels(), audio.getsampwidth()) != (48000, 1, 2) or audio.getnframes() == 0:
                raise ValueError('Invalid WAV: ' + identifier)
        checked.append((language, item, file))
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        raise RuntimeError('FFmpeg is required for MP3 packaging')
    entries = []
    for number, (language, item, wav) in enumerate(checked, 1):
        mp3 = wav.with_suffix('.mp3')
        temporary = wav.with_suffix('.partial.mp3')
        subprocess.run([ffmpeg, '-v', 'error', '-y', '-i', str(wav), '-ar', '48000',
                        '-c:a', 'libmp3lame', '-b:a', '192k', str(temporary)], check=True)
        temporary.replace(mp3)
        digest = hashlib.sha256(mp3.read_bytes()).hexdigest()
        entries.append({'id': item['id'], 'language': language, 'text': item['text'],
                        'sha256': digest, 'url': '/media/jarvix/clips/' + mp3.name + '?v=' + digest[:12]})
        print('MP3:', number, '/' + str(expected), flush=True)
    manifest = folder / 'manifest.json'
    manifest.write_text(json.dumps({'version': 1, 'expected': expected, 'ready': expected, 'clips': entries}, ensure_ascii=False), encoding='utf-8')
    archive = root / ('jarvis-' + str(expected) + '-clips.zip')
    temporary_archive = archive.with_suffix('.partial.zip')
    with zipfile.ZipFile(temporary_archive, 'w', compression=zipfile.ZIP_DEFLATED) as output:
        output.write(manifest, 'clips/manifest.json')
        for _, _, wav in checked:
            output.write(wav.with_suffix('.mp3'), 'clips/' + wav.with_suffix('.mp3').name)
    temporary_archive.replace(archive)
    print('PACKAGE READY:', archive, flush=True)


if __name__ == '__main__':
    package(Path.home() / 'Jarvis')
