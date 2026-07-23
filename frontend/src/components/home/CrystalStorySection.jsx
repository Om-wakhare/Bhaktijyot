import { useEffect, useRef, useState, Suspense, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Sparkles } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import * as THREE from 'three';

/* ── Crystal PBR configs — per-stone scientific tuning ───────── */
const CRYSTALS = [
  // Amethyst — deep transparent purple, strong dispersion
  { name:'Amethyst',
    color:'#6B2090', emissive:'#180428', ei:0.28,
    tx:0.88, tk:1.0,  rg:0.02, ior:1.77, cc:1, cr:0.02,
    ac:'#9040C8', ad:0.18, disp:0.5 },

  // Rose Quartz — soft milky pink, slightly cloudy (not perfectly clear)
  { name:'Rose Quartz',
    color:'#E8A0B4', emissive:'#380818', ei:0.12,
    tx:0.78, tk:0.8,  rg:0.08, ior:1.54, cc:0.9, cr:0.06,
    ac:'#F8C8D8', ad:0.45, disp:0.25 },

  // Citrine — warm golden, highly transparent
  { name:'Citrine',
    color:'#E8A800', emissive:'#402800', ei:0.18,
    tx:0.90, tk:0.9,  rg:0.02, ior:1.55, cc:1, cr:0.02,
    ac:'#FFD860', ad:0.22, disp:0.6 },

  // Clear Quartz — near-colourless, maximum light play
  { name:'Clear Quartz',
    color:'#DCF0FF', emissive:'#0C2040', ei:0.06,
    tx:0.97, tk:1.1,  rg:0.01, ior:1.54, cc:1, cr:0.01,
    ac:'#EEF8FF', ad:1.80, disp:0.8 },

  // Tiger Eye — opaque, golden chatoyant sheen (fuchsite sheen approximation)
  { name:'Tiger Eye',
    color:'#8B5C10', emissive:'#1C0C00', ei:0.12,
    tx:0.0,  tk:0.1,  rg:0.28, ior:1.58, cc:0.6, cr:0.22,
    mn:0.55, ac:'#C08820', ad:0.05,
    sh:0.85, shc:'#D4A030', shr:0.35, disp:0 },

  // Black Obsidian — jet-black volcanic glass, mirror-like
  { name:'Black Obsidian',
    color:'#04050A', emissive:'#000002', ei:0.0,
    tx:0.0,  tk:0.0,  rg:0.005, ior:1.50, cc:1, cr:0.0,
    mn:0.0,  ac:'#04050A', ad:0.02, disp:0 },

  // Green Aventurine — semi-transparent green with golden sparkle
  { name:'Green Aventurine',
    color:'#28743C', emissive:'#061A0C', ei:0.18,
    tx:0.50, tk:0.7,  rg:0.10, ior:1.55, cc:0.9, cr:0.08,
    mn:0.12, ac:'#50C870', ad:0.18, disp:0.3 },
];

/* ── Showcase: 4 crystal types ──────────────────────────────────  */
const SHOWCASE = [
  {
    crystal:    CRYSTALS[1],
    leftStory:  'Treasured since ancient Egypt as the stone of unconditional love, Rose Quartz carries a gentle energy that opens the heart. Each bead is hand-selected for its soft, translucent warmth.',
    rightName:  'Rose Quartz',
    rightLine1: 'Love  ·  Compassion  ·  Healing',
    rightLine2: 'Crystal of the heart chakra',
    accent:     '#D07888',
    cam:        [0.2, 3.8, 3.2],   // top-front view
  },
  {
    crystal:    CRYSTALS[0],
    leftStory:  'Worn by royalty and mystics across centuries, Amethyst clears the mind and opens intuition. Its deep violet resonates with higher consciousness and inner peace.',
    rightName:  'Amethyst',
    rightLine1: 'Clarity  ·  Intuition  ·  Protection',
    rightLine2: 'Crystal of higher consciousness',
    accent:     '#7B2FA0',
    cam:        [4.2, 2.2, 2.5],   // right-side view
  },
  {
    crystal:    CRYSTALS[6],
    leftStory:  'Green Aventurine shimmers with the rhythm of nature — a stone for new beginnings, abundance, and the quiet confidence that steady growth brings.',
    rightName:  'Green Aventurine',
    rightLine1: 'Luck  ·  Prosperity  ·  Growth',
    rightLine2: 'Stone of opportunity',
    accent:     '#2A8040',
    cam:        [0.5, 5.6, 1.2],   // near top-down (bracelet shows as true circle)
  },
  {
    crystal:    CRYSTALS[4],
    leftStory:  'Forged where ancient earth met golden light over millions of years, Tiger Eye holds dual energy — grounding you in the present while sharpening your will and vision.',
    rightName:  'Tiger Eye',
    rightLine1: 'Strength  ·  Confidence  ·  Focus',
    rightLine2: 'Stone of courage and willpower',
    accent:     '#8A5C00',
    cam:        [-4.2, 2.2, 2.5],  // left-side view
  },
];

