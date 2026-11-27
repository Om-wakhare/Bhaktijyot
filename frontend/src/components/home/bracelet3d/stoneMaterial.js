import * as THREE from 'three';
import { STONES } from './stones';
import { BEAD_R } from './geometry';

/* Procedural gemstone material.
 *
 * A MeshPhysicalMaterial whose diffuse colour, transmission, roughness, metalness
 * and normal are modulated per pixel by 3D noise evaluated in the bead's OBJECT
 * space — so patterns wrap seamlessly (no UV seams/poles), stay crisp at any zoom,
 * and every bead is unique (random seed offset). All of it runs on the GPU.
 */

const GLSL_NOISE = /* glsl */ `
varying vec3 vBjPos;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uCloudCol;
uniform vec3 uFlakeCol;
uniform vec3 uBandDir;
uniform vec3 uSeed;
uniform vec3 uJitter;
uniform float uScale;
uniform float uBandMix;
uniform float uBandFreq;
uniform float uBandWarp;
uniform float uFiber;
uniform float uCloud;
uniform float uFlake;
uniform float uFlakeScale;
uniform float uTransVar;
uniform float uRoughVar;
uniform float uBeadR;

// Simplex 3D noise — Ashima Arts / Stefan Gustavson (MIT)
vec3 bj_mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 bj_mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 bj_permute(vec4 x) { return bj_mod289(((x * 34.0) + 10.0) * x); }
vec4 bj_taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float bj_snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g  = step(x0.yzx, x0.xyz);
  vec3 l  = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = bj_mod289(i);
  vec4 p = bj_permute(bj_permute(bj_permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j  = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x  = x_ * ns.x + ns.yyyy;
  vec4 y  = y_ * ns.x + ns.yyyy;
  vec4 h  = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = bj_taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float bj_fbm(vec3 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * bj_snoise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.3);
    a *= 0.5;
  }
  return s;
}

float bj_hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
`;

const GLSL_PATTERN = /* glsl */ `
#include <map_fragment>
// ── Bhaktijyot stone pattern ───────────────────────────────────────────
vec3 bjP = vBjPos / uBeadR * uScale + uSeed;
vec3 bjDir = normalize(normalize(uBandDir) + uJitter); // each bead cut at its own angle
vec3 bjWarp = vec3(bj_snoise(bjP + 1.7), bj_snoise(bjP + 9.2), bj_snoise(bjP + 4.1));
vec3 bjQ = bjP + uBandWarp * 0.45 * bjWarp;
float bjN = bj_fbm(bjQ) * 0.5 + 0.5;                                   // natural mottling
float bjBands = 0.5 + 0.5 * sin(dot(bjQ, bjDir) * uBandFreq * 6.2831853);
float bjFib = bj_snoise(vec3(bjP.x * 2.5, dot(bjP, bjDir) * 34.0, bjP.z * 2.5)) * 0.5 + 0.5;
float bjPat = mix(bjN, bjBands, uBandMix);
bjPat = mix(bjPat, bjPat * 0.6 + bjFib * 0.4, uFiber);
vec3 bjCol = mix(uColA, uColB, smoothstep(0.12, 0.88, bjPat));
float bjCloud = smoothstep(0.5, 0.92, bj_fbm(bjQ * 1.6 + 7.3) * 0.5 + 0.5) * uCloud;
bjCol = mix(bjCol, uCloudCol, bjCloud);
// Reflective mica platelets (aventurescence): sparse cells in 3D
vec3 bjCellP = bjP * uFlakeScale;
vec3 bjCell = floor(bjCellP);
float bjH = bj_hash(bjCell);
float bjFlake = step(1.0 - uFlake, bjH) * smoothstep(0.5, 0.1, length(fract(bjCellP) - 0.5));
bjCol = mix(bjCol, uFlakeCol, bjFlake * 0.85);
diffuseColor.rgb *= bjCol;
float bjTrans = clamp(1.0 - uTransVar * (bjCloud * 1.4 + (1.0 - bjPat) * 0.3), 0.0, 1.0) * (1.0 - bjFlake);
`;

const GLSL_ROUGHNESS = /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + uRoughVar * (bjN - 0.5) * 2.0 - bjFlake * 0.5, 0.02, 1.0);
`;

const GLSL_METALNESS = /* glsl */ `
#include <metalnessmap_fragment>
metalnessFactor = max(metalnessFactor, bjFlake * 0.9);
`;

const GLSL_NORMAL = /* glsl */ `
#include <normal_fragment_maps>
// Each flake is tilted at its own angle so it catches the light independently (glitter)
vec3 bjTilt = vec3(bj_hash(bjCell + 19.19), bj_hash(bjCell + 47.47), bj_hash(bjCell + 83.83)) - 0.5;
normal = normalize(normal + bjTilt * bjFlake * 1.1);
`;

function patchShader(shader, uniforms) {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vBjPos;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBjPos = position;');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${GLSL_NOISE}`)
    .replace('#include <map_fragment>', GLSL_PATTERN)
    .replace('#include <roughnessmap_fragment>', GLSL_ROUGHNESS)
    .replace('#include <metalnessmap_fragment>', GLSL_METALNESS)
    .replace('#include <normal_fragment_maps>', GLSL_NORMAL)
    .replace(
      '#include <transmission_fragment>',
      THREE.ShaderChunk.transmission_fragment.replace(
        'material.transmission = transmission;',
        'material.transmission = transmission * bjTrans;',
      ),
    );
}

