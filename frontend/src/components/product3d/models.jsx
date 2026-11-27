import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BEAD_R, createBeadGeometry, createSpacerGeometry } from '../home/bracelet3d/geometry';
import { createStoneMaterial, createStoneMaterialFromDef } from '../home/bracelet3d/stoneMaterial';
import { defineStone } from '../home/bracelet3d/stones';
import { stoneFromColors, shade } from './modelSpec';

/*
 * Procedural product models for the 3D preview. Everything is built in object
 * space at real-ish scale (1 unit ≈ 30 mm, an 8 mm bead has radius BEAD_R) so
 * the shared stone shader keeps its natural pattern size; the viewer scales the
 * finished model to fit the frame.
 */

const Y = new THREE.Vector3(0, 1, 0);
const rand = (a, b) => a + Math.random() * (b - a);
const seed3 = () => [rand(-50, 50), rand(-50, 50), rand(-50, 50)];
const jitter3 = () => {
  const v = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(0.9);
  return [v.x, v.y, v.z];
};

const RUDRAKSHA = defineStone('Rudraksha', {
  colA: '#3A1E0E', colB: '#7B4A25', cloudCol: '#9C6A3C', flakeCol: '#C49060',
  scale: 2.2, cloud: 0.25, bandMix: 0.05, transmission: 0.001, roughness: 0.62, roughVar: 0.18,
  clearcoat: 0.08, sheen: 0.25, sheenColor: '#C08850',
});

const GOLD = () => new THREE.MeshPhysicalMaterial({
  color: '#D9B44A', metalness: 1, roughness: 0.22, clearcoat: 0.4, envMapIntensity: 1.2,
});

/** One material per bead/piece (each gets its own random pattern seed). */
function stoneMaterial(look) {
  if (look.kind === 'preset' && look.stone === 'rudraksha') {
    return createStoneMaterialFromDef(RUDRAKSHA, seed3(), jitter3());
  }
  if (look.kind === 'preset') return createStoneMaterial(look.stone, seed3(), jitter3());
  return createStoneMaterialFromDef(defineStone('Photo colours', stoneFromColors(look.colors)), seed3(), jitter3());
}

const isRudraksha = (look) => look.kind === 'preset' && look.stone === 'rudraksha';

/** Wrinkled rudraksha bead: deep grooves (mukhi lines) pole to pole plus bumps. */
function createRudrakshaGeometry(mukhi = 5) {
  const geo = new THREE.SphereGeometry(BEAD_R, 64, 40);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const ph = Array.from({ length: 6 }, () => rand(0, Math.PI * 2));
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = v.length() || 1;
    const theta = Math.atan2(v.z, v.x);
    const phi = Math.acos(THREE.MathUtils.clamp(v.y / r, -1, 1));
    const groove = Math.pow(Math.abs(Math.cos((theta * mukhi) / 2)), 10) * Math.sin(phi);
    const bumps =
      Math.sin(theta * 13 + ph[0]) * Math.sin(phi * 9 + ph[1]) * 0.5 +
      Math.sin(theta * 21 + ph[2]) * Math.sin(phi * 15 + ph[3]) * 0.35 +
      Math.sin(theta * 34 + ph[4]) * Math.sin(phi * 23 + ph[5]) * 0.2;
    const k = 1 - groove * 0.14 + bumps * 0.035 * Math.sin(phi);
    // flatten the poles slightly where the drill hole goes
    const flat = 1 - 0.12 * Math.pow(Math.abs(v.y / r), 6);
    v.multiplyScalar(k);
    v.y *= flat;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function useDisposable(factory, deps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(factory, deps);
  useEffect(() => () => {
    value.geometries?.forEach((g) => g.dispose());
    value.materials?.forEach((m) => m.dispose());
  }, [value]);
  return value;
}

/* ───────────── Bead bracelet ───────────── */
export function BraceletModel({ look }) {
  const data = useDisposable(() => {
    const N = 22;
    const beadGeo = isRudraksha(look) ? createRudrakshaGeometry() : createBeadGeometry();
    const spacerGeo = createSpacerGeometry();
    const gold = GOLD();
    const items = [{ spacer: true }];
    for (let i = 0; i < N; i++) {
      items.push({ spacer: false });
      if (i === 0) items.push({ spacer: true });
    }
    const width = (it) => (it.spacer ? 0.08 * 0.95 : 2 * BEAD_R * 0.99) + 0.003;
    const total = items.reduce((s, it) => s + width(it), 0);
    const radius = total / (Math.PI * 2);
    let arc = 0;
    const materials = [gold];
    items.forEach((it) => {
      const a = (arc + width(it) / 2) / radius + Math.PI / 2;
      arc += width(it);
      it.position = [Math.cos(a) * radius, 0, Math.sin(a) * radius];
      const tangent = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
      const axis = it.spacer ? new THREE.Vector3(0, 0, 1) : Y;
      const q = new THREE.Quaternion().setFromUnitVectors(axis, tangent);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(axis, rand(0, Math.PI * 2)));
      it.quaternion = q;
      it.scale = it.spacer ? 1 : rand(0.975, 1.025);
      it.material = it.spacer ? gold : stoneMaterial(look);
      if (!it.spacer) materials.push(it.material);
    });
    return { items, beadGeo, spacerGeo, geometries: [beadGeo, spacerGeo], materials };
  }, [look]);

  return (
    <group>
      {data.items.map((it, i) => (
        <mesh
          key={i}
          geometry={it.spacer ? data.spacerGeo : data.beadGeo}
          material={it.material}
          position={it.position}
          quaternion={it.quaternion}
          scale={it.scale}
        />
      ))}
    </group>
  );
}

