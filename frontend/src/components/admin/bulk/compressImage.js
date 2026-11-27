/**
 * Shrink photos in the browser before uploading.
 *
 * Phone photos are often 3–8 MB; the server stores products at 1000×1000 anyway,
 * so sending a 1600 px JPEG makes bulk uploads several times faster on mobile data
 * and keeps every file under the server's 5 MB limit. Camera rotation (EXIF) is
 * applied while decoding.
 */

export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

const MAX_SIDE = 1600;
const QUALITY = 0.86;
const SMALL_ENOUGH = 700 * 1024; // already-small JPEG/WebP files are sent as they are

export function isAcceptedPhoto(file) {
  if (ACCEPTED_PHOTO_TYPES.includes((file.type || '').toLowerCase())) return true;
  return /\.(jpe?g|png|webp)$/i.test(file.name || '');
}

export function isHeic(file) {
  return /heic|heif/i.test(file.type || '') || /\.(heic|heif)$/i.test(file.name || '');
}

async function decode(file, resizeWidth) {
  if (typeof createImageBitmap === 'function') {
    try {
      const opts = { imageOrientation: 'from-image' };
      if (resizeWidth) Object.assign(opts, { resizeWidth, resizeQuality: 'medium' });
      return await createImageBitmap(file, opts);
    } catch {
      /* fall through to <img> decoding */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process the photo.'))), type, quality);
  });
}

export async function compressImage(file) {
  const type = (file.type || '').toLowerCase();
  if ((type === 'image/jpeg' || type === 'image/webp') && file.size <= SMALL_ENOUGH) return file;

  const src = await decode(file);
  const w = src.width;
  const h = src.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  // Transparent PNGs: flatten onto white like the server does
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  src.close?.();
  const blob = await toBlob(canvas, 'image/jpeg', QUALITY);
  const name = `${(file.name || 'photo').replace(/\.[^.]+$/, '')}.jpg`;
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
}

/** Small preview image URL (revoke it with URL.revokeObjectURL when done). */
export async function makeThumbnail(file, size = 192) {
  try {
    const src = await decode(file, size * 2);
    const scale = size / Math.max(src.width, src.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(src.width * scale));
    canvas.height = Math.max(1, Math.round(src.height * scale));
    canvas.getContext('2d').drawImage(src, 0, 0, canvas.width, canvas.height);
    src.close?.();
    return URL.createObjectURL(await toBlob(canvas, 'image/jpeg', 0.8));
  } catch {
    return URL.createObjectURL(file);
  }
}
