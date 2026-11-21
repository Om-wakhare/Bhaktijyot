"""Shared input validation / normalisation helpers (Indian e-commerce context)."""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Optional

# India Standard Time (no DST) — used for "today"/"this month" business reporting
IST = timezone(timedelta(hours=5, minutes=30), name="IST")

_MOBILE_RE = re.compile(r"^[6-9]\d{9}$")
_PINCODE_RE = re.compile(r"^[1-9]\d{5}$")
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def utcnow() -> datetime:
    """Timezone-aware UTC now — always store aware datetimes in timestamptz columns."""
    return datetime.now(timezone.utc)


def normalize_indian_mobile(value: str) -> str:
    """Return the 10-digit mobile number, accepting +91 / 91 / 0 prefixes and spaces.

    Raises ValueError with a user-facing message when invalid.
    """
    digits = re.sub(r"\D", "", value or "")
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if not _MOBILE_RE.match(digits):
        raise ValueError("Enter a valid 10-digit Indian mobile number")
    return digits


def phones_match(stored: Optional[str], given: Optional[str]) -> bool:
    """Compare two phone numbers after normalisation (falls back to raw compare
    for legacy rows saved before validation existed)."""
    if not stored or not given:
        return False
    try:
        return normalize_indian_mobile(stored) == normalize_indian_mobile(given)
    except ValueError:
        return re.sub(r"\D", "", stored) == re.sub(r"\D", "", given) != ""


def validate_pincode(value: str) -> str:
    v = (value or "").strip()
    if not _PINCODE_RE.match(v):
        raise ValueError("Enter a valid 6-digit pincode")
    return v


def validate_email_optional(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    v = value.strip()
    if not v:
        return None
    if len(v) > 255 or not _EMAIL_RE.match(v):
        raise ValueError("Enter a valid email address")
    return v


def strip_required(value: str, field: str, max_len: int) -> str:
    v = (value or "").strip()
    if not v:
        raise ValueError(f"{field} is required")
    if len(v) > max_len:
        raise ValueError(f"{field} must be at most {max_len} characters")
    return v


# Same rule products have always used — kept permissive so existing slugs stay valid.
SLUG_RE = re.compile(r"^[a-z0-9-]+$")


def validate_slug(value: str) -> str:
    v = (value or "").strip()
    if not v or not SLUG_RE.match(v):
        raise ValueError(
            "Slug must contain only lowercase letters, digits and hyphens (e.g. 'rose-quartz-bracelet')"
        )
    if len(v) > 255:
        raise ValueError("Slug must be at most 255 characters")
    return v


def like_pattern(term: str) -> str:
    """Escape LIKE wildcards in user input; use with .ilike(pattern, escape='\\\\')."""
    escaped = term.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"
