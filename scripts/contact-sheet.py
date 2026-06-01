"""Build a contact-sheet PNG of all extracted images with their hash IDs
labeled, so a human (or coding agent) can quickly map them to devices.
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


THUMB_W, THUMB_H = 260, 170
PAD = 12
COLS = 4
LABEL_H = 30
ROWS_PER_SHEET = 7  # split big sheet into multiple readable pages


def main() -> None:
    here = Path(__file__).resolve().parent
    devices_dir = here.parent / "public" / "devices"
    manifest = json.loads((devices_dir / "_manifest.json").read_text())

    # Build (sha, first_page_used)
    first_page: dict[str, int] = {}
    for page_str, shas in manifest.items():
        for sha in shas:
            first_page.setdefault(sha, int(page_str))

    files = sorted(
        devices_dir.glob("img-*.webp"),
        key=lambda f: first_page.get(f.stem.replace("img-", ""), 0),
    )
    n = len(files)

    try:
        font = ImageFont.truetype(
            "/System/Library/Fonts/Supplemental/Arial.ttf", 16
        )
    except Exception:
        font = ImageFont.load_default()

    cell_w = THUMB_W + PAD
    cell_h = THUMB_H + LABEL_H + PAD
    per_sheet = ROWS_PER_SHEET * COLS

    sheet_idx = 0
    for start in range(0, n, per_sheet):
        chunk = files[start:start + per_sheet]
        rows = (len(chunk) + COLS - 1) // COLS
        sheet_w = cell_w * COLS + PAD
        sheet_h = cell_h * rows + PAD

        sheet = Image.new("RGB", (sheet_w, sheet_h), "#0a1220")
        draw = ImageDraw.Draw(sheet)

        for i, f in enumerate(chunk):
            col, row = i % COLS, i // COLS
            x = PAD + col * cell_w
            y = PAD + row * cell_h

            img = Image.open(f).convert("RGB")
            img.thumbnail((THUMB_W, THUMB_H), Image.LANCZOS)
            tx = x + (THUMB_W - img.size[0]) // 2
            ty = y + (THUMB_H - img.size[1]) // 2

            draw.rectangle(
                [x, y, x + THUMB_W, y + THUMB_H],
                fill="#ffffff",
                outline="#1e2a3c",
            )
            sheet.paste(img, (tx, ty))

            sha = f.stem.replace("img-", "")
            page = first_page.get(sha, 0)
            label = f"p{page:02d}  {sha}"
            draw.text(
                (x + 4, y + THUMB_H + 6),
                label,
                fill="#c4d6ed",
                font=font,
            )

        sheet_idx += 1
        out = here.parent / f"contact-sheet-{sheet_idx}.png"
        sheet.save(out)
        print(
            f"wrote {out.name} ({sheet_w}x{sheet_h}, "
            f"{len(chunk)} images)"
        )


if __name__ == "__main__":
    main()
