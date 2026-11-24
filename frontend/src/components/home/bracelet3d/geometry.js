import * as THREE from 'three';

/* Scene units: 1 unit ≈ 30 mm, so BEAD_R 0.135 ≈ an 8 mm bead (the standard
 * size for stretch bracelets) and the drill hole ≈ 1 mm. */
export const BEAD_R = 0.135;
export const HOLE_R = BEAD_R * 0.13;

/** A polished bead with a drill hole running along its local Y axis. */
export function createBeadGeometry() {
  const rimY = Math.sqrt(BEAD_R * BEAD_R - HOLE_R * HOLE_R);
  const rimTheta = Math.asin(HOLE_R / BEAD_R); // angle from the pole where the hole starts
  const pts = [];

  // Inner wall — from the middle of the hole down to the bottom rim
  for (const t of [0, 0.5, 0.92]) pts.push(new THREE.Vector2(HOLE_R, -rimY * t));
  // Softened (polished) bottom rim
  pts.push(new THREE.Vector2(HOLE_R * 1.25, -rimY * 0.995));
  // Outer surface — bottom rim to top rim
  const OUTER = 44;
  for (let i = 1; i < OUTER; i++) {
    const theta = Math.PI - rimTheta * 1.6 - (i / OUTER) * (Math.PI - rimTheta * 3.2);
    pts.push(new THREE.Vector2(Math.sin(theta) * BEAD_R, Math.cos(theta) * BEAD_R));
  }
  // Softened top rim, then the inner wall back down to the middle
  pts.push(new THREE.Vector2(HOLE_R * 1.25, rimY * 0.995));
  for (const t of [0.92, 0.5, 0]) pts.push(new THREE.Vector2(HOLE_R, rimY * t));

  // LatheGeometry's own analytic normals are seam-free (computeVertexNormals would
  // leave a lighting seam where the lathe wraps around)
  const geo = new THREE.LatheGeometry(pts, 48);
  geo.computeTangents(); // needed for the anisotropic (tiger-eye) sheen
  return geo;
}

/** Gold spacer rondelle — a rounded ring whose axis is local Z. */
export const SPACER_THICKNESS = 0.08;
export function createSpacerGeometry() {
  return new THREE.TorusGeometry(0.074, SPACER_THICKNESS / 2, 24, 64);
}

/** Clear elastic cord threading every bead (a closed circle in the XZ plane). */
export function createCordGeometry(radius) {
  const pts = Array.from({ length: 96 }, (_, i) => {
    const a = (i / 96) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 256, HOLE_R * 0.7, 8, true);
}
