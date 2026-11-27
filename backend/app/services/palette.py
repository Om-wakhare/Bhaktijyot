"""Dominant colours of a product photo, used to colour its 3D preview model.

Product photos are stored centred on a white square, usually shot on a plain
background. We estimate the background from the border pixels, ignore pixels
close to it, and quantise what is left (the product) to a few colours.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Optional

from PIL import Image as PilImage

log = logging.getLogger("app.palette")

_SAMPLE = 160          # analyse a small copy: fast and smooths out noise
_BG_DISTANCE = 42      # RGB distance from the background that counts as "product"
_MIN_PRODUCT_SHARE = 0.03


def _dist2(a, b) -> int:
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2


def extract_palette(img: PilImage.Image, max_colors: int = 5) -> List[str]:
    """Return up to `max_colors` hex colours, most common first."""
    im = img.convert("RGB")
    im.thumbnail((_SAMPLE, _SAMPLE))
    w, h = im.size
    if w < 2 or h < 2:
        return []
    px = im.load()

    border = (
        [px[x, 0] for x in range(w)] + [px[x, h - 1] for x in range(w)]
        + [px[0, y] for y in range(h)] + [px[w - 1, y] for y in range(h)]
    )
    bg = tuple(sorted(c[i] for c in border)[len(border) // 2] for i in range(3))

    pixels = list(im.getdata())
    limit = _BG_DISTANCE ** 2
    product = [c for c in pixels if _dist2(c, bg) > limit]
    if len(product) < _MIN_PRODUCT_SHARE * len(pixels):
        product = pixels  # product blends into the background; use everything

    strip = PilImage.new("RGB", (len(product), 1))
    strip.putdata(product)
    quant = strip.quantize(colors=max_colors, method=PilImage.Quantize.MEDIANCUT)
    palette = quant.getpalette() or []
    counts = sorted(quant.getcolors() or [], reverse=True)  # [(count, index), ...]
    out = []
    for _, idx in counts:
        r, g, b = palette[idx * 3: idx * 3 + 3]
        hex_ = f"#{r:02x}{g:02x}{b:02x}"
        if hex_ not in out:
            out.append(hex_)
    return out[:max_colors]


def palette_to_str(colors: List[str]) -> Optional[str]:
    return ",".join(colors) if colors else None


def palette_from_str(value: Optional[str]) -> Optional[List[str]]:
    if not value:
        return None
    return [c for c in value.split(",") if c.startswith("#") and len(c) == 7] or None


def palette_for_file(path: Path) -> Optional[str]:
    """Best-effort palette for an image on disk (used to backfill old images)."""
    try:
        with PilImage.open(path) as img:
            return palette_to_str(extract_palette(img))
    except Exception as exc:  # noqa: BLE001 — never block startup on one bad file
        log.warning("Could not read colours from %s: %s", path, exc)
        return None
