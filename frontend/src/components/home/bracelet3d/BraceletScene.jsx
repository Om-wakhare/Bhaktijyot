import { Suspense, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
// Self-hosted copy of drei's "studio" HDRI — no runtime fetch from a third-party CDN
import studioHdr from '../../../assets/hdri/studio_small_03_1k.hdr';
import { Bracelet } from './Bracelet';
import { formProgress, getPhase } from './phases';

const BACKDROP = '#F4E4D1'; // matches the page's cream background

/* Camera positions per phase */
const CAM = {
  fall: [0, 1.2, 5.5],
  form: [0, 2.5, 4.8],
  rot: [0, 3.6, 3.2],    // 360° intro
  s1: [0.2, 3.8, 3.2],   // showcase 1 — top-front
  s2: [4.2, 2.2, 2.5],   // showcase 2 — right side
  s3: [0.5, 5.6, 1.2],   // showcase 3 — near top-down (reads as a true circle)
  s4: [-4.2, 2.2, 2.5],  // showcase 4 — left side
  cta: [0, 1.2, 4.2],    // eye-level product shot
};

function RendererSetup() {
  const { gl } = useThree();
  useEffect(() => {
    // Khronos PBR Neutral: keeps product colours true (ACES shifts/desaturates gem hues)
    gl.toneMapping = THREE.NeutralToneMapping;
    gl.toneMappingExposure = 1.0;
  }, [gl]);
  return <color attach="background" args={[BACKDROP]} />;
}

/* Studio lighting: soft HDRI + rectangular softboxes, as in jewellery photography.
 * The softboxes give beads clean window-shaped reflections instead of CG point highlights. */
function StudioLighting() {
  const face = (self) => self.lookAt(0, 0, 0);
  return (
    <>
      <Suspense fallback={null}>
        <Environment files={studioHdr} resolution={512} environmentIntensity={0.9}>
          {/* Large overhead softbox */}
          <Lightformer form="rect" intensity={1.6} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[5, 5, 1]} />
          {/* Key softbox, front-left */}
          <Lightformer form="rect" intensity={2.4} position={[-3, 2.2, 3]} scale={[2.6, 1.6, 1]} onUpdate={face} />
          {/* Narrow strip light, back-right — defines the bead edges */}
          <Lightformer form="rect" intensity={1.1} position={[3.5, 1.2, -1.8]} scale={[1.2, 3.2, 1]} onUpdate={face} />
          {/* Warm bounce from the cream tabletop */}
          <Lightformer form="rect" color={BACKDROP} intensity={0.45} position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[9, 9, 1]} />
        </Environment>
      </Suspense>
      {/* One soft key for a single crisp specular point per bead */}
      <directionalLight position={[-2.5, 5, 3.5]} intensity={1.1} color="#FFF4E6" />
    </>
  );
}

const _target = new THREE.Vector3();
const _origin = new THREE.Vector3(0, 0, 0);

function CameraRig({ progressRef }) {
  useFrame((state, delta) => {
    const p = progressRef.current;
    const ph = getPhase(p);
    let pos;
    if (ph === 0) pos = CAM.fall;
    else if (ph === 1) {
      const t = formProgress(p);
      _target.set(
        CAM.fall[0] + (CAM.form[0] - CAM.fall[0]) * t,
        CAM.fall[1] + (CAM.form[1] - CAM.fall[1]) * t,
        CAM.fall[2] + (CAM.form[2] - CAM.fall[2]) * t,
      );
    } else pos = [CAM.rot, CAM.s1, CAM.s2, CAM.s3, CAM.s4, CAM.cta][ph - 2];
    if (pos) _target.set(pos[0], pos[1], pos[2]);
    const k = 1 - Math.pow(0.18, Math.min(delta, 0.05)); // smooth, frame-rate independent
    state.camera.position.lerp(_target, k);
    state.camera.lookAt(_origin);
  });
  return null;
}

export function BraceletScene({ progressRef, showcaseRef, showcaseStones }) {
  return (
    <>
      <RendererSetup />
      <StudioLighting />
      <Bracelet progressRef={progressRef} showcaseRef={showcaseRef} showcaseStones={showcaseStones} />
      <CameraRig progressRef={progressRef} />
    </>
  );
}
