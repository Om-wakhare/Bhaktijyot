"""Prepare uploaded product videos for the 360° viewer.

Phone videos are large and often HEVC (iPhone), which many browsers can't play,
and they have few keyframes, so dragging to "turn" the product jumps instead of
moving smoothly. When FFmpeg is available we convert every upload to a small
H.264 MP4: no sound, longest side 720 px, a keyframe every few frames (smooth
scrubbing), metadata at the front (starts playing quickly), plus a poster image.

FFmpeg comes from the `imageio-ffmpeg` package if installed, otherwise from the
system PATH. Without it, uploads are kept exactly as they were sent.
"""
from __future__ import annotations

import logging
import shutil
import subprocess
from pathlib import Path
from typing import Optional

log = logging.getLogger("app.video")

MAX_SECONDS = 30      # a turntable clip needs one turn; longer uploads are trimmed
LONGEST_SIDE = 720
KEYFRAME_EVERY = 6    # frames between keyframes: small = smooth dragging
TIMEOUT_SECONDS = 180


def ffmpeg_path() -> Optional[str]:
    try:
        import imageio_ffmpeg  # type: ignore

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:  # noqa: BLE001 — package missing or no binary for this platform
        return shutil.which("ffmpeg")


def _run(args: list[str]) -> bool:
    try:
        proc = subprocess.run(args, capture_output=True, timeout=TIMEOUT_SECONDS, check=False)
    except (OSError, subprocess.TimeoutExpired) as exc:
        log.warning("ffmpeg could not run: %s", exc)
        return False
    if proc.returncode != 0:
        log.warning("ffmpeg failed (%s): %s", proc.returncode, proc.stderr.decode(errors="replace")[-600:])
        return False
    return True


def optimize_video(src: Path, dst: Path, poster: Path) -> bool:
    """Convert `src` into a 360-viewer-friendly MP4 at `dst` and a JPEG poster.

    Returns False (leaving the caller to keep the original) when FFmpeg isn't
    available or the conversion fails.
    """
    exe = ffmpeg_path()
    if not exe:
        log.info("FFmpeg not available: keeping the uploaded video as it is")
        return False

    scale = (
        f"scale={LONGEST_SIDE}:{LONGEST_SIDE}:force_original_aspect_ratio=decrease"
        ":force_divisible_by=2,fps=30,format=yuv420p"
    )
    ok = _run([
        exe, "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(src),
        "-t", str(MAX_SECONDS),
        "-an",                                    # no sound (and no shop chatter)
        "-vf", scale,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-profile:v", "main",
        "-g", str(KEYFRAME_EVERY), "-keyint_min", str(KEYFRAME_EVERY), "-sc_threshold", "0",
        "-movflags", "+faststart",
        str(dst),
    ])
    if not ok or not dst.is_file() or dst.stat().st_size == 0:
        dst.unlink(missing_ok=True)
        return False

    # Poster: the first frame, shown while the video loads
    if not _run([exe, "-y", "-hide_banner", "-loglevel", "error", "-i", str(dst),
                 "-frames:v", "1", "-q:v", "4", str(poster)]):
        poster.unlink(missing_ok=True)
    return True
