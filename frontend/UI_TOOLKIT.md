# Bhaktijyot UI toolkit

Set up 2026-11-25 on branch `feat/ui-toolkit`. Read this before adding UI components.

**Stack:** React 18.3 · Vite 5 · **Tailwind CSS 3.4** · plain JavaScript (`.jsx`, no TypeScript) · React Router 6.
This is **not** Next.js and **not** Tailwind v4 — most "latest" docs online assume both.

---

## Golden rules

1. **Always use `shadcn@2.3.0`**, never `shadcn@latest`, and never run `shadcn init` (it would overwrite `tailwind.config.js` and `index.css`). The Tailwind v3 CLI is 2.3.0.
2. **After every component install, run `git diff package.json tailwind.config.js src/styles/index.css`.**
   - The CLI re-installs dependencies declared by the component and can **replace exact version pins** (React Bits changed `gsap` from `3.15.0` to `^3.15.1` during testing). Restore pins with `npm install --save-exact <pkg>@<version>`.
   - The CLI reformats `tailwind.config.js` and strips its comments. If the values are unchanged, restore the commented version.
3. **Keep these exact pins** (they prevented earlier blank-page crashes): `three 0.163.0`, `@react-three/fiber 8.18.0`, `@react-three/drei 9.122.0`, `framer-motion 11.13.1`, `motion 11.13.1`, `gsap 3.15.0`.
4. **Tailwind v4-only syntax does nothing here** (`bg-linear-to-*`, `shadow-xs`, `rounded-xs`, `outline-hidden`, `@theme`, `oklch()`). Translate to v3 equivalents (`bg-gradient-to-*`, `shadow-sm`, …) when copying components.
5. **Brand tokens stay the source of truth.** Use `primary`, `gold`, `cream`, `espresso`, `ivory`, `font-display`. The shadcn tokens (`background`, `card`, `muted`, `accent`, `border`, `ring`…) are mapped onto that palette in `src/styles/index.css`.
6. Don't add motion for its own sake. Respect `prefers-reduced-motion` (a global rule in `index.css` already stops CSS animations; JS animations must check it themselves).

---

## Claude Code skills (`.claude/skills/`)

Loaded automatically by Claude Code when relevant. Each third-party folder has `SOURCE.md` (repo + commit) and `LICENSE` (MIT).

