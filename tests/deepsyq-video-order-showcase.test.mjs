import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = path.join(root, "app/src/main/assets");
const file = path.join(assetRoot, "video-sur-mesure.html");
const html = fs.readFileSync(file, "utf8");

test("video order gallery has ten distinct real MP4s and matching poster files", () => {
  const videos = [...html.matchAll(/file:"([^"]+\.mp4)"/g)].map((m) => m[1]);
  const posters = [...html.matchAll(/poster:"([^"]+\.(?:jpg|webp))"/g)].map((m) => m[1]);
  assert.equal(videos.length, 10);
  assert.equal(new Set(videos).size, 10);
  assert.equal(posters.length, 10);
  for (const rel of [...videos, ...posters]) {
    assert.ok(!rel.startsWith("/") && !rel.includes(".."), "invalid relative asset path");
    const p = path.join(assetRoot, rel);
    assert.ok(fs.existsSync(p), "missing media file: " + rel);
    assert.ok(fs.statSync(p).size > 0, "empty media file: " + rel);
  }
});

test("request is an honest mailto, not an unimplemented payment flow", () => {
  assert.match(html, /<form id="projectForm">/);
  assert.match(html, /id="company"[^>]*required/);
  assert.match(html, /id="email" type="email"[^>]*required/);
  assert.match(html, /id="brief"[^>]*maxlength="1800"/);
  assert.match(html, /mailto:mvryhan@gmail\.com\?subject=/);
  assert.match(html, /Aucun paiement n'est encaissé sur cette page/);
  assert.doesNotMatch(html, /https:\/\/checkout\.stripe\.com/);
});

test("page contains mobile layout and accessible playback controls", () => {
  assert.match(html, /@media\(max-width:780px\)/);
  assert.match(html, /@media\(max-width:460px\)/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /setAttribute\("aria-label","Lire la vidéo/);
  assert.match(html, /preload="none"/);
  assert.match(html, /lang="fr"/);
  assert.match(html, /name="robots" content="noindex,nofollow"/);
});

test("inline browser script compiles without syntax error", () => {
  const script = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(script, "missing inline script");
  assert.doesNotThrow(() => new vm.Script(script[1]));
});