/* ───────────── Mala (prayer beads, hanging) ───────────── */
export function MalaModel({ look }) {
  const data = useDisposable(() => {
    const N = 54; // a half mala; reads clearly at product-page size
    const beadScale = 0.62;
    const rx = 0.98;
    const ry = 1.38;
    // Teardrop: wider at the bottom (guru bead), narrower where it hangs
    const curvePts = Array.from({ length: 240 }, (_, i) => {
      const t = (i / 240) * Math.PI * 2;
      const widen = 0.72 + 0.28 * Math.cos(t);
      return new THREE.Vector3(Math.sin(t) * rx * widen, -Math.cos(t) * ry, 0);
    });
    const curve = new THREE.CatmullRomCurve3(curvePts, true);
    const beadGeo = isRudraksha(look) ? createRudrakshaGeometry() : createBeadGeometry();
    const gold = GOLD();
    const tasselMat = new THREE.MeshStandardMaterial({ color: '#9E2A1C', roughness: 0.95 });
    const materials = [gold, tasselMat];
    const items = [];
    const M = N + 1;
    for (let i = 0; i < M; i++) {
      const u = i / M;
      const p = curve.getPointAt(u);
      const tan = curve.getTangentAt(u).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(Y, tan);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(Y, rand(0, Math.PI * 2)));
      const guru = i === 0;
      const mat = stoneMaterial(look);
      materials.push(mat);
      items.push({
        position: [p.x, p.y, p.z], quaternion: q, material: mat,
        scale: (guru ? 0.9 : beadScale) * rand(0.97, 1.03),
      });
    }
    // Tassel hanging under the guru bead: gold cap + threads
    const capGeo = new THREE.ConeGeometry(0.07, 0.12, 24);
    const tasselGeo = new THREE.CylinderGeometry(0.035, 0.11, 0.55, 32, 1, true);
    return {
      items, beadGeo, capGeo, tasselGeo, gold, tasselMat, ry,
      geometries: [beadGeo, capGeo, tasselGeo], materials,
    };
  }, [look]);

  const bottom = -data.ry;
  return (
    <group>
      {data.items.map((it, i) => (
        <mesh key={i} geometry={data.beadGeo} material={it.material}
          position={it.position} quaternion={it.quaternion} scale={it.scale} />
      ))}
      <mesh geometry={data.capGeo} material={data.gold} position={[0, bottom - 0.2, 0]} rotation-x={Math.PI} />
      <mesh geometry={data.tasselGeo} material={data.tasselMat} position={[0, bottom - 0.52, 0]} />
    </group>
  );
}

/* ───────────── Cut gemstone (faceted or cabochon) ───────────── */
/**
 * Brilliant cut: table, star and kite facets on the crown, upper-girdle facets,
 * a girdle band, and pavilion facets down to the culet. Non-indexed so every
 * facet gets its own flat normal (crisp sparkle). Triangles are oriented
 * outward automatically, so the winding below doesn't have to be hand-checked.
 */
