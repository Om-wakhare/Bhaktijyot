import { useEffect, useRef, useState, Suspense, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { BraceletScene } from './bracelet3d/BraceletScene';
import { getPhase, getShowcaseIdx } from './bracelet3d/phases';

/* ── Showcase: 4 crystal types ──────────────────────────────────  */
const SHOWCASE = [
  {
    stone:      'roseQuartz',
    leftStory:  'Treasured since ancient Egypt as the stone of unconditional love, Rose Quartz carries a gentle energy that opens the heart. Each bead is hand-selected for its soft, translucent warmth.',
    rightName:  'Rose Quartz',
    rightLine1: 'Love  ·  Compassion  ·  Healing',
    rightLine2: 'Crystal of the heart chakra',
    accent:     '#D07888',
    cam:        [0.2, 3.8, 3.2],   // top-front view
  },
  {
    stone:      'amethyst',
    leftStory:  'Worn by royalty and mystics across centuries, Amethyst clears the mind and opens intuition. Its deep violet resonates with higher consciousness and inner peace.',
    rightName:  'Amethyst',
    rightLine1: 'Clarity  ·  Intuition  ·  Protection',
    rightLine2: 'Crystal of higher consciousness',
    accent:     '#7B2FA0',
    cam:        [4.2, 2.2, 2.5],   // right-side view
  },
  {
    stone:      'greenAventurine',
    leftStory:  'Green Aventurine shimmers with the rhythm of nature — a stone for new beginnings, abundance, and the quiet confidence that steady growth brings.',
    rightName:  'Green Aventurine',
    rightLine1: 'Luck  ·  Prosperity  ·  Growth',
    rightLine2: 'Stone of opportunity',
    accent:     '#2A8040',
    cam:        [0.5, 5.6, 1.2],   // near top-down (bracelet shows as true circle)
  },
  {
    stone:      'tigerEye',
    leftStory:  'Forged where ancient earth met golden light over millions of years, Tiger Eye holds dual energy — grounding you in the present while sharpening your will and vision.',
    rightName:  'Tiger Eye',
    rightLine1: 'Strength  ·  Confidence  ·  Focus',
    rightLine2: 'Stone of courage and willpower',
    accent:     '#8A5C00',
    cam:        [-4.2, 2.2, 2.5],  // left-side view
  },
];

const SHOWCASE_STONES = SHOWCASE.map((s) => s.stone);

// Render sharper on high-density screens; PerformanceMonitor drops to 1x on slow GPUs
const MAX_DPR = 1.75;
const initialDpr = () => Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, MAX_DPR);

/* ── Main export ──────────────────────────────────────────────── */
export function CrystalStorySection() {
  const sectionRef  = useRef(null);
  const progressRef = useRef(0);
  const showcaseRef = useRef(-1);
  const [phase, setPhase] = useState(0);
  const [wordsUnlocked, setWordsUnlocked] = useState(0);
  const [dpr, setDpr] = useState(initialDpr);

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
          <Canvas dpr={dpr} camera={{ position:[0,1.2,5.5], fov:46 }}
                  gl={{ antialias:true, alpha:false, powerPreference:'high-performance' }}>
            <PerformanceMonitor flipflops={3}
              onDecline={() => setDpr(1)}
              onIncline={() => setDpr(initialDpr())}
              onFallback={() => setDpr(1)} />
            <Suspense fallback={null}>
              <BraceletScene progressRef={progressRef} showcaseRef={showcaseRef}
                             showcaseStones={SHOWCASE_STONES} />
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
              transition={{duration:1.2, ease:[0,0,0.58,1]}}
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
                  transition={{duration:0.5, ease:[0,0,0.58,1], delay:0.05}}
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
                  transition={{duration:0.5, ease:[0,0,0.58,1], delay:0.05}}
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
                transition={{delay:0.7, duration:0.7, ease:[0,0,0.58,1]}}
                className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-3 pointer-events-auto">

                <p className="font-display font-bold uppercase"
                   style={{ fontSize:'clamp(1.4rem,3vw,2.2rem)', letterSpacing:'0.32em', color:'rgba(28,18,9,0.38)' }}>
                  Bhaktijyot
                </p>

                <div className="flex items-center gap-3">
                  <div className="h-px w-16" style={{ background:'rgba(201,168,76,0.28)' }} />
                  <motion.div
                    animate={{ scale:[1,1.6,1], opacity:[0.55,1,0.55] }}
                    transition={{ repeat:Infinity, duration:2.0, ease:[0.42,0,0.58,1] }}
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
              <motion.div animate={{y:[0,12,0]}} transition={{repeat:Infinity,duration:1.4,ease:[0.42,0,0.58,1]}}
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
