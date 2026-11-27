import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { useGSAP } from '@gsap/react';
import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import { MODEL_COMPONENTS } from './models';
import { resolveModel } from './modelSpec';

gsap.registerPlugin(Draggable, InertiaPlugin, useGSAP);

/*
 * 360° product preview.
 * three.js (via react-three-fiber) draws the procedural model; GSAP drives the
 * motion: the turntable speed (eased in and out), drag-to-spin with momentum
 * (Draggable + InertiaPlugin), arrow-key steps and the intro reveal.
 */

const AUTO_SPEED = 0.5;      // rad/s turntable speed
const DRAG_RATIO = 0.011;    // rad per dragged pixel
// The model's largest side after fitting, in world units (gems look best with room around them)
const FIT_SIZE = { gemstone: 1.55, default: 1.9 };

// How each shape faces the camera (outer group tilt, radians). Gems are shown
// looking down at the table, the way jewellery is photographed.
const BASE_TILT = { bracelet: 0.62, mala: 0.04, gemstone: 0.95, crystal: 0.08, raw: 0.18 };
// Solid backdrop: transparent gems need something behind them to refract
const BACKDROP = '#F6ECE0';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Renderer() {
  const { gl, camera } = useThree();
  useEffect(() => {
    // Neutral tone mapping keeps gem colours true (ACES shifts hues)
    gl.toneMapping = THREE.NeutralToneMapping;
    gl.toneMappingExposure = 1.0;
    camera.lookAt(0, -0.05, 0);
  }, [gl, camera]);
  return null;
}

/* Studio lighting built from light panels only: no HDR download on the product page */
function Studio() {
  const face = (self) => self.lookAt(0, 0, 0);
  return (
    <>
      {/* Dark surroundings + bright softboxes: what makes facets and polish sparkle
          (only the reflections see this; the visible backdrop stays light) */}
      <Environment resolution={256} environmentIntensity={1}>
        <color attach="background" args={['#3B2F25']} />
        <Lightformer form="rect" intensity={2.6} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[5, 5, 1]} />
        <Lightformer form="rect" intensity={4} position={[-3, 2, 3]} scale={[2.6, 1.6, 1]} onUpdate={face} />
        <Lightformer form="rect" intensity={2.2} position={[3.4, 1.4, -1.6]} scale={[1.2, 3.2, 1]} onUpdate={face} />
        <Lightformer form="ring" intensity={2.4} position={[2.5, 3, 3]} scale={1.1} onUpdate={face} />
        <Lightformer form="rect" intensity={1.2} position={[-3.5, 0.5, -2.5]} scale={[0.6, 2.6, 1]} onUpdate={face} />
        <Lightformer form="rect" color="#F4E4D1" intensity={0.8} position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} />
      </Environment>
      <color attach="background" args={[BACKDROP]} />
      <directionalLight position={[-2.5, 5, 3.5]} intensity={1.2} color="#FFF4E6" />
      <ambientLight intensity={0.15} />
    </>
  );
}

/* Centres the model and scales it so every shape fills the frame the same way.
 * Measured in the group's own space, so the turntable's rotation never affects it. */
function Fit({ fitKey, size, children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    g.scale.setScalar(1);
    g.position.set(0, 0, 0);
    g.updateWorldMatrix(true, true);
    const toLocal = g.matrixWorld.clone().invert();
    const m = new THREE.Matrix4();
    const box = new THREE.Box3();
    g.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      box.union(o.geometry.boundingBox.clone().applyMatrix4(m.multiplyMatrices(toLocal, o.matrixWorld)));
    });
    if (box.isEmpty()) return;
    const dims = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = size / Math.max(dims.x, dims.y, dims.z, 1e-3);
    g.scale.setScalar(s);
    g.position.copy(center.multiplyScalar(-s));
  }, [fitKey, size]);
  return <group ref={ref}>{children}</group>;
}

/* Applies the GSAP-driven numbers to the scene every frame */
function Turntable({ spin, children }) {
  const tilt = useRef(null);
  const turn = useRef(null);
  useFrame((_, delta) => {
    const s = spin.current;
    s.angle += s.speed * Math.min(delta, 0.05);
    if (turn.current) turn.current.rotation.y = s.angle;
    if (tilt.current) {
      tilt.current.rotation.x = s.tilt;
      tilt.current.scale.setScalar(s.scale);
    }
  });
  return (
    <group ref={tilt}>
      <group ref={turn}>{children}</group>
    </group>
  );
}

