import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BEAD_R, SPACER_THICKNESS, createBeadGeometry, createCordGeometry, createSpacerGeometry } from './geometry';
import { blendToStone, createStoneMaterial } from './stoneMaterial';
import { MIX_ORDER } from './stones';
import { clamp, easeIO, formProgress, lerp } from './phases';

const N_BEADS = 24;          // 24 × 8 mm beads ≈ a standard 18–19 cm stretch bracelet
const GAP = 0.003;           // tiny gap between beads where the elastic shows

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const rand = (a, b) => a + Math.random() * (b - a);

/* Layout: [spacer, feature bead, spacer, bead, bead, …] laid end-to-end along a
 * circle whose circumference is exactly the threaded length, so beads touch. */
function buildLayout() {
  const items = [{ type: 'spacer' }];
  for (let i = 0; i < N_BEADS; i++) {
    items.push({ type: 'bead', beadIdx: i, stone: MIX_ORDER[i % MIX_ORDER.length] });
    if (i === 0) items.push({ type: 'spacer' });
  }

  for (const it of items) {
    it.scale = it.type === 'bead' ? rand(0.975, 1.025) : 1; // natural size variation
    it.width = it.type === 'bead' ? 2 * BEAD_R * it.scale * 0.99 : SPACER_THICKNESS * 0.95;
  }
  const total = items.reduce((sum, it) => sum + it.width + GAP, 0);
  const radius = total / (Math.PI * 2);

  // Centre the feature bead (index 1) at the front of the ring, facing the camera
  let arc = 0;
  for (const it of items) {
    it.arcCenter = arc + it.width / 2;
    arc += it.width + GAP;
  }
  const offset = Math.PI / 2 - items[1].arcCenter / radius;

  items.forEach((it, idx) => {
    const a = it.arcCenter / radius + offset;
    it.target = new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    const tangent = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const axis = it.type === 'bead' ? Y_AXIS : Z_AXIS; // drill-hole axis of the mesh
    const align = new THREE.Quaternion().setFromUnitVectors(axis, tangent);
    const spin = new THREE.Quaternion().setFromAxisAngle(axis, rand(0, Math.PI * 2));
    it.ringQ = align.multiply(spin);

    it.seed = [rand(-50, 50), rand(-50, 50), rand(-50, 50)];
    const j = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(0.9);
    it.jitter = [j.x, j.y, j.z];
    it.order = idx; // stone-change wave travels around the ring
    it.tumbleAxis = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
    it.tumbleSpeed = rand(0.01, 0.03);
    it.tumbleQ = new THREE.Quaternion().setFromAxisAngle(it.tumbleAxis, rand(0, Math.PI * 2));
    it.scatter = {
      x: rand(-3, 3), y: rand(2.8, 5.6), z: rand(-3, 3),
      vx: rand(-0.02, 0.02), vy: 0, ry: rand(-1.8, -0.9), settled: false,
    };
  });

  return { items, radius };
}

const _q = new THREE.Quaternion();
const _dq = new THREE.Quaternion();

/* Soft contact shadow for a ring of beads: a tight dark core where beads touch the
 * surface plus a wide, faint ambient-occlusion halo. Generated once on a canvas —
 * no extra render pass (a ring's shadow is the same at every rotation). */