/** Create a bead material for a stone, with a per-bead random pattern seed. */
export function createStoneMaterial(stoneKey, seed, jitter = [0, 0, 0]) {
  const s = STONES[stoneKey];
  const uniforms = {
    uColA: { value: new THREE.Color(s.colA) },
    uColB: { value: new THREE.Color(s.colB) },
    uCloudCol: { value: new THREE.Color(s.cloudCol) },
    uFlakeCol: { value: new THREE.Color(s.flakeCol) },
    uBandDir: { value: new THREE.Vector3(...s.bandDir) },
    uSeed: { value: new THREE.Vector3(...seed) },
    uJitter: { value: new THREE.Vector3(...jitter) },
    uScale: { value: s.scale },
    uBandMix: { value: s.bandMix },
    uBandFreq: { value: s.bandFreq },
    uBandWarp: { value: s.bandWarp },
    uFiber: { value: s.fiber },
    uCloud: { value: s.cloud },
    uFlake: { value: s.flake },
    uFlakeScale: { value: s.flakeScale },
    uTransVar: { value: s.transVar },
    uRoughVar: { value: s.roughVar },
    uBeadR: { value: BEAD_R },
  };

  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: s.roughness,
    transmission: s.transmission,
    thickness: s.thickness,
    ior: s.ior,
    attenuationColor: new THREE.Color(s.attenuationColor),
    attenuationDistance: s.attenuationDistance,
    clearcoat: s.clearcoat,
    clearcoatRoughness: 0.08,
    sheen: s.sheen,
    sheenColor: new THREE.Color(s.sheenColor),
    sheenRoughness: 0.6,
    anisotropy: s.anisotropy,
    specularIntensity: 1,
    envMapIntensity: 1,
  });
  mat.userData.bj = uniforms;
  // Same function source for every bead → three.js shares one compiled program
  mat.onBeforeCompile = (shader) => patchShader(shader, uniforms);
  return mat;
}

const _c = new THREE.Color();
const _v = new THREE.Vector3();
const mixNum = (cur, target, k) => cur + (target - cur) * k;

/** Ease a bead material toward a stone preset (k = 0..1 blend for this frame). */
export function blendToStone(mat, stoneKey, k) {
  const s = STONES[stoneKey];
  const u = mat.userData.bj;
  u.uColA.value.lerp(_c.set(s.colA), k);
  u.uColB.value.lerp(_c.set(s.colB), k);
  u.uCloudCol.value.lerp(_c.set(s.cloudCol), k);
  u.uFlakeCol.value.lerp(_c.set(s.flakeCol), k);
  u.uBandDir.value.lerp(_v.set(...s.bandDir), k);
  for (const [key, val] of [
    ['uScale', s.scale], ['uBandMix', s.bandMix], ['uBandFreq', s.bandFreq],
    ['uBandWarp', s.bandWarp], ['uFiber', s.fiber], ['uCloud', s.cloud],
    ['uFlake', s.flake], ['uFlakeScale', s.flakeScale], ['uTransVar', s.transVar],
    ['uRoughVar', s.roughVar],
  ]) {
    u[key].value = mixNum(u[key].value, val, k);
  }
  // Keep the feature flags (> 0) stable so the shader program never changes
  mat.transmission = Math.max(0.001, mixNum(mat.transmission, s.transmission, k));
  mat.roughness = mixNum(mat.roughness, s.roughness, k);
  mat.thickness = mixNum(mat.thickness, s.thickness, k);
  mat.ior = mixNum(mat.ior, s.ior, k);
  mat.attenuationDistance = mixNum(mat.attenuationDistance, s.attenuationDistance, k);
  mat.attenuationColor.lerp(_c.set(s.attenuationColor), k);
  mat.clearcoat = Math.max(0.01, mixNum(mat.clearcoat, s.clearcoat, k));
  mat.sheen = Math.max(0.01, mixNum(mat.sheen, s.sheen, k));
  mat.sheenColor.lerp(_c.set(s.sheenColor), k);
  mat.anisotropy = Math.max(0.01, mixNum(mat.anisotropy, s.anisotropy, k));
}
