/* Scroll-driven phase map for the Crystal Story section (580vh of scroll).
 *
 * 0.00-0.06 fall | 0.06-0.27 form | 0.27-0.42 360° intro |
 * 0.42-0.54 showcase 1 | 0.54-0.66 showcase 2 | 0.66-0.78 showcase 3 |
 * 0.78-0.89 showcase 4 | 0.89-1.00 CTA
 */
export function getPhase(p) {
  if (p < 0.06) return 0;
  if (p < 0.27) return 1;
  if (p < 0.42) return 2;
  if (p < 0.54) return 3;
  if (p < 0.66) return 4;
  if (p < 0.78) return 5;
  if (p < 0.89) return 6;
  return 7;
}

export function getShowcaseIdx(ph) {
  if (ph >= 3 && ph <= 6) return ph - 3;
  return -1;
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const easeIO = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

/** 0 → 1 as the beads assemble into the bracelet (done at p = 0.27). */
export const formProgress = (p) => easeIO(clamp((p - 0.06) / 0.21, 0, 1));
