"""Download official product hero images into public/devices/ as WebP.

Sources are vendor CDNs and Logitech collaboration datasheets (see scripts/sources/).
Re-run after editing IMAGE_SOURCES below, then:

    python3 scripts/remove-backgrounds.py
    python3 scripts/prune-images.py

Usage:
    python3 scripts/import-product-images.py
    python3 scripts/import-product-images.py --only logitech-meetup,poly-studio-x52
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import ssl
import sys
import urllib.request
from pathlib import Path

from PIL import Image

MAX_W = 700
QUALITY = 82
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

# device_id -> source URL (official vendor assets)
IMAGE_SOURCES: dict[str, str] = {
    # Logitech — gallery where available; else use hashes from datasheet extract
    "logitech-meetup": (
        "https://resource.logitech.com/content/dam/logitech/en/products/"
        "video-conferencing/meetup/gallery/meetup-gallery-global-1.png"
    ),
    "logitech-zone-wired-2": (
        "https://resource.logitech.com/content/dam/logitech/en/products/"
        "headsets/zone-wired-2/gallery/"
        "b2b-zone-wired2-business-headset-graphite-gallery1.png"
    ),
    "logitech-zone-wireless-2": (
        "https://resource.logitech.com/content/dam/logitech/en/products/"
        "headsets/zone-wireless-2/gallery/zone-wireless-2-graphite-1.png"
    ),
    "logitech-zone-vibe-wireless": (
        "https://resource.logitech.com/content/dam/logitech/en/products/"
        "headsets/zone-vibe-wireless/gallery/"
        "zone-vibe-wireless-mic-down-graphite-1-new.png"
    ),
    "logitech-zone-true-wireless": (
        "https://resource.logitech.com/content/dam/logitech/en/products/"
        "video-conferencing/zone-true-wireless-earbuds/"
        "zone-true-wireless-earbuds-gallery-1-graphite.png"
    ),
    # Poly — HP worldwide DAM (also embedded on poly.com)
    "poly-studio-x30": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/video-conferencing/"
        "Poly_Studio_X32@2x.png"
    ),
    "poly-studio-x50": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/video-conferencing/"
        "Poly_Studio_V52_Desktop@2x.png"
    ),
    "poly-studio-x52": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/video-conferencing/"
        "Poly_Studio_X52@2x.png"
    ),
    "poly-studio-x70": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/video-conferencing/"
        "Poly_Studio_X72_Desktop@2x.png"
    ),
    "poly-studio-x72": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/video-conferencing/"
        "Poly_Studio_X72_Desktop@2x.png"
    ),
    "poly-studio-g62": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/video-conferencing/"
        "Poly_Studio_G62_Desktop@2x.jpg"
    ),
    "poly-studio-e70": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/video-conferencing/"
        "Poly_Studio_E70@2x.jpg"
    ),
    "poly-studio-p15": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/video-conferencing/"
        "Poly_Studio_R30_Desktop@2x.png"
    ),
    # Poly — phones & headsets (HP worldwide DAM)
    "poly-edge-b10": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/desk-phones/"
        "edge-b-series/Poly-Edge-B10-Desktop.png"
    ),
    "poly-edge-b20": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/desk-phones/"
        "edge-b-series/Poly-Edge-B20-Desktop.png"
    ),
    "poly-edge-b30": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/desk-phones/"
        "edge-b-series/Poly-Edge-B30-Desktop.png"
    ),
    "poly-ccx-400": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/phones/Poly_CCX_400_Card@2x.jpg"
    ),
    "poly-ccx-505": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/phones/Poly_ccx_505@2x.jpg"
    ),
    "poly-ccx-600": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/desk-phones/ccx-600/"
        "PolyCCX600_Desktop.png"
    ),
    "poly-ccx-700": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/desk-phones/CCX%20700@2x.png"
    ),
    "poly-trio-8300": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/phones/Poly_trio_8300@2x.jpg"
    ),
    "poly-trio-8500": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/phones/Poly_trio_8800@2x.jpg"
    ),
    "poly-trio-8800": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/phones/Poly_trio_8800@2x.jpg"
    ),
    "poly-blackwire-5200": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/headsets/"
        "Poly_blackwire_5200_series_desktop@2x.jpg"
    ),
    "poly-blackwire-8225": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/headsets/"
        "Poly_blackwire_8225_desktop@2x.jpg"
    ),
    "poly-voyager-4300": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/headsets/"
        "Poly_voyager_4300_uc_series@2x.jpg"
    ),
    "poly-voyager-5200": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/headsets/"
        "Poly_voyager_5200_series@2x.jpg"
    ),
    "poly-voyager-focus-2": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/headsets/"
        "Poly_voyager_focus_2_desktop@2x.jpg"
    ),
    "poly-savi-7310": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/headsets/"
        "Poly_savi_7300_uc_series_desktop@2x.jpg"
    ),
    "poly-encorepro-710": (
        "https://www.hp.com/content/dam/sites/worldwide/poly/headsets/"
        "Poly_encore_pro_700_series_desktop@2x.jpg"
    ),
    # Neat — product card art from cdn.neat.no (board-pro shared by 65"/75")
    "neat-bar": "https://cdn.neat.no/ndk/1.0/assets/img/card-product/bar-2--2x.jpg",
    "neat-bar-pro": "https://cdn.neat.no/ndk/1.0/assets/img/card-product/bar-pro--2x.jpg",
    "neat-board-50": "https://cdn.neat.no/ndk/1.0/assets/img/card-product/board-50--2x.jpg",
    "neat-board-65": "https://cdn.neat.no/ndk/1.0/assets/img/card-product/board-pro--2x.jpg",
    "neat-board-pro-75": "https://cdn.neat.no/ndk/1.0/assets/img/card-product/board-pro--2x.jpg",
    "neat-pad": "https://cdn.neat.no/ndk/1.0/assets/img/card-product/pad--2x.jpg",
    "neat-pad-pro": "https://cdn.neat.no/ndk/1.0/assets/img/card-product/pad-pro--2x.jpg",
    "neat-frame": "https://cdn.neat.no/ndk/1.0/assets/img/card-product/frame--2x.jpg",
    "neat-center": "https://cdn.neat.no/ndk/1.0/assets/img/card-product/center--2x.jpg",
}

# Logitech heroes extracted from official room-solution PDFs (scripts/sources/*.pdf)
LOGITECH_PDF_HASHES: dict[str, str] = {
    "logitech-rally-bar": "1c90cf84a7",
    "logitech-rally-bar-mini": "1c90cf84a7",
    "logitech-rally-plus": "abf2a6e02e",
    "logitech-rally-camera": "9ae771b7ff",
    "logitech-sight": "0236d2e6ab",
    "logitech-scribe": "617a472d34",
    "logitech-tap-ip": "3794871772",
    "logitech-tap-usb": "3794871772",
    "logitech-tap-scheduler": "3794871772",
}


def resize(img: Image.Image) -> Image.Image:
    w, h = img.size
    if w <= MAX_W:
        return img
    ratio = MAX_W / w
    return img.resize((MAX_W, int(h * ratio)), Image.LANCZOS)


def fetch(url: str, ctx: ssl.SSLContext) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
        return resp.read()


def save_webp(img: Image.Image, out_dir: Path) -> str:
    img = img.convert("RGBA") if img.mode in ("RGBA", "LA", "P") else img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    sha = hashlib.sha256(buf.getvalue()).hexdigest()[:10]
    out_path = out_dir / f"img-{sha}.webp"
    if not out_path.exists():
        small = resize(img)
        if small.mode == "RGBA":
            small.save(out_path, "WEBP", quality=QUALITY, method=6)
        else:
            small.save(out_path, "WEBP", quality=QUALITY, method=6)
    return sha


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--only",
        default=None,
        help="Comma-separated device ids to import from IMAGE_SOURCES",
    )
    args = parser.parse_args()

    here = Path(__file__).resolve().parent
    out_dir = here.parent / "public" / "devices"
    out_dir.mkdir(parents=True, exist_ok=True)
    ctx = ssl.create_default_context()

    only = None
    if args.only:
        only = {s.strip() for s in args.only.split(",") if s.strip()}

    mapping: dict[str, str] = {}
    errors: list[str] = []

    for device_id, url in IMAGE_SOURCES.items():
        if only is not None and device_id not in only:
            continue
        try:
            data = fetch(url, ctx)
            img = Image.open(io.BytesIO(data))
            sha = save_webp(img, out_dir)
            mapping[device_id] = sha
            print(f"  ok {device_id} -> img-{sha}.webp")
        except Exception as exc:
            errors.append(f"{device_id}: {exc}")
            print(f"  ! {device_id}: {exc}", file=sys.stderr)

    for device_id, sha in LOGITECH_PDF_HASHES.items():
        path = out_dir / f"img-{sha}.webp"
        if path.exists():
            mapping[device_id] = sha
        else:
            errors.append(f"{device_id}: missing img-{sha}.webp (run extract-pdf-images.py)")

    map_path = out_dir / "_import-map.json"
    map_path.write_text(json.dumps(mapping, indent=2, sort_keys=True))
    print(f"\nmapping written: {map_path.relative_to(Path.cwd())}")
    print(f"devices mapped: {len(mapping)}")

    if errors:
        print(f"errors: {len(errors)}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
