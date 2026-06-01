"""Drop any extracted product image that isn't referenced from
src/data/deviceImages.ts. Run after editing the mapping."""

from __future__ import annotations

import re
from pathlib import Path


def main() -> None:
    here = Path(__file__).resolve().parent
    devices_dir = here.parent / "public" / "devices"
    mapping = (here.parent / "src" / "data" / "deviceImages.ts").read_text()

    referenced = {f"img-{m}.webp" for m in re.findall(r"img\('([0-9a-f]+)'\)", mapping)}
    print(f"referenced: {len(referenced)} images")

    removed = 0
    for f in devices_dir.glob("img-*.webp"):
        if f.name not in referenced:
            f.unlink()
            removed += 1
    print(f"removed: {removed} unreferenced images")
    print(f"kept:    {sum(1 for _ in devices_dir.glob('img-*.webp'))} files")


if __name__ == "__main__":
    main()
