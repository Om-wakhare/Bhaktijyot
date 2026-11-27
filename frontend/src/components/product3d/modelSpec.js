/**
 * Decides which 3D preview a product gets and what it looks like.
 *
 * Pure data, no three.js: safe to import from the product page, admin forms and
 * the bulk upload screen without pulling the 3D bundle into those pages.
 *
 *   resolveModel(product) -> { type, look, source } | { type: 'none' }
 *
 * type    bracelet | mala | gemstone | crystal | raw | none
 * look    how the material is coloured (stone preset key, faceted gem colour,
 *         or colours taken from the product's main photo)
 * source  'override' (admin picked the shape) | 'name' | 'category'
 */

export const MODEL_TYPES = ['auto', 'bracelet', 'mala', 'gemstone', 'crystal', 'raw', 'none'];

export const MODEL_LABELS = {
  auto: 'Automatic (from the product name)',
  bracelet: 'Bead bracelet',
  mala: 'Mala (prayer beads)',
  gemstone: 'Cut gemstone',
  crystal: 'Crystal point / tower',
  raw: 'Raw stone',
  none: 'No 3D view',
};

// Order matters: a "sapphire bracelet" is a bracelet, a "raw emerald" is a raw stone.
const SHAPE_RULES = [
  ['mala', /\b(mala|maala|jaap|japa|rosary)\b/i],
  ['bracelet', /\b(bracelets?|wristband)\b/i],
  ['crystal', /\b(tower|point|wand|obelisk|generator)\b/i],
  ['raw', /\b(raw|rough|cluster|chunk|geode|tumbled?)\b/i],
  ['gemstone', /\b(ratti|carats?|ct|sapphire|neelam|pukhraj|emerald|panna|ruby|manik|manikya|gomed|hessonite|cat'?s[\s-]?eye|lehsunia|opal|diamond|heera|hira|coral|moonga|pearl|moti|garnet|topaz|turquoise|firoza|gemstones?|ratna)\b/i],
];

/* Bead / crystal stone presets that exist in bracelet3d/stones.js */
const STONE_RULES = [
  ['amethyst', /amethyst|jamunia/i],
  ['roseQuartz', /rose\s*quartz/i],
  ['citrine', /citrine|sunela/i],
  ['clearQuartz', /clear\s*quartz|crystal\s*quartz|sphatik|sphatic|spatik/i],
  ['tigerEye', /tiger'?s?\s*eye/i],
  ['blackObsidian', /obsidian|black\s*tourmaline|tourmaline|onyx|hakik.*black|black\s*agate/i],
  ['greenAventurine', /aventurine|jade|green\s*agate/i],
  ['rudraksha', /rudraksh/i],
];

/* Faceted / cabochon gemstone colours (body colour used for transmission + tint) */
const GEM_RULES = [
  [/yellow\s*sapphire|pukhraj|pukraj/i, { color: '#F2C230', ior: 1.77 }],
  [/blue\s*sapphire|neelam|nilam/i, { color: '#2350B8', ior: 1.77 }],
  [/emerald|panna/i, { color: '#1E9E5A', ior: 1.58 }],
  [/ruby|manik/i, { color: '#C21E3A', ior: 1.77 }],
  [/hessonite|gomed/i, { color: '#B5541C', ior: 1.74 }],
  [/garnet/i, { color: '#7B1020', ior: 1.75 }],
  [/topaz/i, { color: '#F0A830', ior: 1.62 }],
  [/amethyst|jamunia/i, { color: '#8A4FBF', ior: 1.54 }],
  [/citrine|sunela/i, { color: '#E8A02A', ior: 1.54 }],
  [/diamond|heera|hira|zircon|white\s*sapphire/i, { color: '#F4F7FA', ior: 2.2 }],
  // Opaque stones are cut as smooth domes (cabochons), not facets
  [/cat'?s[\s-]?eye|lehsunia/i, { color: '#BFA764', cabochon: true, chatoyant: true }],
  [/coral|moonga|munga/i, { color: '#D9503A', cabochon: true }],
  [/pearl|moti/i, { color: '#F3EEE6', pearl: true, sphere: true }],
  [/turquoise|firoza|feroza/i, { color: '#3CB4AC', cabochon: true }],
  [/opal/i, { color: '#EDEFF2', cabochon: true, pearl: true }],
];

const textOf = (product) => [product?.name, product?.slug?.replace(/-/g, ' ')].filter(Boolean).join(' ');
const categoryText = (product) =>
  [product?.category?.name, product?.category?.slug?.replace(/-/g, ' ')].filter(Boolean).join(' ');

function matchShape(text) {
  if (!text) return null;
  for (const [type, re] of SHAPE_RULES) if (re.test(text)) return type;
  return null;
}

/* ---------- colour helpers ---------- */
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToRgb([h, s, l]) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
export function shade(hex, dl = 0, ds = 0) {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb([h, Math.max(0, Math.min(1, s + ds)), Math.max(0, Math.min(1, l + dl))]));
}

/**
 * Pick the colour that best represents the product from its photo palette:
 * prefer saturated, mid-light colours (photo highlights are near-white, shadows
 * near-black, and neither says much about the stone).
 */
export function pickBodyColor(colors) {
  const list = (colors || []).filter((c) => /^#[0-9a-f]{6}$/i.test(c));
  if (!list.length) return null;
  let best = null;
  let bestScore = -1;
  list.forEach((c, i) => {
    const [, s, l] = rgbToHsl(hexToRgb(c));
    const lightPenalty = Math.abs(l - 0.5) * 1.2;
    const score = s * 1.4 - lightPenalty - i * 0.04 + 0.6; // earlier = more common
    if (score > bestScore) { bestScore = score; best = c; }
  });
  return best;
}

/** Stone definition (for bracelet3d's procedural material) built from photo colours. */
export function stoneFromColors(colors) {
  const body = pickBodyColor(colors) || '#C9A84C';
  const [, s, l] = rgbToHsl(hexToRgb(body));
  const translucent = s > 0.25 && l > 0.35; // lighter coloured stones let some light through
  return {
    colA: shade(body, -0.16, 0.05),
    colB: shade(body, 0.12, -0.05),
    cloudCol: shade(body, 0.32, -0.25),
    scale: 0.95,
    cloud: 0.18,
    bandMix: 0.08,
    transmission: translucent ? 0.32 : 0.001,
    transVar: 0.45,
    roughness: 0.1,
    roughVar: 0.04,
    attenuationColor: body,
    attenuationDistance: 0.6,
    clearcoat: 0.5,
  };
}

/* ---------- main entry ---------- */
export function detectModelType(product) {
  return matchShape(textOf(product)) || matchShape(categoryText(product)) || 'none';
}

export function resolveModel(product) {
  if (!product) return { type: 'none' };
  const override = product.model_type && product.model_type !== 'auto' ? product.model_type : null;
  const fromName = matchShape(textOf(product));
  const fromCat = fromName ? null : matchShape(categoryText(product));
  const type = override || fromName || fromCat || 'none';
  if (type === 'none' || !MODEL_TYPES.includes(type)) return { type: 'none' };

  const text = `${textOf(product)} ${categoryText(product)}`;
  const colors = product.model_colors || null;
  const source = override ? 'override' : fromName ? 'name' : 'category';
  const variant = type === 'raw' && /\b(cluster|geode|druzy)\b/i.test(text) ? 'cluster' : undefined;

  if (type === 'gemstone') {
    const hit = GEM_RULES.find(([re]) => re.test(text));
    const gem = hit
      ? { ...hit[1] }
      : { color: pickBodyColor(colors) || '#C9A84C', ior: 1.7 };
    return { type, source, look: { kind: 'gem', ...gem } };
  }

  // Beads, crystals, raw stones: a named preset reads far more natural than photo colours
  const stoneHit = STONE_RULES.find(([, re]) => re.test(text));
  if (stoneHit) return { type, source, variant, look: { kind: 'preset', stone: stoneHit[0] } };
  return { type, source, variant, look: { kind: 'colors', colors: colors || [] } };
}

/** True when this browser can draw WebGL (checked once, lazily). */
let webglOk;
export function canRender3D() {
  if (webglOk !== undefined) return webglOk;
  try {
    const c = document.createElement('canvas');
    webglOk = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    webglOk = false;
  }
  return webglOk;
}
