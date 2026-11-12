"""Offline tests for standalone 552-MP3 JARVIX NEW desktop voice index."""
from __future__ import annotations

import http.client
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from jarvis_new.voice_library_desktop import Library, language_of, normalise, voice_api


class LibraryTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        # No GitHub/audio-bundle import required for these small deterministic tests.
        with patch("jarvis_new.voice_library_desktop.bundle_dir",return_value=Path(self.temp.name)/"unbundled"):
            self.db=Library(Path(self.temp.name)/"store")
        self.audio=Path(self.temp.name)/"test.mp3"
        self.audio.write_bytes(b"ID3"+b"\0"*40)

    def test_languages_and_normalisation(self):
        self.assertEqual(language_of("jarvix_ru_86.mp3"),"ru")
        self.assertEqual(language_of("t3_fr_aabbccddeeff.mp3"),"fr")
        self.assertEqual(language_of("jarvix_tour_nav_es.mp3"),"es")
        self.assertEqual(normalise("ПРИВЁТ!  Jarvix?"),"привет jarvix")

    def test_import_approve_reply_and_revoke(self):
        self.assertTrue(self.db.add(self.audio,"ru"))
        self.assertFalse(self.db.add(self.audio,"ru"))
        self.assertEqual(self.db.counts()["total"],1)
        self.assertEqual(self.db.counts()["approved"],0)
        self.assertEqual(self.db.counts()["fragments"],0)
        self.assertIsNone(self.db.answer("Привет","ru"))
        identity=self.db.list("ru")[0]["id"]
        self.db.review(identity,"Привет! Я JARVIX.","Привет")
        self.assertEqual(self.db.answer("ПРИВЕТ!","ru")["id"],identity)
        self.assertIsNone(self.db.answer("Привет","en"))
        self.assertIsNone(self.db.answer("Какая погода в Париже?","ru"))
        self.db.revoke(identity)
        self.assertIsNone(self.db.answer("Привет","ru"))

    def test_invalid_files_and_missing_review(self):
        file=Path(self.temp.name)/"bogus.mp3"
        file.write_bytes(b"not an mp3")
        with self.assertRaises(ValueError):
            self.db.add(file,"ru")
        with self.assertRaises(ValueError):
            self.db.add(self.audio,"xx")
        self.db.add(self.audio,"ru")
        with self.assertRaises(ValueError):
            self.db.review(self.db.list("ru")[0]["id"],"Привет","")

    def test_persist_owner_approval(self):
        self.db.add(self.audio,"ru")
        identity=self.db.list("ru")[0]["id"]
        self.db.review(identity,"Подтверждённый текст","Где мой текст?")
        with patch("jarvis_new.voice_library_desktop.bundle_dir",return_value=Path(self.temp.name)/"unbundled"):
            db_again=Library(Path(self.temp.name)/"store")
        self.assertEqual(db_again.answer("Где мой текст?","ru")["id"],identity)

    def test_http_origin_and_audio_approval(self):
        self.db.add(self.audio,"ru")
        identity=self.db.list("ru")[0]["id"]
        with patch("jarvis_new.voice_library_desktop.PORT",0):
            server=voice_api(self.db)
        import threading
        th=threading.Thread(target=server.serve_forever,daemon=True)
        th.start()
        self.addCleanup(lambda:(server.shutdown(),server.server_close(),th.join(2)))
        conn=http.client.HTTPConnection("127.0.0.1",server.server_port,timeout=3)
        self.addCleanup(conn.close)
        conn.request("GET","/v1/status",headers={"Origin":"https://evil.example"})
        resp=conn.getresponse();resp.read()
        self.assertEqual(resp.status,403)
        conn.request("GET","/v1/audio?id="+identity,headers={
          "Origin":"https://jarvis-new.deepsyq.pages.dev"})
        resp=conn.getresponse();resp.read()
        self.assertEqual(resp.status,404)
        self.db.review(identity,"Привет","Как дела?")
        conn.request("GET","/v1/audio?id="+identity,headers={
          "Origin":"https://jarvis-new.deepsyq.pages.dev"})
        resp=conn.getresponse()
        self.assertEqual(resp.status,200)
        self.assertTrue(resp.read().startswith(b"ID3"))
        conn.request("POST","/v1/find",body=json.dumps({
            "language":"ru","question":"Как дела?"}),headers={
              "Content-Type":"application/json","Origin":"https://jarvis-new.deepsyq.pages.dev"})
        resp=conn.getresponse();payload=json.loads(resp.read())
        self.assertEqual(resp.status,200)
        self.assertTrue(payload["found"])
        self.assertEqual(payload["id"],identity)


if __name__=="__main__":
    unittest.main()
