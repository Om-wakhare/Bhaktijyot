from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from typing import Any, Optional

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from app.core.security import get_current_admin

log = logging.getLogger("app.instagram")

router = APIRouter(prefix="/instagram", tags=["instagram"])

IG_API = "https://graph.instagram.com/v21.0"
FIELDS = "id,media_type,thumbnail_url,media_url,permalink,caption,timestamp"

# Simple in-memory cache — one process, good enough for a storefront
_cache: dict[str, Any] = {"reels": None, "fetched_at": 0.0}


def _fetch_from_instagram() -> list[dict]:
    token = settings.INSTAGRAM_ACCESS_TOKEN
    if not token:
        raise HTTPException(
            status_code=503,
            detail="Instagram not configured. Set INSTAGRAM_ACCESS_TOKEN in .env",
        )

    url = (
        f"{IG_API}/me/media"
        f"?fields={FIELDS}"
        f"&limit=18"
        f"&access_token={token}"
    )

    try:
        with urllib.request.urlopen(url, timeout=8) as resp:
            raw = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        # Log the details server-side; never echo third-party responses to the public
        log.warning("Instagram API error %s: %s", e.code, e.read().decode(errors="replace")[:500])
        raise HTTPException(status_code=502, detail="Instagram is unavailable right now")
    except Exception as exc:
        log.warning("Could not reach Instagram: %s", exc)
        raise HTTPException(status_code=502, detail="Instagram is unavailable right now")

    items = raw.get("data", [])
    # Reels come through as VIDEO — keep only those, cap at 9
    reels = [
        {
            "id": m["id"],
            "thumbnail_url": m.get("thumbnail_url") or m.get("media_url"),
            "permalink": m["permalink"],
            "caption": (m.get("caption") or "")[:120],
            "timestamp": m.get("timestamp", ""),
        }
        for m in items
        if m.get("media_type") == "VIDEO"
    ][:9]

    return reels


@router.get("")
def get_reels():
    """
    Returns up to 9 of the client's latest Instagram reels.
    Results are cached for INSTAGRAM_CACHE_TTL seconds (default 30 min).
    """
    now = time.time()
    if _cache["reels"] is not None and (now - _cache["fetched_at"]) < settings.INSTAGRAM_CACHE_TTL:
        return {"reels": _cache["reels"], "cached": True}

    try:
        reels = _fetch_from_instagram()
    except HTTPException:
        # Instagram down or token expired: keep showing the last good reels if we have them
        if _cache["reels"] is not None:
            return {"reels": _cache["reels"], "cached": True, "stale": True}
        raise
    _cache["reels"] = reels
    _cache["fetched_at"] = now
    return {"reels": reels, "cached": False}


@router.post("/refresh-token")
def refresh_token(_: str = Depends(get_current_admin)):
    """
    Extends a long-lived Instagram token by another 60 days.
    Call this endpoint monthly from the admin panel or a cron job.
    """
    token = settings.INSTAGRAM_ACCESS_TOKEN
    if not token:
        raise HTTPException(status_code=503, detail="INSTAGRAM_ACCESS_TOKEN not set")

    url = (
        f"{IG_API}/refresh_access_token"
        f"?grant_type=ig_refresh_token"
        f"&access_token={token}"
    )
    try:
        with urllib.request.urlopen(url, timeout=8) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        log.warning("Instagram token refresh failed %s: %s", e.code, e.read().decode(errors="replace")[:500])
        raise HTTPException(status_code=502, detail="Instagram refused the token refresh. The token may have expired.")
    except Exception as exc:
        log.warning("Instagram token refresh error: %s", exc)
        raise HTTPException(status_code=502, detail="Could not reach Instagram to refresh the token.")

    return {
        "new_token": data.get("access_token"),
        "expires_in_seconds": data.get("expires_in"),
        "note": "Update INSTAGRAM_ACCESS_TOKEN in your .env with the new token above.",
    }
