import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { useGSAP } from '@gsap/react';
import { Loader2, Pause, Play, RotateCcw, RotateCw } from 'lucide-react';

gsap.registerPlugin(Draggable, InertiaPlugin, useGSAP);

/*
 * "360° view" from a video of the product turning on a turntable.
 *
 * While nobody touches it the video simply loops (a smooth turn). Dragging
 * scrubs the video — left/right turns the product — with GSAP Draggable +
 * InertiaPlugin giving it momentum; buttons and arrow keys step 1/8 of a turn.
 * Seeks are coalesced (one in flight at a time) so slower phones stay responsive.
 * The server converts uploads to H.264 with frequent keyframes for smooth scrubbing.
 */

const TURN_PER_WIDTH = 1.1;   // one full turn ≈ dragging 1.1× the viewer's width
const RESUME_AFTER = 2.2;     // seconds after the last touch before it spins again

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function Spin360Video({ src, poster, label = 'this product', className = '' }) {
  const wrapRef = useRef(null);
  const videoRef = useRef(null);
  const proxyRef = useRef(null);
  const seekRef = useRef({ target: null });
  const resumeRef = useRef(null);
  const [reduced] = useState(prefersReducedMotion);
  const autoRef = useRef(!reduced);
  const [auto, setAuto] = useState(!reduced);
  const [ready, setReady] = useState(false);
  const [scrubbable, setScrubbable] = useState(false);
  const [failed, setFailed] = useState(false);
  const [touched, setTouched] = useState(false);

  const duration = () => {
    const d = videoRef.current?.duration;
    return Number.isFinite(d) && d > 0 ? d : 0;
  };

  /* Seek with wrap-around; if a seek is still running, remember only the latest target */
  const seekTo = (t) => {
    const v = videoRef.current;
    const d = duration();
    if (!v || !d) return;
    const wrapped = ((t % d) + d) % d;
    if (v.seeking) {
      seekRef.current.target = wrapped;
    } else {
      v.currentTime = wrapped;
    }
  };

  const onSeeked = () => {
    const v = videoRef.current;
    const next = seekRef.current.target;
    if (v && next != null) {
      seekRef.current.target = null;
      v.currentTime = next;
    }
  };

  const play = () => { videoRef.current?.play().catch(() => {}); };
  const pause = () => { videoRef.current?.pause(); };

  /* Some recordings (browser or screen recorders) don't store their length, so the
     browser reports Infinity and can't scrub. Seeking far ahead makes it work it out. */
  const fixingLengthRef = useRef(false);
  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    if (duration() > 0) { setScrubbable(true); return; }
    fixingLengthRef.current = true;
    v.currentTime = 1e101;
  };
  const onDurationChange = () => {
    const v = videoRef.current;
    if (!v || !fixingLengthRef.current || !(duration() > 0)) return;
    fixingLengthRef.current = false;
    v.currentTime = 0;
    setScrubbable(true);
    if (autoRef.current) play();
  };

  function resumeSoon() {
    resumeRef.current?.kill();
    if (!autoRef.current) return;
    resumeRef.current = gsap.delayedCall(RESUME_AFTER, play);
  }

  // Hide the "Drag to turn" hint after a few seconds
  useEffect(() => {
    const t = window.setTimeout(() => setTouched(true), 4500);
    return () => window.clearTimeout(t);
  }, []);

  // Pause while scrolled out of view (battery, data); resume when back
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) pause();
      else if (autoRef.current) play();
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => () => resumeRef.current?.kill(), []);

  const { contextSafe } = useGSAP(() => {
    if (!scrubbable) return undefined;
    let x0 = 0;
    let t0 = 0;
    const follow = function follow() {
      const width = wrapRef.current?.clientWidth || 300;
      seekTo(t0 + ((this.x - x0) / (width * TURN_PER_WIDTH)) * duration());
    };
    const [drag] = Draggable.create(proxyRef.current, {
      type: 'x',
      trigger: wrapRef.current,
      inertia: true,
      throwResistance: 2500, // a flick coasts a little, not whole extra turns
      maxDuration: 1.2,
      allowNativeTouchScrolling: true, // vertical swipes still scroll the page on phones
      cursor: 'grab',
      activeCursor: 'grabbing',
      onPress() {
        resumeRef.current?.kill();
        pause();
        x0 = this.x;
        t0 = videoRef.current?.currentTime || 0;
        setTouched(true);
      },
      onDrag: follow,
      onThrowUpdate: follow,
      onRelease() { if (!this.tween) resumeSoon(); },
      onThrowComplete: resumeSoon,
    });
    return () => drag?.kill();
  }, { scope: wrapRef, dependencies: [src, scrubbable] });

  const step = contextSafe((dir) => {
    const v = videoRef.current;
    const d = duration();
    if (!v || !d) return;
    resumeRef.current?.kill();
    pause();
    setTouched(true);
    const pos = { t: v.currentTime };
    gsap.to(pos, {
      t: pos.t + (dir * d) / 8,
      duration: reduced ? 0 : 0.5,
      ease: 'power2.out',
      onUpdate: () => seekTo(pos.t),
      onComplete: resumeSoon,
    });
  });

  const toggleAuto = () => {
    const next = !autoRef.current;
    autoRef.current = next;
    setAuto(next);
    resumeRef.current?.kill();
    if (next) play(); else pause();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === ' ') { e.preventDefault(); toggleAuto(); }
  };

  if (failed) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-ivory p-6 text-center text-sm text-espresso/70 ${className}`}>
        This video can&apos;t play on this device. The photos show the product.
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={`relative h-full w-full select-none overflow-hidden bg-white outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${className}`}
      tabIndex={0}
      role="group"
      aria-roledescription="360° viewer"
      aria-label={`360° view of ${label}. Drag, or use the left and right arrow keys, to turn it. Space pauses the spin.`}
      onKeyDown={onKeyDown}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        className="pointer-events-none h-full w-full object-contain"
        muted
        loop
        playsInline
        autoPlay={!reduced}
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        aria-hidden="true"
        onLoadedMetadata={onLoadedMetadata}
        onDurationChange={onDurationChange}
        onCanPlay={() => setReady(true)}
        onSeeked={onSeeked}
        onError={() => setFailed(true)}
      />

      {/* Invisible element GSAP Draggable moves; its x drives the video position */}
      <div ref={proxyRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0" />

      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-espresso shadow-sm">
        360° view
      </span>

      {!ready && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-espresso shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading 360° view…
          </span>
        </span>
      )}

      {ready && scrubbable && !touched && (
        <span className="pointer-events-none absolute bottom-4 left-3 rounded-full bg-espresso/75 px-3 py-1 text-xs font-medium text-white">
          Drag to turn
        </span>
      )}

      {scrubbable && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
          <ViewerButton label="Turn left" onClick={() => step(-1)}><RotateCcw className="h-4 w-4" /></ViewerButton>
          <ViewerButton label={auto ? 'Pause spinning' : 'Start spinning'} onClick={toggleAuto} pressed={auto}>
            {auto ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </ViewerButton>
          <ViewerButton label="Turn right" onClick={() => step(1)}><RotateCw className="h-4 w-4" /></ViewerButton>
        </div>
      )}
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