| Skill | Source | Use it for |
|---|---|---|
| `retailos-architect` | this project (owner's brief) | Product/engineering principles for Bhaktijyot as a retail system |
| `ui-ux-pro-max` | nextlevelbuilder/ui-ux-pro-max-skill | Design intelligence: styles, palettes, font pairings, UX rules. Its search needs **Python 3**: `python .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain product` |
| `shadcn` | shadcn-ui/ui (official) | Adding/fixing shadcn components. **Its examples say `npx shadcn@latest` — use `npx shadcn@2.3.0` in this project.** |
| `magic-ui` | magicuidesign/magicui (official) | Choosing and adding Magic UI components (use the v3 registry, below) |
| `gsap-core`, `gsap-timeline`, `gsap-react`, `gsap-scrolltrigger`, `gsap-performance`, `gsap-plugins`, `gsap-utils` | greensock/gsap-skills (official) | GSAP animation, `useGSAP`, ScrollTrigger, performance |

---

## Dependencies added

| Package | Version | Why |
|---|---|---|
| `clsx`, `tailwind-merge@2` (v2 = Tailwind v3 line), `class-variance-authority` | ^2.1.1, ^2.6.2, ^0.7.1 | `cn()` helper and variants for shadcn / registry components |
| `tailwindcss-animate` (dev) | ^1.0.7 | `animate-in`, `fade-in`, `slide-in-from-*` utilities used by shadcn |
| `@radix-ui/react-{dialog,accordion,tabs,tooltip,select,slot}` | via shadcn CLI | Accessible behaviour behind the shadcn primitives |
| `motion` | **11.13.1 exact** | Enables `import { motion } from "motion/react"` (used by Aceternity/Magic UI). Same version as `framer-motion`, so npm shares one copy — no duplicate code |
| `@gsap/react` | ^2.1.2 | `useGSAP()` hook — GSAP animations with automatic cleanup in React |
| `lenis` | ^1.3.28 | Smooth scrolling. **Installed but not switched on** (see below) |

Already present before: `gsap 3.15.0` (all plugins incl. ScrollTrigger and SplitText are free), `framer-motion 11.13.1`, `lucide-react`, `three`/R3F/drei.

Pre-existing `npm audit` advisories (10: axios, react-router, postcss, nanoid, vite/esbuild…) were **not** introduced by the toolkit; fix them separately.

---

## shadcn/ui

- Config: `components.json` (style `new-york`, `tsx: false`, aliases `@/components`, `@/components/ui`, `@/lib/utils`).
- `@` alias → `src/` (in `vite.config.js` and `jsconfig.json`).
- Installed primitives in `src/components/ui/` (lowercase files = shadcn; PascalCase = Bhaktijyot's own components):
  `button`, `dialog`, `sheet`, `accordion`, `tabs`, `tooltip`, `select`.
- Add more: `npx shadcn@2.3.0 add <name>` (e.g. `checkbox`, `radio-group`, `popover`, `skeleton`, `sonner`).

```jsx
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

<Sheet>
  <SheetTrigger asChild><Button variant="outline">Cart</Button></SheetTrigger>
  <SheetContent side="right"><SheetTitle>Your cart</SheetTitle>…</SheetContent>
</Sheet>
```

---

## Component registries (copy-in, nothing to install up front)

All go through the shadcn CLI, which converts their TypeScript to `.jsx` because `tsx: false`.

| Library | Install command | Notes |
|---|---|---|
| **React Bits** | `npx shadcn@2.3.0 add https://reactbits.dev/r/<Component>-JS-TW.json` | Always pick the **JS-TW** variant. Many use GSAP — re-check the `gsap` pin afterwards. Lands in `src/components/<Component>.jsx`. |
| **Aceternity UI** | `npx shadcn@2.3.0 add https://ui.aceternity.com/registry/<name>.json` | Some components rely on custom keyframes that the CLI does **not** add (e.g. Spotlight's `animate-spotlight`); without them the element stays invisible. Copy the keyframes from the component page into `tailwind.config.js`. |
| **Magic UI** | `npx shadcn@2.3.0 add https://v3.magicui.design/r/<name>.json` | Use the **v3** registry (`v3.magicui.design`) — the main site targets Tailwind v4. Check the component page for required keyframes. |
| **21st.dev** | Browse components; use the install command on the component page with `shadcn@latest` replaced by `shadcn@2.3.0` | Community components — review code and Tailwind version before using. |

Verified 2026-11-25: all four registries respond; test installs from React Bits and Aceternity compiled to valid JSX (then removed).

---

## Motion (framer-motion)

```jsx
import { motion, AnimatePresence } from 'motion/react'; // same library as 'framer-motion'
<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} />
```
Use **cubic-bezier arrays** for `ease` — string easings crashed this pinned version before. Use for micro-interactions (hover, press, presence); use GSAP for long scroll timelines.

## GSAP

```jsx
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(ScrollTrigger, useGSAP);

function Section() {
  const ref = useRef(null);
  useGSAP(() => {
    gsap.from('.reveal', { y: 40, opacity: 0, stagger: 0.1,
      scrollTrigger: { trigger: ref.current, start: 'top 80%' } });
  }, { scope: ref }); // reverts automatically on unmount
  return <section ref={ref}>…</section>;
}
```
Wrap in `gsap.matchMedia()` with `(prefers-reduced-motion: no-preference)` for reduced-motion users.

## Lenis (smooth scroll) — not enabled yet

Enabling it changes scrolling site-wide and must be synced with GSAP ScrollTrigger (the 3D Crystal Story section depends on ScrollTrigger). When the redesign wants it:

```jsx
import { ReactLenis, useLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';

// App root: autoRaf off so GSAP's ticker drives Lenis (one animation loop)
<ReactLenis root options={{ autoRaf: false }}><App /></ReactLenis>

// Once, inside the tree:
function LenisGsapSync() {
  const lenis = useLenis(ScrollTrigger.update);
  useEffect(() => {
    if (!lenis) return;
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => gsap.ticker.remove(tick);
  }, [lenis]);
  return null;
}
```
Skip it for users with `prefers-reduced-motion: reduce`, and test the Crystal Story section, drawers (body scroll lock) and in-page anchors after enabling.

## 21st.dev Magic MCP — not installed (needs your key)

The 21st.dev MCP lets Claude search and generate components from 21st.dev. It requires a personal API key from https://21st.dev/mcp. To set it up yourself: `npx @21st-dev/cli@latest init --client claude` (follow its prompts; keep the key out of git).
