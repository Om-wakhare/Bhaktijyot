from __future__ import annotations

import uuid
from pathlib import Path, PurePosixPath
from typing import Any, Dict, Optional, Tuple

from PIL import Image, ImageDraw, ImageFont, ImageOps

from app.core.config import settings

# ---------------------------------------------------------------------------
# A4 canvas at 300 DPI
# ---------------------------------------------------------------------------
A4_PORTRAIT  = (2480, 3508)
A4_LANDSCAPE = (3508, 2480)


def _a4_dims(w: int, h: int) -> Tuple[int, int]:
    return A4_LANDSCAPE if w >= h else A4_PORTRAIT


# ---------------------------------------------------------------------------
# Design tokens
# ---------------------------------------------------------------------------
INK   : Tuple[int, int, int] = (38,  38,  38)   # all field values
GOLD  : Tuple[int, int, int] = (176, 138, 58)   # stone name

# Fixed pixel sizes calibrated for A4 @ 300 DPI
FS_FIELD   = 28    # every data field
FS_STONE   = 54    # stone name bold
FS_REMARK  = 24    # wrapped remark

# ---------------------------------------------------------------------------
# Portrait layout — normalized (x, y) anchors on the A4 canvas.
# x / y are the *horizontal-center / vertical-center* of the rendered text,
# not top-left corners, so every value sits perfectly on its printed line.
# ---------------------------------------------------------------------------
FIELD_COORDS: Dict[str, Tuple[float, float]] = {
    # Header row
    "certificate_no":   (0.165, 0.243),   # center-anchored
    "issue_date":       (0.742, 0.243),   # center-anchored
    # Stone name — large centered title
    "stone_name":       (0.500, 0.375),   # center-anchored, gold, 54 px
    # Left column
    "colour":           (0.315, 0.425),
    "shape":            (0.315, 0.472),
    "transparency":     (0.315, 0.519),
    "hardness":         (0.315, 0.566),
    "magnification":    (0.315, 0.613),
    "treatment":        (0.315, 0.660),
    # remark: rendered by draw_wrapped_text → skipped in main loop
    "on_behalf":        (0.315, 0.754),
    # Right column
    "weight":           (0.760, 0.425),
    "cut":              (0.760, 0.472),
    "ri":               (0.760, 0.519),
    "specific_gravity": (0.760, 0.566),
    "observation":      (0.760, 0.613),
    "origin":           (0.760, 0.660),
}

# Fields that use draw_centered() — their FIELD_COORDS x is the center-x
_CENTER_ANCHORED: frozenset[str] = frozenset({"certificate_no", "issue_date", "stone_name"})

# Fields with a dedicated renderer — excluded from the main coordinate loop
_SKIP_IN_LOOP: frozenset[str] = frozenset({"stone_name", "remark"})

# ---------------------------------------------------------------------------
# Absolute pixel rectangles on the A4 canvas (2480 × 3508)
# Tuple layout: (left, top, width, height)
# ---------------------------------------------------------------------------
PHOTO_RECT  : Tuple[int, int, int, int] = (186,  2869, 508,  544)
QR_RECT     : Tuple[int, int, int, int] = (1922, 2298, 360,  360)
REMARK_RECT : Tuple[int, int, int, int] = (620,  1185, 1180, 185)


# ---------------------------------------------------------------------------
# Font loader
# ---------------------------------------------------------------------------

def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        ["arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf"] if bold
        else ["arial.ttf", "Arial.ttf", "DejaVuSans.ttf"]
    )
    for name in candidates:
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            pass
    return ImageFont.load_default()


# ---------------------------------------------------------------------------
# Drawing primitives
# ---------------------------------------------------------------------------

