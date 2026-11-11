#!/usr/bin/env python3
"""Real Chromium UI ↔ JARVIX NEW localhost bridge smoke.

Tests the deployed website frontend *assets* on an isolated HTTP origin.
No paid AI, no production API, no browser flags bypassing local network policy.
Does not assert remote Cloudflare availability (separate online check).
"""
from __future__ import annotations

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread

from jarvis_new.coordinator import Coordinator
from jarvis_new.local_bridge import LocalBridge

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "app" / "src" / "main" / "assets"
WEB_PORT = 18769
BRIDGE_PORT = 8768


class SilentHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def main() -> int:
    from playwright.sync_api import sync_playwright, expect
    with TemporaryDirectory(prefix="jarvix-new-browser-") as temporary:
        coordinator = Coordinator(Path(temporary) / "tasks.sqlite", owner="playwright-test")
        server = ThreadingHTTPServer(
            ("127.0.0.1", WEB_PORT),
            partial(SilentHandler, directory=str(ASSETS)),
        )
        bridge = LocalBridge(coordinator, port=BRIDGE_PORT,
                             allowed_origin=f"http://127.0.0.1:{WEB_PORT}")
        site_thread = Thread(target=server.serve_forever, daemon=True)
        site_thread.start()
        bridge.start()
        try:
            with sync_playwright() as pw:
                browser = pw.chromium.launch(headless=True)
                try:
                    page = browser.new_page(viewport={"width": 1440, "height": 900})
                    response = page.goto(f"http://127.0.0.1:{WEB_PORT}/jarvix-connect.html", wait_until="load")
                    assert response and response.status == 200, "Test connection HTML did not load"
                    page.locator("#lang").select_option("ru")
                    page.locator("#token").fill(bridge.token)
                    page.locator("#connect").click()
                    expect(page.locator("#status")).to_contain_text("Соединение подтверждено", timeout=10000)
                    expect(page.locator("#submit")).to_be_enabled()
                    page.locator("#kind").select_option("video")
                    page.locator("#prompt").fill("One queued video request — no provider call")
                    page.locator("#submit").click()
                    expect(page.locator("#status")).to_contain_text("Задание записано", timeout=10000)
                    expect(page.locator("#jobs li").first).to_contain_text(
                        "One queued video request", timeout=10000
                    )
                    jobs = coordinator.recent(10)
                    assert len(jobs) == 1, jobs
                    assert jobs[0]["status"] == "queued" and jobs[0]["kind"] == "video", jobs[0]
                    assert not jobs[0]["output_path"], "Frontend must never claim AI generation"
                    print("PASS: browser creates a real queued task via token-protected local bridge")

                    # A wrong pairing code must not authorize browser actions.
                    bad = browser.new_page(viewport={"width": 390, "height": 844})
                    bad.goto(f"http://127.0.0.1:{WEB_PORT}/jarvix-connect.html", wait_until="load")
                    bad.locator("#lang").select_option("ru")
                    bad.locator("#token").fill("invalid-token")
                    bad.locator("#connect").click()
                    expect(bad.locator("#status")).to_contain_text("Не удалось подключиться", timeout=10000)
                    expect(bad.locator("#submit")).to_be_disabled()
                    assert len(coordinator.recent(10)) == 1
                    print("PASS: wrong pairing code rejected on mobile viewport")

                    # Verify translated mobile controls and download page.
                    bad.locator("#lang").select_option("fr")
                    expect(bad.locator("#submit")).to_have_text("Enregistrer la tâche")
                    page2 = browser.new_page(viewport={"width": 375, "height": 812})
                    response = page2.goto(
                        f"http://127.0.0.1:{WEB_PORT}/jarvix-download.html", wait_until="load"
                    )
                    assert response and response.status == 200
                    expect(page2.locator("#title")).to_contain_text("JARVIX", timeout=8000)
                    assert page2.locator("#windows").count() == 1
                    assert page2.locator("#macos").count() == 1
                    print("PASS: translated mobile UI and JARVIX download page")
                finally:
                    browser.close()
        finally:
            bridge.stop()
            server.shutdown()
            server.server_close()
            site_thread.join(timeout=5)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