const N      = 28;
const BR     = 1.1;   // bracelet radius
const BEAD_R = 0.135; // bead radius

/* ── Phase map  (8 phases, 580 vh scroll) ────────────────────── */
// 0.00-0.06 fall | 0.06-0.27 form | 0.27-0.42 360°-intro |
// 0.42-0.54 RQ  | 0.54-0.66 AM   | 0.66-0.78 GA          |
// 0.78-0.89 TE  | 0.89-1.00 CTA

function getPhase(p) {
  if (p < 0.06) return 0;
  if (p < 0.27) return 1;
  if (p < 0.42) return 2;
  if (p < 0.54) return 3;
  if (p < 0.66) return 4;
  if (p < 0.78) return 5;
  if (p < 0.89) return 6;
  return 7;
}

function getShowcaseIdx(ph) {
  if (ph === 3) return 0;
  if (ph === 4) return 1;
  if (ph === 5) return 2;
  if (ph === 6) return 3;
  return -1;
}

const CAM = {
  fall:  [0,   1.2, 5.5],
  form:  [0,   2.5, 4.8],
  rot:   [0,   3.6, 3.2],   // 360° intro
  rq:    [0.2, 3.8, 3.2],   // top-front
  am:    [4.2, 2.2, 2.5],   // right side
  ga:    [0.5, 5.6, 1.2],   // near top-down — bracelet reads as circle
  te:    [-4.2,2.2, 2.5],   // left side
  cta:   [0,   1.2, 4.2],   // eye-level intimate product shot
};

const lerp    = (a,b,t) => a + (b-a)*t;
const clamp   = (v,lo,hi) => Math.max(lo, Math.min(hi, v));
const easeIO  = t => t < .5 ? 2*t*t : -1+(4-2*t)*t;

/* ── Scene setup ──────────────────────────────────────────────── */
function SceneSetup() {
  const { gl, scene } = useThree();
  useEffect(() => {
    gl.toneMapping         = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 0.92;
    scene.environmentIntensity = 0.50;
  }, [gl, scene]);
  return (
    <>
      <color attach="background" args={['#F4E4D1']} />
      <fogExp2 attach="fog" args={['#F4E4D1', 0.022]} />
    </>
  );
}

