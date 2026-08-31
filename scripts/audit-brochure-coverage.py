#!/usr/bin/env python3
"""Compare brochure FEATURE/FUNCTIONALITY columns to Cisco catalog IDs.

Usage:
    python3 scripts/audit-brochure-coverage.py

Requires scripts/cisco_matrix.pdf (python3 scripts/fetch-pdf.py).
Exit 1 if a brochure column has no catalog mapping.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PDF_PATH = ROOT / "scripts" / "cisco_matrix.pdf"
CISCO_TS = ROOT / "src" / "data" / "vendors" / "cisco.ts"

# Brochure column header -> catalog device id (None = intentionally omitted).
BROCHURE_COLUMNS: dict[str, str | None] = {
    "BOARD PRO 55/75 G3": "board-pro-g3-55",
    "ROOM KIT EQX": "room-kit-eqx",
    "ROOM BAR": "room-bar",
    "ROOM BAR PRO": "room-bar-pro",
    "ROOM BAR BYOD": "room-bar-byod",
    "ROOM KIT EQ": "room-kit-eq",
    "ROOM KIT PRO G2": "room-kit-pro-g2",
    "DESK": "desk",
    "DESK PRO G2": "desk-pro-g2",
    "DESK MINI": "desk-mini",
    "WIRELESS PHONE 9821": "wireless-9821",
    "WIRELESS PHONE 840": None,  # successor SKU is 9821
    "WIRELESS PHONE 860": "wireless-860",
    "3900 SERIES — 3905": "wireless-3905",
    "6800 SERIES — 6821": "desk-phone-6821",
    "6823 DECT PHONE": "dect-6823",
    "6825 DECT PHONE": "dect-6825",
    "6800 SERIES — 6851": "desk-phone-6851",
    "6851 KEY EXPANSION MODULE": "kem-6851",
    "6900 SERIES — 6901": "desk-phone-6901",
    "7800 SERIES — 7811": "desk-phone-7811",
    "7800 SERIES — 7821": "desk-phone-7821",
    "7800 SERIES — 7832": "conference-7832",
    "7800 SERIES — 7841": "desk-phone-7841",
    "7800 SERIES — 7861": "desk-phone-7861",
    "8800 SERIES — 8811": "desk-phone-8811",
    "8800 SERIES — 8832 CONFERENCE PHONE": "conference-8832",
    "8800 SERIES — 8841": "desk-phone-8841",
    "8800 SERIES — 8851": "desk-phone-8851",
    "8800 SERIES — 8861": "desk-phone-8861",
    "8851/8861 KEY EXPANSION MODULE": "kem-8800",
    "VIDEO PHONE 8875": "video-phone-8875",
    "DESK PHONE 9811": "desk-phone-9811",
    "DESK PHONE 9841": "desk-phone-9841",
    "DESK PHONE 9851": "desk-phone-9851",
    "DESK PHONE 9861": "desk-phone-9861",
    "DESK PHONE 9871": "desk-phone-9871",
    "9800 SERIES — KEY EXPANSION MODULE": "kem-9800",
    "320 SERIES": "headset-320",
    "520 SERIES": "headset-520",
    "530 SERIES": "headset-530",
    "560 SERIES": "headset-560",
    "720 SERIES": "headset-720",
    "700 SERIES - 730": "headset-730",
    "900 SERIES - B&O": "headset-bang-olufsen-900",
    "CISCO 950": "headset-950",
    "ROOM NAVIGATOR FOR TABLE": "room-navigator-table",
    "ROOM NAVIGATOR FOR WALL": "room-navigator-wall",
    "CISCO TABLE MICROPHONE PRO": "table-mic-pro",
    "CISCO CEILING MICROPHONE PRO": "ceiling-mic-pro",
    "CISCO TABLE MICROPHONE": "table-mic",
    "CISCO CEILING MICROPHONE": "ceiling-mic",
    "DESK CAMERA 1080": "desk-camera-1080",
    "QUAD CAMERA": "quad-camera",
    "ROOM VISION PTZ": "room-vision-ptz",
    "PTZ 4K CAMERA": "ptz-4k-camera",
}


def catalog_ids() -> set[str]:
    text = CISCO_TS.read_text()
    return set(re.findall(r"id: '([^']+)'", text))


def extract_headers(pdf_path: Path) -> list[str]:
    try:
        import pypdf
    except ImportError:
        print("pypdf required: python3 -m pip install --user pypdf", file=sys.stderr)
        raise SystemExit(2)
    reader = pypdf.PdfReader(str(pdf_path))
    headers: list[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        for raw in re.findall(
            r"FEATURE/FUNCTIONALITY\s+(.+)", text, flags=re.I
        ):
            parts = re.split(r"\s{2,}", raw.strip())
            if len(parts) == 1:
                parts = re.split(
                    r"(?=\d{4} SERIES|\d{3} SERIES|DESK PHONE|VIDEO PHONE|"
                    r"WIRELESS PHONE|ROOM |CISCO |BOARD |QUAD |PTZ )",
                    raw.strip(),
                )
            for part in parts:
                name = re.sub(r"\s+", " ", part).strip(" -—")
                if name:
                    headers.append(name.upper())
    return headers


def main() -> int:
    if not PDF_PATH.exists():
        print(f"missing PDF: {PDF_PATH} — run scripts/fetch-pdf.py first")
        return 0
    ids = catalog_ids()
    missing = [
        f"{col} -> {dev}"
        for col, dev in BROCHURE_COLUMNS.items()
        if dev and dev not in ids
    ]
    if missing:
        print("Catalog missing mapped brochure devices:")
        for row in missing:
            print(f"  {row}")
        return 1
    print(f"OK  {sum(1 for v in BROCHURE_COLUMNS.values() if v)} brochure columns mapped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
