/* Physically-inspired presets for polished gemstone beads.
 *
 * Pattern parameters drive the procedural stone shader (stoneMaterial.js):
 *   colA / colB   – the two body colours the natural mottling blends between
 *   cloudCol      – milky / white zones (quartz veils, inclusions)
 *   flakeCol      – reflective mica platelets (aventurescence)
 *   scale         – pattern frequency on the bead
 *   bandMix       – 0 = cloudy mottling, 1 = colour banding (amethyst chevrons, tiger eye)
 *   bandFreq/bandWarp/bandDir – band count, waviness and orientation
 *   fiber         – fine parallel fibres (tiger eye)
 *   cloud         – amount of milky veils
 *   flake/flakeScale – density and size of sparkling flakes
 *   transVar      – how strongly cloudy zones block light (per-pixel transmission)
 *   roughVar      – polish variation across the surface
 * Material parameters map directly onto THREE.MeshPhysicalMaterial.
 * Every stone keeps transmission/clearcoat/sheen/anisotropy > 0 so all beads share
 * ONE shader program — switching stones never triggers a shader recompile.
 */

const DEFAULTS = {
  colA: '#888888', colB: '#BBBBBB', cloudCol: '#FFFFFF', flakeCol: '#FFFFFF',
  scale: 1.0, bandMix: 0, bandFreq: 1, bandWarp: 1, bandDir: [0, 1, 0], fiber: 0,
  cloud: 0, flake: 0, flakeScale: 45, transVar: 0, roughVar: 0.04,
  transmission: 0.001, roughness: 0.1, ior: 1.54, thickness: 1.0,
  attenuationColor: '#FFFFFF', attenuationDistance: 1.0,
  clearcoat: 0.5, sheen: 0.01, sheenColor: '#FFFFFF', anisotropy: 0.01,
};

const stone = (name, def) => ({ name, ...DEFAULTS, ...def });

/** Build a stone definition outside the presets (e.g. from a product photo's colours). */
export const defineStone = stone;

export const STONES = {
  amethyst: stone('Amethyst', {
    colA: '#4A1A6C', colB: '#A67BD3', cloudCol: '#F1EAF7',
    scale: 0.9, bandMix: 0.12, bandFreq: 1.2, bandWarp: 0.8, cloud: 0.22,
    transmission: 0.55, transVar: 0.5, roughness: 0.06, roughVar: 0.04,
    ior: 1.544, thickness: 1.0, attenuationColor: '#7438AA', attenuationDistance: 0.5,
    clearcoat: 0.5,
  }),
  roseQuartz: stone('Rose Quartz', {
    colA: '#DFA0B1', colB: '#F6DAE1', cloudCol: '#FFF6F8',
    scale: 0.9, bandWarp: 0.8, cloud: 0.5,
    transmission: 0.3, transVar: 0.5, roughness: 0.15, roughVar: 0.05,
    ior: 1.544, thickness: 1.4, attenuationColor: '#EBA6BA', attenuationDistance: 0.6,
    clearcoat: 0.35, sheen: 0.3, sheenColor: '#FFE0E8',
  }),
  citrine: stone('Citrine', {
    colA: '#C77418', colB: '#F4C860', cloudCol: '#FFF0C4',
    scale: 0.9, bandMix: 0.1, cloud: 0.12,
    transmission: 0.7, transVar: 0.4, roughness: 0.05, roughVar: 0.03,
    ior: 1.544, attenuationColor: '#D9902A', attenuationDistance: 0.7, clearcoat: 0.6,
  }),
  clearQuartz: stone('Clear Quartz', {
    colA: '#F2F5F7', colB: '#FFFFFF', cloudCol: '#FFFFFF',
    scale: 1.1, cloud: 0.2,
    transmission: 1.0, transVar: 0.6, roughness: 0.03, roughVar: 0.015,
    ior: 1.544, thickness: 1.3, attenuationColor: '#F4F8FA', attenuationDistance: 6.0,
    clearcoat: 0.7,
  }),
  tigerEye: stone('Tiger Eye', {
    colA: '#5A3311', colB: '#CA902F', cloudCol: '#E2B25A', flakeCol: '#FFD27A',
    scale: 1.0, bandMix: 0.85, bandFreq: 1.3, bandWarp: 0.45, bandDir: [0, 1, 0], fiber: 0.55,
    cloud: 0.06, transmission: 0.001, roughness: 0.2, roughVar: 0.08,
    thickness: 0.2, clearcoat: 0.6, sheen: 0.12, sheenColor: '#E6B65A', anisotropy: 0.8,
  }),
  blackObsidian: stone('Black Obsidian', {
    colA: '#030304', colB: '#16151A', cloudCol: '#26252C',
    scale: 0.8, cloud: 0.05, transmission: 0.001, roughness: 0.06, roughVar: 0.02,
    ior: 1.5, thickness: 0.2, clearcoat: 1.0,
  }),
  greenAventurine: stone('Green Aventurine', {
    colA: '#123F25', colB: '#3F8556', cloudCol: '#8CC49A', flakeCol: '#EAF7DE',
    scale: 1.0, cloud: 0.1, flake: 0.14, flakeScale: 24,
    transmission: 0.14, transVar: 0.4, roughness: 0.18, roughVar: 0.05,
    ior: 1.55, attenuationColor: '#2A6A40', attenuationDistance: 0.5, clearcoat: 0.45,
  }),
};

/** Order of stones in the intro "mixed" bracelet (repeats around the ring). */
export const MIX_ORDER = [
  'amethyst', 'roseQuartz', 'citrine', 'clearQuartz', 'tigerEye', 'blackObsidian', 'greenAventurine',
];