def draw_field(
    draw: ImageDraw.ImageDraw,
    text: str,
    x: int,
    y: int,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    fill: Tuple[int, int, int],
    *,
    center_x: bool = False,
) -> None:
    """
    Render a single-line text value.

    y is treated as the vertical midpoint of the text so every value aligns
    with its printed label regardless of font metrics.
    If center_x is True, x is the horizontal midpoint instead of the left edge.
    """
    bb     = draw.textbbox((0, 0), text, font=font)
    text_w = bb[2] - bb[0]
    text_h = bb[3] - bb[1]

    draw_x = (x - text_w // 2) if center_x else x
    draw_y = y - text_h // 2

    draw.text((draw_x, draw_y), text, font=font, fill=fill)


def draw_centered(
    draw: ImageDraw.ImageDraw,
    text: str,
    cx: int,
    y: int,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    fill: Tuple[int, int, int],
) -> None:
    """Horizontally and vertically center text on the given anchor point."""
    draw_field(draw, text, x=cx, y=y, font=font, fill=fill, center_x=True)


def draw_wrapped_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    left: int,
    top: int,
    width: int,
    height: int,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    fill: Tuple[int, int, int],
) -> None:
    """
    Word-wrap *text* into the given pixel bounding box.
    Lines that would overflow the box height are silently dropped.
    """
    line_h = font.size + 6
    x, y   = left, top
    max_y  = top + height

    words, current = text.split(), ""
    lines: list[str] = []
    for word in words:
        probe = (current + " " + word).strip()
        bb    = draw.textbbox((0, 0), probe, font=font)
        if (bb[2] - bb[0]) > width and current:
            lines.append(current)
            current = word
        else:
            current = probe
    if current:
        lines.append(current)

    for line in lines:
        if y + line_h > max_y:
            break
        draw.text((x, y), line, font=font, fill=fill)
        y += line_h


# ---------------------------------------------------------------------------
# Image compositing helpers
# ---------------------------------------------------------------------------

def paste_product_image(canvas: Image.Image, src: Path) -> None:
    """
    Center-crop the gemstone photo to fill PHOTO_RECT exactly.
    Uses ImageOps.fit() so the image always covers the box without distortion.
    """
    left, top, w, h = PHOTO_RECT
    try:
        gem = Image.open(src).convert("RGBA")
        gem = ImageOps.fit(gem, (w, h), Image.Resampling.LANCZOS)
        canvas.alpha_composite(gem, (left, top))
    except Exception:
        pass


def paste_qr(canvas: Image.Image, src: Path) -> None:
    """Resize the QR code to fill QR_RECT and paste it centered in the box."""
    left, top, w, h = QR_RECT
    try:
        qr = Image.open(src).convert("RGBA")
        qr = qr.resize((w, h), Image.Resampling.LANCZOS)
        canvas.alpha_composite(qr, (left, top))
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Portrait renderer
# ---------------------------------------------------------------------------

def _render_portrait(
    bg: Image.Image,
    draw: ImageDraw.ImageDraw,
    data: Dict[str, Any],
    product_image_path: Optional[Path],
    W: int,
    H: int,
) -> None:
    f_field  = _font(FS_FIELD,  bold=False)
    f_stone  = _font(FS_STONE,  bold=True)
    f_remark = _font(FS_REMARK, bold=False)

    # ── Standard fields ────────────────────────────────────────────────────────
    for key, (xf, yf) in FIELD_COORDS.items():
        if key in _SKIP_IN_LOOP:
            continue

        val = str(data.get(key) or "").strip()
        if not val:
            continue

        if key in _CENTER_ANCHORED:
            draw_centered(draw, val, cx=int(W * xf), y=int(H * yf),
                          font=f_field, fill=INK)
        else:
            draw_field(draw, val, x=int(W * xf), y=int(H * yf),
                       font=f_field, fill=INK)

    # ── Stone name — large centered title in gold ──────────────────────────────
    stone = str(data.get("stone_name") or "").strip()
    if stone:
        xf, yf = FIELD_COORDS["stone_name"]
        draw_centered(draw, stone, cx=int(W * xf), y=int(H * yf),
                      font=f_stone, fill=GOLD)

    # ── Remark — word-wrapped inside its dedicated box ─────────────────────────
    remark = str(data.get("remark") or "").strip()
    if remark:
        rl, rt, rw, rh = REMARK_RECT
        draw_wrapped_text(draw, remark, rl, rt, rw, rh, f_remark, INK)

    # ── Gemstone photo — center-crop fill ─────────────────────────────────────
    if product_image_path:
        paste_product_image(bg, product_image_path)

    # ── QR code — pass path via certificate_data["qr_image_path"] ─────────────
    qr_raw = data.get("qr_image_path")
    if qr_raw:
        paste_qr(bg, Path(str(qr_raw)))


# ---------------------------------------------------------------------------
# Landscape renderer — legacy purple-header template (kept for compat.)
# ---------------------------------------------------------------------------

