#!/usr/bin/env python3
"""Live Cloudflare test-page -> local desktop bridge in a real Chromium browser.

This runs against the real deployed TEST page and a disposable loopback SQLite
coordinator. It never calls site APIs or AI model providers. Never production.
It intentionally does NOT disable Chromium private-network security.
"""
from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import sys

from jarvis_new.coordinator import Coordinator
from jarvis_new.local_bridge import LocalBridge, ALLOWED_ORIGIN

TEST_PAGE = ALLOWED_ORIGIN + "/jarvix-connect.html"


def main() -> int:
    from playwright.sync_api import sync_playwright, expect
    with TemporaryDirectory(prefix="jarvix-remote-browser-") as temp:
        coordinator = Coordinator(Path(temp) / "tasks.sqlite", owner="remote-preview-ci")
        bridge = LocalBridge(coordinator, port=8768)
        bridge.start()
        try:
            with sync_playwright() as pw:
                browser = pw.chromium.launch(headless=True)
                try:
                    context = browser.new_context(viewport={"width": 390, "height": 844})
                    page = context.new_page()
                    # Playwright 1.58's string mapping does NOT yet handle the
                    # split Chrome 145 granular 'loopback-network' permission.
                    # CDP exposes the official 'loopbackNetwork' PermissionType.
                    # Simulate the test user's explicit Allow choice, not a
                    # disabled security feature or a fabricated certificate.
                    cdp = context.new_cdp_session(page)
                    cdp.send("Browser.grantPermissions", {
                        "origin": ALLOWED_ORIGIN,
                        "permissions": ["loopbackNetwork"],
                    })
                    print("Chrome loopback-network access explicitly granted for isolated test origin.")
                    response = page.goto(TEST_PAGE, wait_until="domcontentloaded", timeout=30000)
                    if response is None or response.status != 200:
                        raise RuntimeError("Real deployed Cloudflare JARVIX test page unavailable")
                    page.locator("#lang").select_option("ru")
                    page.locator("#token").fill(bridge.token)
                    page.locator("#connect").click()
                    try:
                        expect(page.locator("#status")).to_contain_text(
                            "Соединение подтверждено", timeout=9000
                        )
                    except AssertionError:
                        print("LIVE PREVIEW BLOCKER: Chrome could not reach loopback.")
                        print("This may require real user local-network consent on Chrome.")
                        print("Status shown:", page.locator("#status").inner_text())
                        print("Do not disable browser safety protections to pass this test.")
                        raise
                    page.locator("#kind").select_option("image")
                    page.locator("#prompt").fill("Cloudflare test site sends one queued image job")
                    page.locator("#submit").click()
                    expect(page.locator("#status")).to_contain_text("Задание записано", timeout=10000)
                    jobs = coordinator.recent(10)
                    assert len(jobs) == 1 and jobs[0]["status"] == "queued", jobs
                    assert jobs[0]["prompt"] == "Cloudflare test site sends one queued image job"
                    print("PASS: Real Cloudflare preview -> Chromium -> localhost protected bridge -> SQLite")
                finally:
                    browser.close()
        finally:
            bridge.stop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