/* ── Crystal bead — true circle, material lerp for showcase ──── */
function CrystalBead({ bIdx, crystal, scatterRef, progressRef, showcaseRef }) {
  const meshRef = useRef();
  const tmpC    = useRef(new THREE.Color());
  const tmpE    = useRef(new THREE.Color());
  const angle   = (bIdx / N) * Math.PI * 2;
  // TRUE CIRCLE — full BR for both X and Z
  const tgtX    = Math.cos(angle) * BR;
  const tgtZ    = Math.sin(angle) * BR;
  const geo     = useMemo(() => new THREE.SphereGeometry(BEAD_R, 28, 20), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const p  = progressRef.current;
    const s  = scatterRef.current[bIdx];
    const cv = easeIO(clamp((p - 0.06) / 0.21, 0, 1)); // done by p=0.27
    const del = (bIdx / N) * 0.12;
    const bc  = easeIO(clamp((cv - del) / (1 - del + 0.001), 0, 1));

    // Reset on scroll-back
    if (cv < 0.005 && s.settled) {
      s.settled = false;
      s.y  = 2.8 + Math.random()*2.5;
      s.vy = 0;
      s.vx = (Math.random()-0.5)*0.04;
    }

    if (cv < 0.01) {
      if (!s.settled) {
        s.vy -= 0.004; s.vx *= 0.991;
        s.x  += s.vx;  s.y  += s.vy;
        if (s.y <= s.ry) {
          s.y   = s.ry;
          s.vy  = -s.vy * 0.32;
          s.vx *= 0.80;
          s.vx += (Math.random()-0.5)*0.055;
          if (Math.abs(s.vy) < 0.012) { s.settled = true; s.vy = 0; }
        }
      }
      meshRef.current.position.set(s.x, s.y, s.z);
      meshRef.current.rotation.x += 0.018;
      meshRef.current.rotation.z += 0.012;
    } else {
      const t = state.clock.getElapsedTime();
      const flt = cv > 0.88 ? Math.sin(t + bIdx * 0.62) * 0.012 : 0;
      meshRef.current.position.set(
        lerp(s.x, tgtX, bc),
        lerp(s.y, 0,    bc) + flt,
        lerp(s.z, tgtZ, bc)
      );
    }

    // Smooth colour transition for showcase phases
    const si = showcaseRef.current;
    const tc = si >= 0 ? SHOWCASE[si].crystal : crystal;
    const mat = meshRef.current.material;
    if (mat) {
      mat.color.lerp(tmpC.current.set(tc.color), 0.07);
      mat.emissive.lerp(tmpE.current.set(tc.emissive), 0.07);
      mat.emissiveIntensity = lerp(mat.emissiveIntensity, tc.ei ?? 0.5, 0.07);
      mat.transmission      = lerp(mat.transmission ?? 0, tc.tx ?? 0.85, 0.05);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geo} castShadow>
      <meshPhysicalMaterial
        color={crystal.color}
        emissive={crystal.emissive}
        emissiveIntensity={crystal.ei ?? 0.3}
        transmission={crystal.tx ?? 0.85}
        thickness={crystal.tk ?? 0.7}
        roughness={crystal.rg ?? 0.05}
        metalness={crystal.mn ?? 0}
        ior={crystal.ior ?? 1.65}
        clearcoat={crystal.cc ?? 1}
        clearcoatRoughness={crystal.cr ?? 0.03}
        attenuationColor={crystal.ac ?? crystal.color}
        attenuationDistance={crystal.ad ?? 0.3}
        sheen={crystal.sh ?? 0}
        sheenColor={crystal.shc ?? '#ffffff'}
        sheenRoughness={crystal.shr ?? 0.5}
        envMapIntensity={3.2}
      />
    </mesh>
  );
}

/* ── Gold cord — true circle ──────────────────────────────────── */
function GoldCord({ progressRef }) {
  const meshRef = useRef();
  const geo = useMemo(() => {
    const pts = Array.from({ length: N+1 }, (_, i) => {
      const a = (i / N) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a)*BR, 0, Math.sin(a)*BR); // true circle
    });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 128, 0.016, 8, true);
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    const cv = easeIO(clamp((progressRef.current - 0.06) / 0.21, 0, 1));
    meshRef.current.visible  = cv > 0.55;
    meshRef.current.material.opacity = easeIO(clamp((cv - 0.55) / 0.25, 0, 1));
  });

  return (
    <mesh ref={meshRef} geometry={geo}>
      <meshPhysicalMaterial
        color="#D4AF37" emissive="#7A5500" emissiveIntensity={0.6}
        metalness={0.97} roughness={0.04}
        clearcoat={1} clearcoatRoughness={0.03}
        envMapIntensity={2.8}
        transparent opacity={0}
      />
    </mesh>
  );
}