function facetedGeometry(N = 16) {
  const ring = (count, r, y, offset) => Array.from({ length: count }, (_, i) => {
    const a = ((i + offset) / count) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
  });
  const tableC = new THREE.Vector3(0, 0.34, 0);
  const T = ring(N, 0.55, 0.34, 0);         // table edge
  const C = ring(N, 0.83, 0.18, 0.5);       // kite tips, between table corners
  const G = ring(2 * N, 1.0, 0.03, 0);      // girdle top
  const B = ring(2 * N, 1.0, -0.03, 0);     // girdle bottom
  const P = ring(N, 0.48, -0.42, 0);        // pavilion main facet joins
  const culet = new THREE.Vector3(0, -0.84, 0);
  const M = 2 * N;
  const tris = [];
  const tri = (a, b, c) => tris.push([a, b, c]);
  for (let i = 0; i < N; i++) {
    const n = (i + 1) % N;
    tri(tableC, T[i], T[n]);                       // table
    tri(T[i], C[i], T[n]);                         // star
    tri(T[n], C[i], C[n]);                         // kite, upper half
    tri(C[i], G[2 * i], G[2 * i + 1]);             // upper girdle facets
    tri(C[i], G[2 * i + 1], G[(2 * i + 2) % M]);
    tri(C[i], G[(2 * i + 2) % M], C[n]);           // kite, lower half
    tri(P[i], B[2 * i], B[2 * i + 1]);             // lower girdle facets
    tri(P[i], B[2 * i + 1], P[n]);
    tri(P[n], B[2 * i + 1], B[(2 * i + 2) % M]);
    tri(P[i], P[n], culet);                        // pavilion mains
  }
  for (let j = 0; j < M; j++) {
    const k = (j + 1) % M;
    tri(G[j], B[j], G[k]);                         // girdle band
    tri(G[k], B[j], B[k]);
  }
  const inside = new THREE.Vector3(0, -0.12, 0);
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const pos = new Float32Array(tris.length * 9);
  tris.forEach(([a, b, c], i) => {
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    mid.copy(a).add(b).add(c).divideScalar(3).sub(inside);
    const flip = ab.cross(ac).dot(mid) < 0;
    const ordered = flip ? [a, c, b] : [a, b, c];
    ordered.forEach((v, k) => v.toArray(pos, i * 9 + k * 3));
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

function cabochonGeometry() {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * 1.0 + 0.001, Math.sin(a) * 0.58));
  }
  pts.reverse(); // top → girdle
  pts.push(new THREE.Vector2(0.96, -0.06), new THREE.Vector2(0.001, -0.06));
  return new THREE.LatheGeometry(pts, 72);
}

export function GemModel({ look }) {
  const data = useDisposable(() => {
    const color = new THREE.Color(look.color || '#C9A84C');
    let geo;
    let mat;
    if (look.pearl) {
      // Pearls are round; opals are iridescent domes
      geo = look.sphere ? new THREE.SphereGeometry(0.85, 64, 48) : cabochonGeometry();
      mat = new THREE.MeshPhysicalMaterial({
        color, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.15,
        sheen: 0.6, sheenColor: new THREE.Color('#FFE9D6'),
        iridescence: 0.7, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 600],
      });
    } else if (look.cabochon) {
      geo = cabochonGeometry();
      mat = new THREE.MeshPhysicalMaterial({
        color, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06,
        sheen: look.chatoyant ? 0.9 : 0.2,
        sheenColor: new THREE.Color(look.chatoyant ? '#FFF2C8' : shade(look.color, 0.2, -0.1)),
      });
    } else {
      geo = facetedGeometry();
      const clear = color.getHSL({}).s < 0.08; // diamond / white stones
      mat = new THREE.MeshPhysicalMaterial({
        // `color` tints the light passing through; attenuation adds depth in thick areas
        color: clear ? new THREE.Color('#FFFFFF') : color,
        transmission: 1, thickness: 0.9, roughness: 0, ior: look.ior || 1.7,
        attenuationColor: clear ? new THREE.Color('#FFFFFF') : color,
        attenuationDistance: clear ? 10 : 1.2,
        specularIntensity: 1, clearcoat: 0.25, clearcoatRoughness: 0, envMapIntensity: 2.4,
      });
    }
    return { geo, mat, oval: !look.sphere, geometries: [geo], materials: [mat] };
  }, [look]);

  return (
    <mesh geometry={data.geo} material={data.mat} scale={data.oval ? [1, 1, 0.78] : 1} />
  );
}