export default function ProductModelViewer({ product, spec: specProp, className = '', label }) {
  const specKey = JSON.stringify(specProp || [
    product?.id, product?.name, product?.model_type, product?.model_colors, product?.category?.name,
  ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const spec = useMemo(() => specProp || resolveModel(product), [specKey]);
  const Model = MODEL_COMPONENTS[spec.type];
  const baseTilt = BASE_TILT[spec.type] ?? 0.2;

  const wrapRef = useRef(null);
  const proxyRef = useRef(null);
  const spin = useRef({ angle: 0, tilt: baseTilt, speed: 0, scale: 1 });
  const autoRef = useRef(true);
  const resumeRef = useRef(null);
  const [auto, setAuto] = useState(true);
  const [touched, setTouched] = useState(false);
  const [inView, setInView] = useState(true);
  const reduced = useMemo(prefersReducedMotion, []);

  // The "Drag to turn" hint fades out on its own after a few seconds
  useEffect(() => {
    const t = window.setTimeout(() => setTouched(true), 4500);
    return () => window.clearTimeout(t);
  }, []);

  // Stop rendering while the viewer is scrolled out of sight (battery, data)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const { contextSafe } = useGSAP(() => {
    const s = spin.current;
    s.tilt = baseTilt;
    if (reduced) {
      s.angle = -0.5;
      s.scale = 1;
      s.speed = 0;
    } else {
      gsap.timeline()
        .fromTo(s, { angle: -1.6, scale: 0.86 }, { angle: -0.4, scale: 1, duration: 1.4, ease: 'power3.out' })
        .to(s, { speed: autoRef.current ? AUTO_SPEED : 0, duration: 1.2, ease: 'sine.inOut' }, '-=0.4');
    }

    let a0 = 0;
    let x0 = 0;
    let y0 = 0;
    let t0 = 0;
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    const follow = function follow() {
      s.angle = a0 + (this.x - x0) * DRAG_RATIO;
      if (!coarse) s.tilt = gsap.utils.clamp(baseTilt - 0.55, baseTilt + 0.55, t0 + (this.y - y0) * 0.006);
    };
    const settle = () => resumeSoon();
    const [drag] = Draggable.create(proxyRef.current, {
      // Phones: horizontal drag only, so a vertical swipe still scrolls the page
      type: coarse ? 'x' : 'x,y',
      trigger: wrapRef.current,
      inertia: true,
      allowNativeTouchScrolling: true,
      cursor: 'grab',
      activeCursor: 'grabbing',
      onPress() {
        resumeRef.current?.kill();
        gsap.killTweensOf(s, 'speed,angle');
        s.speed = 0;
        a0 = s.angle; x0 = this.x; y0 = this.y; t0 = s.tilt;
        setTouched(true);
      },
      onDrag: follow,
      onThrowUpdate: follow,
      onRelease() { if (!this.tween) settle(); },
      onThrowComplete: settle,
    });

    return () => {
      resumeRef.current?.kill();
      drag?.kill();
    };
  }, { scope: wrapRef, dependencies: [specKey, reduced] });

  // After the shopper stops interacting, ease back into the turntable spin
  function resumeSoon() {
    resumeRef.current?.kill();
    if (!autoRef.current || reduced) return;
    resumeRef.current = gsap.delayedCall(2.2, () =>
      gsap.to(spin.current, { speed: AUTO_SPEED, duration: 1.4, ease: 'sine.inOut' }));
  }

  const step = contextSafe((dir) => {
    const s = spin.current;
    resumeRef.current?.kill();
    gsap.killTweensOf(s, 'speed');
    s.speed = 0;
    setTouched(true);
    gsap.to(s, {
      angle: `+=${dir * (Math.PI / 4)}`, duration: reduced ? 0 : 0.55, ease: 'power2.out',
      onComplete: resumeSoon,
    });
  });

  const tiltBy = contextSafe((d) => {
    const s = spin.current;
    gsap.to(s, {
      tilt: gsap.utils.clamp(baseTilt - 0.55, baseTilt + 0.55, s.tilt + d),
      duration: reduced ? 0 : 0.35, ease: 'power2.out',
    });
  });

  const toggleAuto = contextSafe(() => {
    const next = !autoRef.current;
    autoRef.current = next;
    setAuto(next);
    resumeRef.current?.kill();
    gsap.to(spin.current, { speed: next && !reduced ? AUTO_SPEED : 0, duration: next ? 1 : 0.3, ease: 'sine.inOut' });
  });

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); tiltBy(-0.15); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); tiltBy(0.15); }
    else if (e.key === ' ') { e.preventDefault(); toggleAuto(); }
  };

  if (!Model) return null;
  const name = label || product?.name || 'product';

  return (
    <div
      ref={wrapRef}
      className={`relative h-full w-full select-none overflow-hidden rounded-[inherit] bg-[#F6ECE0] outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${className}`}
      tabIndex={0}
      role="group"
      aria-roledescription="3D viewer"
      aria-label={`3D preview of ${name}. Drag, or use the left and right arrow keys, to turn it. Space pauses the spin.`}
      onKeyDown={onKeyDown}
    >
      <Canvas
        frameloop={inView ? 'always' : 'never'}
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.35, 4.6], fov: 30 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        aria-hidden="true"
      >
        <Renderer />
        <Studio />
        <Turntable spin={spin}>
          <Fit fitKey={specKey} size={FIT_SIZE[spec.type] ?? FIT_SIZE.default}>
            <Model look={spec.look} variant={spec.variant} />
          </Fit>
        </Turntable>
        <ContactShadows position={[0, -1.15, 0]} opacity={0.32} scale={5} blur={2.6} far={2.2} resolution={256} color="#4A321C" />
      </Canvas>

      {/* Invisible element GSAP Draggable moves; its x/y drive the rotation */}
      <div ref={proxyRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0" />

      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-espresso shadow-sm backdrop-blur">
        <span aria-hidden="true">360°</span> 3D preview
      </div>

      {!touched && (
        <span className="pointer-events-none absolute bottom-4 left-3 rounded-full bg-espresso/75 px-3 py-1 text-xs font-medium text-white">
          Drag to turn
        </span>
      )}

      <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
        <ViewerButton label="Turn left" onClick={() => step(-1)}><RotateCcw className="h-4 w-4" /></ViewerButton>
        <ViewerButton label={auto ? 'Pause spinning' : 'Start spinning'} onClick={toggleAuto} pressed={auto}>
          {auto ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </ViewerButton>
        <ViewerButton label="Turn right" onClick={() => step(1)}><RotateCw className="h-4 w-4" /></ViewerButton>
      </div>
    </div>
  );
}

function ViewerButton({ label, onClick, pressed, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-espresso shadow-sm backdrop-blur transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {children}
    </button>
  );
}