/* ── Bracelet group — auto-rotation starts at phase 2 ─────────── */
function BraceletGroup({ progressRef, showcaseRef }) {
  const groupRef = useRef();
  const autoRot  = useRef(0);
  const scatter  = useRef(
    Array.from({ length: N }, () => ({
      x:(Math.random()-0.5)*6, y:2.8+Math.random()*2.8,
      z:(Math.random()-0.5)*6, vx:(Math.random()-0.5)*0.04,
      vy:0, ry:-1.8+Math.random()*0.9, settled:false,
    }))
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const p = progressRef.current;
    if (p >= 0.27) autoRot.current += delta * 0.50;
    const rotEase = easeIO(clamp((p - 0.27) / 0.10, 0, 1));
    groupRef.current.rotation.y = autoRot.current * rotEase;
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: N }, (_, i) => (
        <CrystalBead key={i} bIdx={i}
          crystal={CRYSTALS[i % CRYSTALS.length]}
          scatterRef={scatter}
          progressRef={progressRef}
          showcaseRef={showcaseRef}
        />
      ))}
      <GoldCord progressRef={progressRef} />
    </group>
  );
}

/* ── Camera — moves to different angles per phase ─────────────── */
function CameraRig({ progressRef }) {
  const lookAt = useRef(new THREE.Vector3(0, 0, 0));
  useFrame((state) => {
    const p  = progressRef.current;
    const ph = getPhase(p);

    let pos;
    if      (ph === 0) pos = CAM.fall;
    else if (ph === 1) {
      const t = clamp((p - 0.06) / 0.21, 0, 1);
      pos = [
        lerp(CAM.fall[0], CAM.form[0], easeIO(t)),
        lerp(CAM.fall[1], CAM.form[1], easeIO(t)),
        lerp(CAM.fall[2], CAM.form[2], easeIO(t)),
      ];
    }
    else if (ph === 2) pos = CAM.rot;
    else if (ph === 3) pos = CAM.rq;
    else if (ph === 4) pos = CAM.am;
    else if (ph === 5) pos = CAM.ga;
    else if (ph === 6) pos = CAM.te;
    else               pos = CAM.cta;

    state.camera.position.lerp(new THREE.Vector3(...pos), 0.028);
    state.camera.lookAt(lookAt.current);
  });
  return null;
}

/* ── Full scene ───────────────────────────────────────────────── */
function Scene({ progressRef, showcaseRef }) {
  return (
    <>
      <SceneSetup />
      <Suspense fallback={null}>
        <Environment preset="studio" background={false} />
      </Suspense>

      {/* Cinematic lighting — 6 lights (down from 11) */}
      <ambientLight intensity={0.12} color="#FFF8F0" />
      {/* Warm key */}
      <directionalLight position={[-3, 7, 4]}  intensity={3.5} color="#FFF8E2" castShadow
        shadow-mapSize={[512,512]} shadow-bias={-0.001} />
      {/* Cool fill */}
      <directionalLight position={[4, 2, -2]}  intensity={0.6} color="#A0B4FF" />
      {/* Gold rim */}
      <pointLight position={[0, 6, -5]}  intensity={8}   color="#C9A84C" distance={14} />
      {/* Overhead jewelry spot */}
      <spotLight position={[0, 5, 2]} intensity={28} color="#FFFAF5"
        angle={0.22} penumbra={0.65} castShadow={false} />
      {/* Warm side fill */}
      <pointLight position={[1.5, 2, 2.5]}  intensity={6} color="#FFE8C0" distance={6} />

      <BraceletGroup progressRef={progressRef} showcaseRef={showcaseRef} />
      <Sparkles count={55} scale={[5,3,5]} size={1.2} speed={0.18} color="#C9A84C" opacity={0.28} noise={0.8} />
      <CameraRig progressRef={progressRef} />
    </>
  );
}