L_DATA_TOP  = 0.335
L_LABEL_X   = 0.040
L_SEP_X     = 0.230
L_VALUE_X   = 0.255
L_ROW_PITCH = 0.057
L_FREE_GAP  = 0.028
L_IMG_LEFT  = 0.640
L_IMG_TOP   = 0.330
L_IMG_SIZE  = 0.290
L_RF_X      = 0.190
L_RF_Y      = 0.855

L_FIELDS = [
    ("certificate_no", "Certificate No."),
    ("stone_name",     "Stone"),
    ("size",           "Size"),
    ("weight",         "Weight"),
    ("shape",          "Shape"),
    ("transparency",   "Transparency"),
    ("colour",         "Colour"),
    ("observation",    "Observation"),
]


def _render_landscape(
    bg: Image.Image,
    draw: ImageDraw.ImageDraw,
    data: Dict[str, Any],
    product_image_path: Optional[Path],
    free_text: Optional[str],
    W: int,
    H: int,
) -> None:
    font_px = max(14, int(H * 0.016))
    f_reg   = _font(font_px, bold=False)
    f_bold  = _font(font_px, bold=True)

    pitch = max(20, int(H * L_ROW_PITCH))
    lx    = int(W * L_LABEL_X)
    sx    = int(W * L_SEP_X)
    vx    = int(W * L_VALUE_X)
    row_y = int(H * L_DATA_TOP)

    for key, label in L_FIELDS:
        val = str(data.get(key) or "").strip()
        if not val:
            continue
        draw.text((lx, row_y), label, font=f_bold, fill="black")
        draw.text((sx, row_y), ":",   font=f_bold, fill="black")
        draw.text((vx, row_y), val,   font=f_reg,  fill="black")
        row_y += pitch

    if free_text and free_text.strip():
        row_y += int(H * L_FREE_GAP)
        for line in free_text.splitlines():
            line = line.strip()
            if not line:
                row_y += pitch // 2
                continue
            draw.text((lx, row_y), line, font=f_reg, fill="black")
            row_y += pitch

    rf_val = str(data.get("report_for") or "").strip()
    if rf_val:
        draw.text((int(W * L_RF_X), int(H * L_RF_Y)), rf_val, font=f_bold, fill="black")

    if product_image_path:
        try:
            gem     = Image.open(product_image_path).convert("RGBA")
            gw, gh  = gem.size
            side    = min(gw, gh)
            gem     = gem.crop(((gw - side) // 2, (gh - side) // 2,
                                (gw + side) // 2, (gh + side) // 2))
            px_side = int(W * L_IMG_SIZE)
            gem     = gem.resize((px_side, px_side), Image.LANCZOS)
            bg.alpha_composite(gem, (int(W * L_IMG_LEFT), int(H * L_IMG_TOP)))
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Public API — signature intentionally unchanged
# ---------------------------------------------------------------------------

def generate_certificate_image(
    background_path: Path,
    product_image_path: Optional[Path],
    certificate_data: Optional[Dict[str, Any]],
    free_text: Optional[str],
    certificate_code: Optional[str] = None,
) -> tuple[str, str]:
    """
    Composite certificate data onto the template and save PNG + PDF.

    Portrait (H > W)  → coordinate-driven renderer with fixed font sizes.
    Landscape (W >= H) → legacy label+value renderer.

    The canvas is normalised to A4 @ 300 DPI before rendering.
    Returns (certificate_code, public_png_relative_path).
    """
    bg = Image.open(background_path).convert("RGBA")

    a4_w, a4_h = _a4_dims(*bg.size)
    if bg.size != (a4_w, a4_h):
        bg = bg.resize((a4_w, a4_h), Image.LANCZOS)

    W, H = bg.size
    draw = ImageDraw.Draw(bg)

    data: Dict[str, Any] = dict(certificate_data or {})
    if certificate_code is None:
        certificate_code = uuid.uuid4().hex[:10].upper()
    if not data.get("certificate_no"):
        data["certificate_no"] = certificate_code

    if H > W:
        _render_portrait(bg, draw, data, product_image_path, W, H)
    else:
        _render_landscape(bg, draw, data, product_image_path, free_text, W, H)

    out_dir = settings.GENERATED_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    png_path = out_dir / f"{certificate_code}.png"
    pdf_path = out_dir / f"{certificate_code}.pdf"

    cert_rgb = bg.convert("RGB")
    cert_rgb.save(png_path, format="PNG")
    cert_rgb.save(pdf_path, format="PDF", resolution=300)

    public_png = str(PurePosixPath("static") / "generated" / f"{certificate_code}.png")
    return certificate_code, public_png
