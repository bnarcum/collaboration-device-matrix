"""Extract & dedupe product photos from the Cisco Collaboration Device
Product Matrix brochure into public/devices/.

Usage:
    python3 scripts/extract-pdf-images.py path/to/brochure.pdf

Writes:
    public/devices/img-<hash>.{webp}        deduped, optimized
    public/devices/_manifest.json           page -> [hash,...] mapping
"""

from __future__ import annotations

import hashlib
import io
import json
import os
import sys
from pathlib import Path

from PIL import Image, ImageChops
import pypdf


# Skip images whose decoded dimensions are obviously page chrome
MIN_W, MIN_H = 200, 150
# Cap final image width — billboards never need more
MAX_W = 700
# WebP quality
QUALITY = 82


def is_probably_chrome(img: Image.Image) -> bool:
    """Heuristic: page-chrome glyphs and footers are very wide-and-thin
    or very narrow-and-tall. Real product shots are roughly landscape."""
    w, h = img.size
    if w < MIN_W or h < MIN_H:
        return True
    aspect = w / h
    # Banners / lines are very stretched
    if aspect > 5 or aspect < 0.4:
        return True
    return False


def is_mostly_blank(img: Image.Image) -> bool:
    """Detect near-uniform images (e.g. a flat-colored background block)."""
    g = img.convert("L")
    diff = ImageChops.difference(g, Image.new("L", g.size, g.getpixel((0, 0))))
    bbox = diff.getbbox()
    if not bbox:
        return True
    bw, bh = bbox[2] - bbox[0], bbox[3] - bbox[1]
    return (bw * bh) < (g.size[0] * g.size[1] * 0.05)


def resize(img: Image.Image) -> Image.Image:
    w, h = img.size
    if w <= MAX_W:
        return img
    ratio = MAX_W / w
    return img.resize((MAX_W, int(h * ratio)), Image.LANCZOS)


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: extract-pdf-images.py <pdf>")
        return 2
    pdf_path = Path(sys.argv[1])
    out_dir = Path(__file__).resolve().parent.parent / "public" / "devices"
    out_dir.mkdir(parents=True, exist_ok=True)

    reader = pypdf.PdfReader(str(pdf_path))
    seen: dict[str, str] = {}            # sha -> filename
    manifest: dict[str, list[str]] = {}  # page (str) -> [sha,...]
    kept = 0
    skipped = 0

    for page_num, page in enumerate(reader.pages, 1):
        page_key = str(page_num)
        manifest.setdefault(page_key, [])
        for raw in page.images:
            try:
                img = Image.open(io.BytesIO(raw.data))
            except Exception:
                skipped += 1
                continue

            if is_probably_chrome(img) or is_mostly_blank(img):
                skipped += 1
                continue

            # Hash decoded pixels so PDF-level duplicates collapse even
            # when the underlying stream bytes differ slightly.
            img = img.convert("RGBA" if img.mode in ("RGBA", "LA", "P") else "RGB")
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            sha = hashlib.sha256(buf.getvalue()).hexdigest()[:10]

            if sha not in seen:
                out_path = out_dir / f"img-{sha}.webp"
                small = resize(img)
                # WebP supports both lossy + alpha
                if small.mode == "RGBA":
                    small.save(out_path, "WEBP", quality=QUALITY, method=6)
                else:
                    small.save(out_path, "WEBP", quality=QUALITY, method=6)
                seen[sha] = out_path.name
                kept += 1
            manifest[page_key].append(sha)

    manifest_path = out_dir / "_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))

    total_bytes = sum((out_dir / f).stat().st_size for f in seen.values())
    print(f"kept    {kept} unique images "
          f"({total_bytes / 1024:.0f} KB total)")
    print(f"skipped {skipped} (chrome / blank / unreadable)")
    print(f"manifest: {manifest_path.relative_to(Path.cwd())}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