/* ───────────── Crystal point / tower ───────────── */
export function CrystalModel({ look }) {
  const data = useDisposable(() => {
    const r = 0.085;
    const h = 0.24;
    const body = new THREE.CylinderGeometry(r * 0.96, r * 1.04, h, 6, 1, false);
    const tip = new THREE.ConeGeometry(r * 0.96, r * 1.25, 6, 1, false);
    tip.translate(0, h / 2 + (r * 1.25) / 2, 0);
    const merged = mergeGeometries([body.toNonIndexed(), tip.toNonIndexed()]);
    merged.computeVertexNormals(); // flat facets
    body.dispose();
    tip.dispose();
    const mat = stoneMaterial(look);
    return { geo: merged, mat, geometries: [merged], materials: [mat] };
  }, [look]);
  return <mesh geometry={data.geo} material={data.mat} rotation-y={Math.PI / 6} />;
}

/* ───────────── Raw stone (rough chunk, optionally with crystal points) ───────────── */
function roughGeometry(radius, detail, amp) {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const ph = Array.from({ length: 9 }, () => rand(0, Math.PI * 2));
  const stretch = [rand(0.85, 1.25), rand(0.7, 1.0), rand(0.85, 1.2)];
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    // Mostly broad lumps; fine detail kept small so faces never fold through each other
    const n =
      Math.sin(v.x * 2.6 + ph[0]) * Math.sin(v.y * 2.3 + ph[1]) * Math.sin(v.z * 2.8 + ph[2]) +
      0.35 * Math.sin(v.x * 5.9 + ph[3]) * Math.sin(v.y * 5.3 + ph[4]) * Math.sin(v.z * 5.6 + ph[5]) +
      0.08 * Math.sin(v.x * 11 + ph[6]) * Math.sin(v.y * 10 + ph[7]) * Math.sin(v.z * 10.5 + ph[8]);
    v.multiplyScalar(radius * (1 + n * amp));
    pos.setXYZ(i, v.x * stretch[0], v.y * stretch[1], v.z * stretch[2]);
  }
  // Polyhedron geometries are already non-indexed in this three.js version
  const flat = geo.index ? geo.toNonIndexed() : geo;
  flat.computeVertexNormals();
  if (flat !== geo) geo.dispose();
  return flat;
}

export function RawModel({ look, variant }) {
  const data = useDisposable(() => {
    const base = roughGeometry(0.12, 4, 0.22);
    const baseMat = stoneMaterial(look);
    const geometries = [base];
    const materials = [baseMat];
    const points = [];
    if (variant === 'cluster') {
      const r = 0.026;
      const pointGeo = (() => {
        const body = new THREE.CylinderGeometry(r, r * 1.05, 0.11, 6).toNonIndexed();
        const tip = new THREE.ConeGeometry(r, r * 1.5, 6).toNonIndexed();
        tip.translate(0, 0.055 + r * 0.75, 0);
        const g = mergeGeometries([body, tip]);
        g.computeVertexNormals();
        return g;
      })();
      geometries.push(pointGeo);
      for (let i = 0; i < 9; i++) {
        const a = rand(0, Math.PI * 2);
        const lean = rand(0.05, 0.7);
        const dir = new THREE.Vector3(Math.sin(lean) * Math.cos(a), Math.cos(lean), Math.sin(lean) * Math.sin(a));
        const mat = stoneMaterial(look);
        materials.push(mat);
        points.push({
          position: dir.clone().multiplyScalar(0.075).toArray(),
          quaternion: new THREE.Quaternion().setFromUnitVectors(Y, dir),
          scale: rand(0.7, 1.35),
          material: mat,
        });
      }
      return { base, baseMat, pointGeo, points, geometries, materials };
    }
    return { base, baseMat, points, geometries, materials };
  }, [look, variant]);

  return (
    <group>
      <mesh geometry={data.base} material={data.baseMat} />
      {data.points.map((p, i) => (
        <mesh key={i} geometry={data.pointGeo} material={p.material}
          position={p.position} quaternion={p.quaternion} scale={p.scale} />
      ))}
    </group>
  );
}

export const MODEL_COMPONENTS = {
  bracelet: BraceletModel,
  mala: MalaModel,
  gemstone: GemModel,
  crystal: CrystalModel,
  raw: RawModel,
};