/* ── Main export ──────────────────────────────────────────────── */
export function CrystalStorySection() {
  const sectionRef  = useRef(null);
  const progressRef = useRef(0);
  const showcaseRef = useRef(-1);
  const [phase, setPhase] = useState(0);
  const [wordsUnlocked, setWordsUnlocked] = useState(0);

  const particles = useMemo(() => Array.from({ length: 22 }, () => ({
    left:     `${5 + Math.random()*88}%`,
    top:      `${5 + Math.random()*88}%`,
    size:     `${0.8 + Math.random()*2}px`,
    opacity:   0.08 + Math.random()*0.22,
    dur:      `${5 + Math.random()*6}s`,
    delay:    `${Math.random()*6}s`,
  })), []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = sectionRef.current;
    if (!el) return;
    let lastPh = -1;
    const st = ScrollTrigger.create({
      trigger: el, start:'top top', end:'bottom bottom',
      onUpdate(self) {
        const p  = self.progress;
        const ph = getPhase(p);
        progressRef.current = p;
        showcaseRef.current = getShowcaseIdx(ph);
        // Only trigger React re-renders when the phase actually changes
        if (ph !== lastPh) {
          lastPh = ph;
          setPhase(ph);
          setWordsUnlocked(ph >= 6 ? 4 : ph >= 5 ? 3 : ph >= 4 ? 2 : ph >= 3 ? 1 : 0);
        }
      },
    });
    return () => st.kill();
  }, []);

  const si    = getShowcaseIdx(phase);
  const sd    = si >= 0 ? SHOWCASE[si] : null;
  const isCTA = phase === 7;

  return (
    <div ref={sectionRef} style={{ height:'580vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden"
           style={{ background:'#F4E4D1' }}>

        {/* Canvas */}
        <div className="absolute inset-0">
          <Canvas shadows dpr={[1,1]} camera={{ position:[0,1.2,5.5], fov:46 }}
                  gl={{ antialias:true, alpha:false }}>
            <Suspense fallback={null}>
              <Scene progressRef={progressRef} showcaseRef={showcaseRef} />
            </Suspense>
          </Canvas>
        </div>

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background:'radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(200,168,120,0.22) 100%)' }} />

        {/* Star-dust particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((pt, i) => (
            <div key={i} className="absolute rounded-full"
              style={{ left:pt.left, top:pt.top, width:pt.size, height:pt.size,
                       background:'#A88530', opacity:pt.opacity,
                       animation:`cspt ${pt.dur} ease-in-out infinite`,
                       animationDelay:pt.delay }} />
          ))}
        </div>

        {/* Corner energy words — desktop only, unlock progressively with each crystal ── */}
        <div className="hidden lg:block absolute inset-0 pointer-events-none">
          {[
            { word:'LOVE',     color:'#D07888', style:{ top:'11%',   left:0,  width:'44%', textAlign:'center' } },
            { word:'CLARITY',  color:'#7B2FA0', style:{ top:'11%',   right:0, width:'44%', textAlign:'center' } },
            { word:'LUCK',     color:'#2A8040', style:{ bottom:'9%', left:0,  width:'44%', textAlign:'center' } },
            { word:'STRENGTH', color:'#8A5C00', style:{ bottom:'9%', right:0, width:'44%', textAlign:'center' } },
          ].map((w, i) => wordsUnlocked > i && (
            <motion.div key={w.word}
              initial={{opacity:0}} animate={{opacity:0.13}}
              transition={{duration:1.2, ease:'easeOut'}}
              className="absolute font-black select-none"
              style={{ ...w.style, fontSize:'clamp(4rem,8vw,8rem)', lineHeight:1,
                       color:w.color, letterSpacing:'-0.03em', userSelect:'none' }}>
              {w.word}
            </motion.div>
          ))}
        </div>

        {/* ── Overlays ─────────────────────────────────────────── */}

        {/* Phases 1-2: subtle top label only — no big card */}
        <AnimatePresence>
          {phase >= 1 && phase <= 2 && (
            <motion.div key={`top-${phase}`}
              initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
              exit={{opacity:0,y:-10}} transition={{duration:0.45}}
              className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-none text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.26em]"
                 style={{ color:'rgba(201,168,76,0.70)' }}>
                {phase === 1 ? 'Bhaktijyot Crystal Collection' : 'Crafted With Purpose'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">

          {/* Crystal showcase — LEFT name box + RIGHT rich info box */}
          {sd && !isCTA && (
            <motion.div key={`showcase-${phase}`}
              initial={{opacity:0}} animate={{opacity:1}}
              exit={{opacity:0}} transition={{duration:0.55}}
              className="absolute inset-0 pointer-events-none">

              {/* ── LEFT: Crystal NAME box — desktop only ── */}
              <div className="hidden lg:flex absolute left-0 top-0 bottom-0 items-center pointer-events-auto"
                   style={{ width:'27%', padding:'0 3% 0 4%' }}>
                <motion.div
                  initial={{opacity:0, x:-32}} animate={{opacity:1, x:0}}
                  transition={{duration:0.5, ease:'easeOut', delay:0.05}}
                  className="w-full"
                >
                  {/* Label */}
                  <p className="text-[10px] font-black uppercase tracking-[0.26em]"
                     style={{ color:'rgba(28,18,9,0.38)' }}>
                    Crystal Collection
                  </p>

                  {/* Accent bar */}
                  <div className="mt-3 mb-5 h-[3px] w-12 rounded-full"
                       style={{ background: sd.accent, boxShadow:`0 0 10px ${sd.accent}88` }} />

                  {/* Large crystal name */}
                  <h2 className="font-display font-black"
                      style={{
                        fontSize: 'clamp(2.4rem, 4vw, 3.6rem)',
                        lineHeight: 1.0,
                        color: '#1C1209',
                        letterSpacing: '-0.01em',
                      }}>
                    {sd.rightName}
                  </h2>

                  {/* Subtle underline */}
                  <div className="mt-5 h-px"
                       style={{ background:`linear-gradient(to right, ${sd.accent}60, transparent)` }} />
                </motion.div>
              </div>

              {/* ── RIGHT: Rich information box — desktop only ── */}
              <div className="hidden lg:flex absolute right-0 top-0 bottom-0 items-center pointer-events-auto"
                   style={{ width:'29%', padding:'0 4% 0 1%' }}>
                <motion.div
                  initial={{opacity:0, x:32}} animate={{opacity:1, x:0}}
                  transition={{duration:0.5, ease:'easeOut', delay:0.05}}
                  className="w-full rounded-3xl overflow-hidden relative"
                  style={{
                    background:`linear-gradient(145deg, rgba(22,12,4,0.94) 0%, rgba(28,18,9,0.88) 60%, rgba(28,18,9,0.92) 100%)`,
                    backdropFilter: 'blur(22px)',
                    border: `1.5px solid ${sd.accent}50`,
                    boxShadow: `0 20px 60px rgba(0,0,0,0.55), 0 0 40px ${sd.accent}20, inset 0 1px 0 ${sd.accent}35`,
                  }}
                >
                  {/* Decorative glow blob — top-right corner */}
                  <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full pointer-events-none"
                       style={{ background: sd.accent, filter:'blur(40px)', opacity:0.22 }} />
                  {/* Bottom-left subtle glow */}
                  <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full pointer-events-none"
                       style={{ background: sd.accent, filter:'blur(30px)', opacity:0.10 }} />

                  {/* Inner content */}
                  <div className="relative z-10 p-6">

                    {/* Brand row */}
                    <div className="flex items-center gap-2 mb-5">
                      <div className="h-3.5 w-3.5 rounded-full shrink-0"
                           style={{ background:sd.accent, boxShadow:`0 0 14px ${sd.accent}CC` }} />
                      <span className="text-[10px] font-black uppercase tracking-[0.26em]"
                            style={{ color:sd.accent }}>Bhaktijyot</span>
                    </div>

                    {/* Property chips */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {sd.rightLine1.split(/\s*·\s*/).map(prop => prop.trim()).filter(Boolean).map((prop, i) => (
                        <span key={i}
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.10em]"
                          style={{
                            background: `${sd.accent}22`,
                            color: sd.accent,
                            border: `1px solid ${sd.accent}45`,
                          }}>
                          {prop}
                        </span>
                      ))}
                    </div>

                    {/* Story text */}
                    <p className="text-[12.5px] leading-relaxed"
                       style={{ color:'rgba(244,228,209,0.72)', fontStyle:'italic', fontFamily:'Georgia, serif' }}>
                      {sd.leftStory}
                    </p>

                    {/* Decorative centre divider */}
                    <div className="my-4 flex items-center gap-2">
                      <div className="flex-1 h-px" style={{ background:`linear-gradient(to right, transparent, ${sd.accent}40)` }} />
                      <div className="h-1 w-1 rounded-full" style={{ background:`${sd.accent}60` }} />
                      <div className="flex-1 h-px" style={{ background:`linear-gradient(to left, transparent, ${sd.accent}40)` }} />
                    </div>

                    {/* Line 2 descriptor */}
                    <p className="text-[11px] text-center"
                       style={{ color:'rgba(244,228,209,0.42)', letterSpacing:'0.06em' }}>
                      {sd.rightLine2}
                    </p>

                    {/* Shop button — gradient + glow */}
                    <Link
                      to={`/products?world=crystals&q=${sd.rightName.toLowerCase().replace(/\s+/g,'-')}`}
                      className="mt-5 flex items-center justify-center gap-2 w-full py-3 font-black uppercase tracking-[0.16em] text-[11px] rounded-xl transition-all hover:scale-[1.03] hover:brightness-110 active:scale-[0.98]"
                      style={{
                        background: `linear-gradient(135deg, ${sd.accent} 0%, ${sd.accent}CC 100%)`,
                        color: '#1C1209',
                        boxShadow: `0 6px 28px ${sd.accent}55, inset 0 1px 0 rgba(255,255,255,0.25)`,
                      }}
                    >
                      ✦ Shop {sd.rightName}
                    </Link>
                  </div>
                </motion.div>
              </div>

              {/* ── MOBILE: Crystal name — top, centered ── */}
              <div className="lg:hidden absolute top-20 left-4 right-4 pointer-events-none flex flex-col items-center text-center">
                <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} transition={{duration:0.45}}
                  className="flex flex-col items-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.26em]"
                     style={{color:'rgba(28,18,9,0.38)'}}>Crystal Collection</p>
                  <div className="mt-2 h-[2.5px] w-8 rounded-full"
                       style={{background:sd.accent,boxShadow:`0 0 8px ${sd.accent}88`}} />
                  <h2 className="mt-2 font-display font-black leading-none text-center"
                      style={{fontSize:'clamp(1.9rem,8vw,2.6rem)',color:'#1C1209'}}>
                    {sd.rightName}
                  </h2>
                </motion.div>
              </div>

              {/* ── MOBILE: Bottom info card ── */}
              <div className="lg:hidden absolute bottom-4 left-4 right-4 pointer-events-auto">
                <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.45,delay:0.1}}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background:'linear-gradient(145deg,rgba(22,12,4,0.94) 0%,rgba(28,18,9,0.90) 100%)',
                    border:`1.5px solid ${sd.accent}50`,
                    boxShadow:`0 8px 32px rgba(0,0,0,0.45),0 0 24px ${sd.accent}18`,
                  }}>
                  <div className="p-4">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {sd.rightLine1.split(/\s*·\s*/).map(prop => prop.trim()).filter(Boolean).map((prop, i) => (
                        <span key={i}
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.10em]"
                          style={{background:`${sd.accent}22`,color:sd.accent,border:`1px solid ${sd.accent}45`}}>
                          {prop}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] mb-3"
                       style={{color:'rgba(244,228,209,0.50)',letterSpacing:'0.05em'}}>
                      {sd.rightLine2}
                    </p>
                    <Link
                      to={`/products?world=crystals&q=${sd.rightName.toLowerCase().replace(/\s+/g,'-')}`}
                      className="flex items-center justify-center gap-2 w-full py-2.5 font-black uppercase tracking-[0.14em] text-[11px] rounded-xl"
                      style={{
                        background:`linear-gradient(135deg,${sd.accent} 0%,${sd.accent}CC 100%)`,
                        color:'#1C1209',
                        boxShadow:`0 4px 16px ${sd.accent}50`,
                      }}>
                      ✦ Shop {sd.rightName}
                    </Link>
                  </div>
                </motion.div>
              </div>

            </motion.div>
          )}

          {/* ── Phase 7: THE CONVERGENCE — all 3 concepts layered ───── */}
          {isCTA && (
            <motion.div key="convergence"
              initial={{opacity:0}} animate={{opacity:1}}
              exit={{opacity:0}} transition={{duration:1.0}}
              className="absolute inset-0 pointer-events-none overflow-hidden">

              {/* ── LAYER 2: Crystal ripple rings from centre ──────── */}
              {['#D07888','#7B2FA0','#2A8040','#8A5C00'].map((color, i) => (
                <div key={color}
                  className="absolute rounded-full"
                  style={{
                    left:'50%', top:'50%',
                    transform:'translate(-50%,-50%)',
                    width:180, height:180,
                    border:`1.5px solid ${color}`,
                    boxShadow:`0 0 18px ${color}40`,
                    animation:`crystal-ripple 3.4s ease-out ${i * 0.85}s infinite`,
                  }}
                />
              ))}

              {/* ── LAYER 4: Bottom editorial CTA ───────────────────── */}
              <motion.div
                initial={{opacity:0, y:20}} animate={{opacity:1, y:0}}
                transition={{delay:0.7, duration:0.7, ease:'easeOut'}}
                className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-3 pointer-events-auto">

                <p className="font-display font-bold uppercase"
                   style={{ fontSize:'clamp(1.4rem,3vw,2.2rem)', letterSpacing:'0.32em', color:'rgba(28,18,9,0.38)' }}>
                  Bhaktijyot
                </p>

                <div className="flex items-center gap-3">
                  <div className="h-px w-16" style={{ background:'rgba(201,168,76,0.28)' }} />
                  <motion.div
                    animate={{ scale:[1,1.6,1], opacity:[0.55,1,0.55] }}
                    transition={{ repeat:Infinity, duration:2.0, ease:'easeInOut' }}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background:'#C9A84C', boxShadow:'0 0 10px #C9A84C' }}
                  />
                  <div className="h-px w-16" style={{ background:'rgba(201,168,76,0.28)' }} />
                </div>

                <Link to="/products?world=crystals"
                  className="group flex flex-wrap items-center justify-center gap-2 font-black uppercase tracking-[0.18em] text-sm text-center"
                  style={{ color:'#1C1209' }}>
                  <span style={{ color:'#C9A84C' }}>✦</span>
                  <span>Explore Crystal Collection</span>
                  <span className="opacity-35 group-hover:opacity-100 group-hover:translate-x-2 transition-all inline-block"
                        style={{ color:'#C9A84C' }}>→</span>
                </Link>

                <div className="h-px w-52"
                     style={{ background:'linear-gradient(to right,transparent,rgba(28,18,9,0.16),transparent)' }} />
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* 360° badge during phase 2 */}
        <AnimatePresence>
          {phase === 2 && (
            <motion.div key="badge"
              initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}}
              exit={{opacity:0,scale:0.8}} transition={{duration:0.4}}
              className="absolute top-8 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full pointer-events-none"
              style={{ background:'rgba(28,18,9,0.80)', backdropFilter:'blur(10px)',
                       border:'1px solid rgba(201,168,76,0.32)' }}>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]"
                    style={{ color:'#C9A84C' }}>360° View</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase dots — right side (desktop only) */}
        <div className="hidden lg:flex absolute right-5 top-1/2 -translate-y-1/2 flex-col gap-2.5">
          {Array.from({length:8},(_,i) => (
            <div key={i} className="rounded-full transition-all duration-400"
              style={{ width:phase===i?'5px':'3px', height:phase===i?'20px':'9px',
                       background:phase===i?'#C9A84C':'rgba(255,245,230,.16)' }} />
          ))}
        </div>

        {/* Scroll hint */}
        {phase === 0 && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.2}}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[.2em]"
                  style={{color:'rgba(244,228,209,.30)'}}>Scroll to Discover</span>
            <div className="w-5 h-8 rounded-full flex items-start justify-center pt-1.5"
                 style={{border:'1.5px solid rgba(201,168,76,.35)'}}>
              <motion.div animate={{y:[0,12,0]}} transition={{repeat:Infinity,duration:1.4,ease:'easeInOut'}}
                className="w-1 h-2 rounded-full" style={{background:'#C9A84C'}} />
            </div>
          </motion.div>
        )}

        <div className="absolute top-0 left-0 right-0 h-px"
             style={{background:'linear-gradient(to right,transparent,rgba(201,168,76,.45),transparent)'}} />
      </div>

      <style>{`
        @keyframes cspt {
          0%,100%{transform:translateY(0) scale(1);}
          50%{transform:translateY(-14px) scale(1.5);}
        }
        @keyframes crystal-ripple {
          0%   { transform:translate(-50%,-50%) scale(0.3); opacity:0.55; }
          100% { transform:translate(-50%,-50%) scale(4.2); opacity:0; }
        }
        @keyframes fol-spin {
          from { transform:rotate(0deg); }
          to   { transform:rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
