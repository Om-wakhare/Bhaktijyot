from __future__ import annotations

import uuid
from pathlib import Path
from pathlib import PurePosixPath
from typing import Any, Dict, Optional

from PIL import Image, ImageDraw, ImageFont

from app.core.config import settings


# Text layout (single coordinate system for all regular text lines)
# NOTE: The current background template is ~235px tall.
# So we keep Y values comfortably inside the white area.
TEXT_X = 60           # horizontal position for main text block
TEXT_START_Y = 120    # first regular line (inside white area)
LINE_HEIGHT = 30      # vertical distance between lines

# Special position for the "Report for" VALUE (single separate line near footer band)
REPORT_FOR_Y = 205    # Y for the value that appears after "Report for :"
REPORT_FOR_X = 150    # X so it appears to the right of the label on the template

# Product image placement (bottom‑right box)
PRODUCT_BOX_MARGIN_X = 60
PRODUCT_BOX_MARGIN_Y = 60
PRODUCT_BOX_WIDTH_RATIO = 0.25   # max width = 25% of background width
PRODUCT_BOX_HEIGHT_RATIO = 0.25  # max height = 25% of background height


def _load_font(size: int = 32) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    # Try some common fonts, fall back to default
    for font_name in ["arial.ttf", "DejaVuSans.ttf"]:
        try:
            return ImageFont.truetype(font_name, size)
        except Exception:
            continue
    return ImageFont.load_default()


def generate_certificate_image(
    background_path: Path,
    product_image_path: Optional[Path],
    certificate_data: Optional[Dict[str, Any]],
    free_text: Optional[str],
    certificate_code: Optional[str] = None,
) -> tuple[str, str]:
    """
    Generate a certificate image following strict rendering rules:
    - One coordinate system for all text
    - Fixed X, START_Y, LINE_HEIGHT
    - Structured fields first (values only, no labels), then free text
    - Skip empty fields / empty lines
    """
    background = Image.open(background_path).convert("RGBA")
    draw = ImageDraw.Draw(background)
    # Slightly smaller font so content fits template better
    font = _load_font(size=22)

    current_y = TEXT_START_Y

    # Helper to draw a single line and advance cursor
    def draw_line(text: str, nonlocal_current_y: int) -> int:
        text = text.strip()
        if not text:
            return nonlocal_current_y
        draw.text((TEXT_X, nonlocal_current_y), text, font=font, fill="black")
        return nonlocal_current_y + LINE_HEIGHT

    data: Dict[str, Any] = dict(certificate_data or {})

    if certificate_code is None:
        certificate_code = uuid.uuid4().hex[:10].upper()

    if not data.get("certificate_no"):
        data["certificate_no"] = certificate_code

    report_for_value = str(data.get("report_for") or "").strip()
    if report_for_value:
        draw.text((REPORT_FOR_X, REPORT_FOR_Y), report_for_value, font=font, fill="black")

    field_order: list[tuple[str, str]] = [
        ("certificate_no", "certificate no"),
        ("size", "size"),
        ("weight", "weight"),
        ("shape", "shape"),
        ("transparency", "transparency"),
        ("colour", "colour"),
        ("observation", "observation"),
    ]

    for key, label in field_order:
        value = data.get(key)
        value_str = "" if value is None else str(value).strip()
        current_y = draw_line(f"{label} :- {value_str}", current_y)

    # Free text after structured fields
    if free_text:
        for line in free_text.splitlines():
            line = line.strip()
            if not line:
                continue
            current_y = draw_line(line, current_y)

    # Optionally paste product image (does NOT affect text coordinates)
    if product_image_path is not None:
        try:
            product_img = Image.open(product_image_path).convert("RGBA")
            # Resize to fit a box in the bottom‑right corner
            max_w = int(background.size[0] * PRODUCT_BOX_WIDTH_RATIO)
            max_h = int(background.size[1] * PRODUCT_BOX_HEIGHT_RATIO)
            product_img.thumbnail((max_w, max_h))

            pos_x = background.size[0] - product_img.size[0] - PRODUCT_BOX_MARGIN_X
            pos_y = background.size[1] - product_img.size[1] - PRODUCT_BOX_MARGIN_Y
            background.alpha_composite(product_img, (pos_x, pos_y))
        except Exception:
            # If product image fails, we silently ignore to keep flow simple
            pass

    output_filename = f"{certificate_code}.png"
    output_path = settings.GENERATED_DIR / output_filename

    output_path.parent.mkdir(parents=True, exist_ok=True)
    background.convert("RGB").save(output_path, format="PNG")

    public_path = str(PurePosixPath("static") / "generated" / output_filename)
    return certificate_code, public_path