const SHADOW_SIZE = 4; // world units covered by the shadow plane
function createRingShadowTexture(radius) {
  const px = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(px, px);
  const core = 0.045;
  const halo = 0.22;
  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      const wx = ((x + 0.5) / px - 0.5) * SHADOW_SIZE;
      const wz = ((y + 0.5) / px - 0.5) * SHADOW_SIZE;
      const d = Math.hypot(wx, wz) - radius;
      const a = Math.min(1,
        0.9 * Math.exp(-(d * d) / (2 * core * core)) +
        0.32 * Math.exp(-(d * d) / (2 * halo * halo)));
      const i = (y * px + x) * 4;
      img.data[i] = 74; img.data[i + 1] = 50; img.data[i + 2] = 28; // warm brown, not grey
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function Bracelet({ progressRef, showcaseRef, showcaseStones }) {
  const groupRef = useRef();
  const meshRefs = useRef([]);
  const cordRef = useRef();
  const autoRot = useRef(0);

  const layout = useMemo(buildLayout, []);
  const beadGeo = useMemo(createBeadGeometry, []);
  const spacerGeo = useMemo(createSpacerGeometry, []);
  const cordGeo = useMemo(() => createCordGeometry(layout.radius), [layout.radius]);

  const materials = useMemo(
    () => layout.items.map((it) => (it.type === 'bead' ? createStoneMaterial(it.stone, it.seed, it.jitter) : null)),
    [layout],
  );
  // Polished 18k-gold-tone spacer
  const goldMat = useMemo(
    () => new THREE.MeshPhysicalMaterial({
      color: '#E2B868', metalness: 1, roughness: 0.17, clearcoat: 0.3, clearcoatRoughness: 0.1,
    }),
    [],
  );
  // Clear stretch elastic — only visible in the hairline gaps between beads
  const cordMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#EAE3D6', roughness: 0.45, transparent: true, opacity: 0 }),
    [],
  );

  const shadowMat = useMemo(
    () => new THREE.MeshBasicMaterial({
      map: createRingShadowTexture(layout.radius),
      transparent: true, depthWrite: false, toneMapped: false, opacity: 0,
    }),
    [layout.radius],
  );
  const shadowRef = useRef();

  const stoneState = useRef(layout.items.map((it) => ({ pending: it.stone, active: it.stone, switchAt: 0 })));

  useEffect(() => () => {
    beadGeo.dispose(); spacerGeo.dispose(); cordGeo.dispose();
    goldMat.dispose(); cordMat.dispose();
    shadowMat.map?.dispose(); shadowMat.dispose();
    materials.forEach((m) => m && m.dispose());
  }, [beadGeo, spacerGeo, cordGeo, goldMat, cordMat, shadowMat, materials]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const dt = Math.min(delta, 0.05);
    const f = dt * 60; // physics was tuned per 60 fps frame
    const p = progressRef.current;
    const cv = formProgress(p);
    const t = state.clock.getElapsedTime();

    // Slow turntable rotation once formed, plus a gentle hover of the whole bracelet
    if (p >= 0.27) autoRot.current += dt * 0.45;
    group.rotation.y = autoRot.current * easeIO(clamp((p - 0.27) / 0.1, 0, 1));
    group.position.y = cv > 0.88 ? Math.sin(t * 0.9) * 0.018 : 0;

    const si = showcaseRef.current;
    const blendK = 1 - Math.pow(0.015, dt); // smooth, frame-rate independent

    const { items } = layout;
    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      const mesh = meshRefs.current[idx];
      if (!mesh) continue;
      const s = it.scatter;
      const del = (idx / items.length) * 0.12;
      const bc = easeIO(clamp((cv - del) / (1 - del + 0.001), 0, 1));

      if (cv < 0.005 && s.settled) { // scrolled back to the top — drop again
        s.settled = false;
        s.y = rand(2.8, 5.3);
        s.vy = 0;
        s.vx = rand(-0.02, 0.02);
      }

      if (cv < 0.01) {
        if (!s.settled) {
          s.vy -= 0.004 * f;
          s.vx *= Math.pow(0.991, f);
          s.x += s.vx * f;
          s.y += s.vy * f;
          if (s.y <= s.ry) {
            s.y = s.ry;
            s.vy = -s.vy * 0.32;
            s.vx = s.vx * 0.8 + rand(-0.027, 0.027);
            if (Math.abs(s.vy) < 0.012) { s.settled = true; s.vy = 0; }
          }
          it.tumbleQ.multiply(_dq.setFromAxisAngle(it.tumbleAxis, it.tumbleSpeed * f));
        }
        mesh.position.set(s.x, s.y, s.z);
        mesh.quaternion.copy(it.tumbleQ);
      } else {
        mesh.position.set(lerp(s.x, it.target.x, bc), lerp(s.y, 0, bc), lerp(s.z, it.target.z, bc));
        mesh.quaternion.copy(_q.copy(it.tumbleQ).slerp(it.ringQ, bc));
      }

      if (it.type === 'bead') {
        const st = stoneState.current[idx];
        const target = si >= 0 ? showcaseStones[si] : it.stone;
        if (target !== st.pending) {
          st.pending = target;
          st.switchAt = t + it.order * 0.035; // wave of stone changes around the ring
        }
        if (t >= st.switchAt) st.active = st.pending;
        blendToStone(materials[idx], st.active, blendK);
      }
    }

    if (cordRef.current) {
      const o = clamp((cv - 0.85) / 0.15, 0, 1) * 0.9;
      cordMat.opacity = o;
      cordRef.current.visible = o > 0.001;
    }

    if (shadowRef.current) {
      // Fade in as the bracelet settles; lighten slightly while it hovers upward
      const hover = Math.max(0, group.position.y) * 8;
      const o = clamp((cv - 0.8) / 0.2, 0, 1) * (0.75 - hover);
      shadowMat.opacity = o;
      shadowRef.current.visible = o > 0.001;
    }
  });

  return (
    <>
    {/* Shadow sits on the "tabletop", outside the rotating/hovering group */}
    <mesh ref={shadowRef} rotation-x={-Math.PI / 2} position={[0, -BEAD_R - 0.03, 0]}
          material={shadowMat} visible={false} renderOrder={-1}>
      <planeGeometry args={[SHADOW_SIZE, SHADOW_SIZE]} />
    </mesh>
    <group ref={groupRef}>
      {layout.items.map((it, idx) => (
        <mesh
          key={idx}
          ref={(el) => { meshRefs.current[idx] = el; }}
          geometry={it.type === 'bead' ? beadGeo : spacerGeo}
          material={it.type === 'bead' ? materials[idx] : goldMat}
          scale={it.scale}
        />
      ))}
      <mesh ref={cordRef} geometry={cordGeo} material={cordMat} visible={false} />
    </group>
    </>
  );
}
