/**
 * Match dropped photo files to spreadsheet rows.
 *
 * Priority for each photo:
 *   1. Listed by file name in the row's "photos" column
 *   2. Sits in a folder named after the product        (Rose Quartz Bracelet/1.jpg)
 *   3. File name is the product name (+ optional number) (Rose Quartz Bracelet 2.jpg,
 *      rose-quartz-bracelet_3.png, Rose Quartz Bracelet (4).jpeg)
 * Within a product, listed photos keep the listed order; the rest sort naturally
 * (2 before 10). The first photo becomes the main photo.
 */

export const MAX_PHOTOS_PER_PRODUCT = 4;

const stripExt = (name) => String(name || '').replace(/\.[a-z0-9]{2,5}$/i, '');

/** "Rose-Quartz_Bracelet (2).JPG" → "rose quartz bracelet 2" */
export function normalizeKey(text) {
  return stripExt(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Drop a trailing photo number: "rose quartz bracelet 2" → "rose quartz bracelet" */
const stripIndex = (key) => key.replace(/\s+\d{1,3}$/, '');

export const naturalCompare = (a, b) =>
  String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });

/** Folder a file came from (folder picker / drag-and-drop of a folder), if any */
export function folderOf(file, relPath) {
  const p = relPath || file.webkitRelativePath || '';
  const parts = p.split('/').filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 2] : '';
}

function rowKeys(row) {
  const keys = new Set();
  if (row.name) keys.add(normalizeKey(row.name));
  if (row.slug) {
    keys.add(normalizeKey(row.slug));
    keys.add(normalizeKey(row.slug.replace(/-\d+$/, ''))); // de-duplicated slugs end in -2, -3…
  }
  keys.delete('');
  return keys;
}

/**
 * rows   parsed rows without errors: { row, name, slug, photos: [fileName] }
 * photos [{ id, name, folder }]
 * Returns { assign: { [row]: [photoId] }, unmatched: [photoId] }
 */
export function matchPhotos(rows, photos) {
  const assign = {};
  const used = new Set();
  rows.forEach((r) => { assign[r.row] = []; });

  // 1. Explicit file names, in the listed order
  const byBase = new Map();
  photos.forEach((p) => {
    const k = normalizeKey(p.name);
    if (!byBase.has(k)) byBase.set(k, []);
    byBase.get(k).push(p);
  });
  rows.forEach((r) => {
    (r.photos || []).forEach((listed) => {
      const hit = (byBase.get(normalizeKey(listed)) || []).find((p) => !used.has(p.id));
      if (hit) { assign[r.row].push(hit.id); used.add(hit.id); }
    });
  });

  // 2 + 3. Folder name, then file name (exact, then without a trailing number)
  const keyed = rows.map((r) => ({ row: r.row, keys: rowKeys(r) }));
  const findRow = (key) => (key ? keyed.find((k) => k.keys.has(key)) : undefined);
  const rest = photos.filter((p) => !used.has(p.id)).sort((a, b) => naturalCompare(a.name, b.name));
  const unmatched = [];
  rest.forEach((p) => {
    const base = normalizeKey(p.name);
    const hit = findRow(normalizeKey(p.folder)) || findRow(base) || findRow(stripIndex(base));
    if (hit) { assign[hit.row].push(p.id); used.add(p.id); } else unmatched.push(p.id);
  });

  return { assign, unmatched };
}

/** Matches newly added photos only, leaving the owner's earlier choices alone. */
export function matchNewPhotos(rows, newPhotos, current) {
  const { assign, unmatched } = matchPhotos(rows, newPhotos);
  const merged = { ...current.assign };
  Object.entries(assign).forEach(([row, ids]) => {
    merged[row] = [...(merged[row] || []), ...ids];
  });
  return { assign: merged, unmatched: [...current.unmatched, ...unmatched] };
}

/**
 * One 360° video per product, matched with the same rules as photos; an exact
 * file name can be given in the row's "video" column. Extra videos for a
 * product that already has one are left unmatched for the owner to place.
 * Returns { videoOf: { [row]: videoId }, unmatched: [videoId] }.
 */
export function matchVideos(rows, videos, current = { videoOf: {}, unmatched: [] }) {
  const asPhotos = rows.map((r) => ({ ...r, photos: r.video ? [r.video] : [] }));
  const { assign, unmatched } = matchPhotos(asPhotos, videos);
  const videoOf = { ...current.videoOf };
  const extra = [...current.unmatched, ...unmatched];
  Object.entries(assign).forEach(([row, ids]) => {
    ids.forEach((id) => {
      if (videoOf[row] == null) videoOf[row] = id;
      else extra.push(id);
    });
  });
  return { videoOf, unmatched: extra };
}
