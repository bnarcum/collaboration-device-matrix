#!/usr/bin/env python3
"""Fetch the upstream Cisco Collaboration Device Product Matrix brochure.

The brochure is the source of truth for `src/data/cisco.ts`. We never commit
it to the repo (see .gitignore). This script just re-downloads it on demand.

Usage:
    python3 scripts/fetch-pdf.py [--force]
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

PDF_URL = (
    "https://www.webex.com/content/dam/wbx/us/documents/pdf/"
    "Collaboration_Device_Product_Matrix_Brochure.pdf"
)
DEST = Path(__file__).resolve().parent / "cisco_matrix.pdf"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download even if the file already exists.",
    )
    args = parser.parse_args()

    if DEST.exists() and not args.force:
        size_kb = DEST.stat().st_size // 1024
        print(f"[skip] {DEST} already exists ({size_kb} KB). Use --force to redownload.")
        return 0

    print(f"[fetch] {PDF_URL}")
    DEST.parent.mkdir(parents=True, exist_ok=True)

    # webex.com sits behind Akamai Bot Manager which does TLS fingerprint
    # checks. Python's ssl module fingerprint is rejected even with a
    # browser-like User-Agent + Referer, but curl's fingerprint is allowed.
    # Try urllib first (handy in environments without curl); fall back to
    # curl with browser-style headers.
    browser_headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": (
            "application/pdf,application/xhtml+xml,application/xml;"
            "q=0.9,*/*;q=0.8"
        ),
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.webex.com/devices.html",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Upgrade-Insecure-Requests": "1",
    }

    data: bytes | None = None
    try:
        req = urllib.request.Request(PDF_URL, headers=browser_headers)
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
        print("[ok] fetched via urllib")
    except Exception as exc:
        print(f"[warn] urllib fetch failed ({exc}); trying curl")

    if data is None:
        curl = shutil.which("curl")
        if not curl:
            print(
                "[error] urllib failed and curl is not installed",
                file=sys.stderr,
            )
            return 1
        cmd = [curl, "--fail", "--silent", "--show-error", "--compressed", "-L"]
        for key, value in browser_headers.items():
            cmd += ["-H", f"{key}: {value}"]
        cmd += ["-o", str(DEST), PDF_URL]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(
                f"[error] curl fetch failed ({result.returncode}): "
                f"{result.stderr.strip()}",
                file=sys.stderr,
            )
            return 1
        size = DEST.stat().st_size
        if size < 100_000:
            head = DEST.read_bytes()[:200]
            print(
                f"[error] curl downloaded only {size} bytes; "
                f"head={head!r}",
                file=sys.stderr,
            )
            return 1
        print(f"[ok] wrote {size // 1024} KB to {DEST} via curl")
        return 0

    DEST.write_bytes(data)
    print(f"[ok] wrote {len(data) // 1024} KB to {DEST}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
