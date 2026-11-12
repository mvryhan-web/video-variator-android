"""Safe/consensual prerecorded phrase concatenation tests — NO AI provider calls."""
from pathlib import Path
import json
import tempfile
import unittest
from unittest.mock import patch
from jarvis_new.voice_library_desktop import Library,voice_api
from jarvis_new.voice_library_blocks import ffmpeg_bin


class PhraseBlocksTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        with patch("jarvis_new.voice_library_desktop.bundle_dir",return_value=Path(self.temp.name)/"empty"):
            self.library=Library(Path(self.temp.name)/"index")
        self.a=Path(self.temp.name)/"a.mp3"
        self.b=Path(self.temp.name)/"b.mp3"
        self.a.write_bytes(b"ID3"+b"\0"*4096)
        self.b.write_bytes(b"ID3"+b"\1"*4096)
        self.library.add(self.a,"ru")
        self.library.add(self.b,"ru")
        rows=self.library.list("ru")
        self.id_a=next(r["id"] for r in rows if r["name"]=="a.mp3")
        self.id_b=next(r["id"] for r in rows if r["name"]=="b.mp3")
        self.library.review(self.id_a,"Я могу помочь тебе.","Какие есть возможности?")
        self.library.review(self.id_b,"Создать видео в DEEPSYQ.","Как создать видео?")

    def approved_fragments(self):
        a=self.library.blocks.create_segment(self.id_a,"Я могу помочь",0.0,1.0,human_confirmed=True)
        b=self.library.blocks.create_segment(self.id_b,"создать видео",0.2,1.1,human_confirmed=True)
        return a,b

    def test_confirmation_required_and_word_boundaries(self):
        with self.assertRaisesRegex(ValueError,"прослушай"):
            self.library.blocks.create_segment(self.id_a,"Я могу помочь",0,1)
        with self.assertRaisesRegex(ValueError,"утвержд"):
            self.library.blocks.create_segment(self.id_a,"новые слова",0,1,human_confirmed=True)
        with self.assertRaises(ValueError):
            self.library.blocks.create_segment(self.id_a,"могу",-1,1,human_confirmed=True)
        with self.assertRaises(ValueError):
            self.library.blocks.create_segment(self.id_a,"могу",0,131,human_confirmed=True)
        with self.assertRaises(ValueError):
            self.library.blocks.create_segment(self.id_a,"могу",float("nan"),1,human_confirmed=True)

    def test_exact_coverage_and_order_only(self):
        a,b=self.approved_fragments()
        p=self.library.blocks.plan("Я МОГУ помочь создать видео!","ru")
        self.assertEqual([s["id"] for s in p],[a,b])
        with self.assertRaisesRegex(ValueError,"Нет полного набора"):
            self.library.blocks.plan("Я могу мгновенно помочь создать видео","ru")
        with self.assertRaisesRegex(ValueError,"Нет полного набора"):
            self.library.blocks.plan("Создать видео я могу помочь", "en")

    def test_composed_requires_audio_preview_and_approval(self):
        self.approved_fragments()
        calls=[]
        def fake_run(command,**kwargs):
            calls.append(command)
            Path(command[-1]).write_bytes(b"ID3"+b"\2"*3200)
        with patch("jarvis_new.voice_library_blocks.ffmpeg_bin",return_value="ffmpeg"), \
             patch("jarvis_new.voice_library_blocks.subprocess.run",side_effect=fake_run):
            digest,filename,n=self.library.blocks.compose_preview("Помоги с видео",
               "Я могу помочь создать видео","ru")
        self.assertEqual(n,2)
        self.assertTrue(filename.exists())
        self.assertEqual(len(calls),1)
        self.assertIn("concat=n=2:v=0:a=1[out]"," ".join(calls[0]))
        self.assertIsNone(self.library.answer("Помоги с видео","ru"))
        self.assertIsNone(self.library.blocks.get(digest,approved_only=True))
        with self.assertRaisesRegex(ValueError,"прослушай"):
            self.library.blocks.approve(digest)
        self.library.blocks.approve(digest,listened=True)
        self.assertEqual(self.library.answer("Помоги с видео","ru")["id"],digest)
        self.assertTrue(self.library.get(digest,approved_only=True))
        self.assertEqual(self.library.counts()["composed_approved"],1)

    def test_revoke_source_disables_all_compositions(self):
        self.approved_fragments()
        def fake_run(cmd,**kwargs):
            Path(cmd[-1]).write_bytes(b"ID3"+b"x"*4500)
        with patch("jarvis_new.voice_library_blocks.ffmpeg_bin",return_value="ffmpeg"), \
             patch("jarvis_new.voice_library_blocks.subprocess.run",side_effect=fake_run):
            digest,_,_=self.library.blocks.compose_preview("Помоги с видео",
                "Я могу помочь создать видео","ru")
        self.library.blocks.approve(digest,listened=True)
        self.library.revoke(self.id_a)
        self.assertIsNone(self.library.answer("Помоги с видео","ru"))
        self.assertIsNone(self.library.get(digest,approved_only=True))
        self.assertEqual(self.library.counts()["composed_approved"],0)

    def test_real_ffmpeg_stitch_two_audio_fragments(self):
        try:binary=ffmpeg_bin()
        except RuntimeError:self.skipTest("ffmpeg binary not installed")
        import subprocess
        sample=Path(self.temp.name)/"real.mp3"
        command=[binary,"-nostdin","-hide_banner","-loglevel","error","-f","lavfi","-i",
                 "sine=frequency=330:duration=1.0","-ac","1","-ar","24000","-c:a","libmp3lame","-y",str(sample)]
        try:subprocess.run(command,check=True,timeout=15,capture_output=True)
        except (subprocess.CalledProcessError,subprocess.TimeoutExpired):
            self.skipTest("ffmpeg test renderer unavailable")
        self.library.add(sample,"ru")
        digest=next(r["id"] for r in self.library.list("ru") if r["name"]=="real.mp3")
        self.library.review(digest,"Привет Джарвис","Скажи привет")
        self.library.blocks.create_segment(digest,"Привет",0.1,0.3,human_confirmed=True)
        self.library.blocks.create_segment(digest,"Джарвис",0.4,0.8,human_confirmed=True)
        out,filename,n=self.library.blocks.compose_preview("Приветствие","Привет Джарвис","ru")
        self.assertEqual(n,2)
        self.assertGreater(filename.stat().st_size,1000)
        self.assertEqual(filename.read_bytes()[:3],b"ID3")
        self.library.blocks.approve(out,listened=True)
        self.assertEqual(self.library.answer("Приветствие","ru")["id"],out)


if __name__=="__main__":
    unittest.main()
