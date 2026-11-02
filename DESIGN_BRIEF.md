# Toolshed — Design Brief

> Put this file in the repo root. Give it to Claude Code before each milestone:
> "Read DESIGN_BRIEF.md and follow it. Do milestone M_ only, then stop."

## 1. Concept: the rotating pegboard

Toolshed is a workshop wall. The landing page is a scrollytelling sequence:

1. **Intro (100vh):** big title "Toolshed", one-line pitch, pegboard dot grid in the background, a "scroll" hint.
2. **The ring (pinned, ~400vh of scroll):** the 15 categories are "windows" (panels) arranged in a 3D ring around the viewer. Scrolling rotates the ring. The panel facing the front is highlighted (full opacity, accent border, category name + tool count + 3 sample tool names). Side panels are dimmed and angled away.
3. **Click a panel → "go in":** the panel expands to fill the screen and becomes that category's directory view (cards, search, filters). Back button / Esc returns to the ring at the same angle.
4. **Workbench strip:** after the ring, two large tiles: "Image resize & compress" and "PDF merge & split", with the line "Your files never leave your browser."
5. **Footer:** search-everything box, GitHub link, "Add a tool" link (to `data/tools.js` on GitHub), MIT.

The direct visual reference is the Codrops **On-Scroll 3D Carousel** (tympanus.net/codrops/2025/05/07/on-scroll-3d-carousel/): panels rotating in 3D on scroll, with a page transition on click. Study the idea, not the code: write our own.

## 2. Tech decisions (license-clean, no build step)

| Need | Choice | Why |
|---|---|---|
| Ring rotation on scroll | **Vanilla JS**: a sticky stage; `progress = scrolled / pinLength`; `ring.style.transform = rotateY(-progress * 360deg)` inside `requestAnimationFrame` | Works in every browser. CSS scroll-driven animations are not yet on by default in Firefox stable, so don't rely on them for the core effect. |
| Small reveals (intro text, workbench tiles) | CSS `animation-timeline: view()` inside `@supports`, content fully visible without it | Free progressive enhancement |
| Panel → category transition | **View Transitions API** (`document.startViewTransition`) when available, otherwise instant switch | Native, zero libraries |
| Smooth scroll | **None** by default. Optional: Lenis (MIT) | Native scroll is more accessible; only add Lenis if the ring feels jerky |
| GSAP | **Not used** | Free even commercially now, but under GreenSock's own licence, not MIT. Keeping the repo 100% MIT-compatible is cleaner |
| PDF | pdf-lib (MIT) from jsDelivr, pinned version | |

Geometry: `n = 15` panels, `angle = 360 / n`, each panel `rotateY(i * angle) translateZ(radius)`, `radius = (panelWidth / 2) / tan(π / n)`, `perspective: 1200px` on the stage. Front panel index = `round(progress * n) % n`. Snap: when scrolling stops for 150 ms, smoothly scroll to the nearest panel's progress value (skip under reduced motion).

## 3. Colour: "Pegboard" (chosen)

All pairs checked against WCAG 2.x; every text pair passes AA (4.5:1).

| Token | Dark | Light (kraft paper) | Use |
|---|---|---|---|
| `--bg` | `#141517` | `#EADFCB` | page |
| `--surface` | `#1D1F22` | `#F3EADB` | panels, cards |
| `--line` | `#2E3135` | `#CDBFA6` | borders, pegboard dots |
| `--text` | `#ECE8E1` (15.0:1) | `#1C1B19` (13.0:1) | body |
| `--muted` | `#9C978E` (6.3:1) | `#5E584E` (5.3:1) | secondary text |
| `--accent` | `#FF6B2C` (6.4:1) | `#A63A0A` (4.9:1) | safety orange: links, focus, active panel |
| `--accent-ink` | `#141517` | `#FFFFFF` | text on accent fills |

Category tints (panel top stripe only, never body text): give each category one hue rotated around the wheel at low saturation, e.g. `oklch(0.72 0.09 <hue>)` in dark mode, `oklch(0.55 0.09 <hue>)` in light. Hues: steps of 24° starting at 30°.

Backup palettes (also checked, all AA): **Darkroom** (`#0F0D0D` / `#F1ECE4` / safelight red `#F0574A`; light `#F4F0EA` / `#1A1616` / `#B0271D`) and **Blueprint** (`#0B1B2E` / `#E4ECF5` / `#5CCFF0`; light `#F2F0E9` / `#0B1B2E` / `#1D5BA6`). Blueprint drifts toward the overused "cyan on navy" tech look, so Pegboard stays first choice.

Theme: follow `prefers-color-scheme`, toggle stores choice in `localStorage` (wrapped in try/catch), sets `data-theme` on `<html>`.

## 4. Type (all SIL Open Font Licence, via Google Fonts)

**Chosen:** **Bricolage Grotesque** (display + UI; use its wide, heavy cuts for the title and panel names) + **JetBrains Mono** (labels, tags, counts, "PROTOCOL"-style stamps).

Alternatives:
- **Space Grotesk + Space Mono**: more technical, less personality.
- **Instrument Serif + Geist Mono**: editorial and elegant; good if you want a "catalogue" feel instead of "workshop".

Scale: title `clamp(3rem, 12vw, 9rem)`, panel name `clamp(1.5rem, 3vw, 2.25rem)`, body 1rem/1.6, mono labels 0.75rem uppercase with `letter-spacing: 0.08em`.

## 5. Texture & details

- Pegboard: `radial-gradient(var(--line) 1.5px, transparent 1.6px) 0 0 / 24px 24px` on the body.
- Panels look like hanging tags: a small circular "hole" at the top centre, 2px border, 14px radius, 4px category-tint stripe.
- Monogram tiles instead of logos: first two letters of the tool name in mono, on the category tint.
- Icons: hand-written inline SVG, 1.75px stroke, `currentColor`. No icon library.
- No gradient text, no glow, no generic drop shadows.

## 6. Accessibility & fallbacks (non-negotiable)

- **`prefers-reduced-motion: reduce`:** no ring. Show the 15 categories as a static grid of panels; no snap, no view-transition animation.
- **Mobile (< 720px):** ring radius shrinks; panels 78vw wide; if it still feels cramped, switch to the flat grid (same as reduced motion).
- **Keyboard:** panels are real `<button>`s; ←/→ rotate one step; Enter opens; Esc closes the category view; visible focus ring in `--accent` (3px outline, 3px offset).
- Side panels not facing front get `aria-hidden` removed but `tabindex` stays, so focus order follows the ring; focusing a panel rotates it to the front.
- **No JS:** the ring markup is a plain grid, so the page still works.
- Category view has a real heading, a labelled search input, and a live region announcing "12 tools".
- Every text colour pair at AA or better (table above).

## 7. References

- Codrops — On-Scroll 3D Carousel (May 2025): the closest match to the concept.
- Codrops — Cinematic 3D Scroll Experiences with GSAP: pacing and typography ideas for the intro.
- recent.design, ui.watermelon.sh: layout blocks for the workbench strip and footer.
- realtimecolors.com: preview the Pegboard tokens on a sample page before coding.

## 8. Addendum: "studio site" scroll story (reverse-engineered reference)

Reference: a Japanese creative studio's site (seen in a screen-recorded reel). It is built with WebGL (a Three.js-style 3D scene with custom shaders, video textures and sound). We borrow its **structure and techniques**, never its logo, triangle mark, imagery, text or colours. Toolshed keeps the Pegboard palette and its own mark.

### What the reference does, beat by beat

| # | Beat | What you see | How it's built (likely) |
|---|---|---|---|
| 1 | Loader | Glowing ring "portal" with a crosshair, on black | Shader / canvas ring that dissolves into the scene |
| 2 | Hero | Huge logotype as 3D slabs inside a dark gridded room; a small list of latest news on the right; crosshair/compass HUD top right | 3D text meshes, grid textures on room walls, DOM overlay for the news list |
| 3 | Section title | Next title ("WORK") in giant extruded letters that break apart as you scroll | Letters split into slabs, each animated on scroll |
| 4 | Works carousel | Camera **inside** a gridded cylinder; project panels hang on the curved inner wall and rotate past as you scroll; caption bottom-left (date, title, tag pills), "More works" bottom-right | Panels on a cylinder, rotation tied to scroll; DOM caption swaps per active panel |
| 5 | Brand beat | Giant glowing mark fills the screen as a chapter break | Mark mesh + bloom |
| 6 | Manifesto | Page **flips to white**; a 3-line statement appears line by line, each line on a black highlight box; faint outline mark behind | DOM text, clip-path / scaleX reveal per line |
| 7 | Liquid transition | Smeared RGB-split fluid wipe into the next section | Full-screen displacement shader |
| 8 | Feature scenes | Big angled project videos, then a pastel hero for their product | Video planes in 3D, parallax |
| 9 | Outro | Mark on black with thin wireframe grid lines | Lines drawn on scroll |
| — | Persistent UI | Tiny mono nav top centre, contact pill top right, sound toggle bottom, vertical section index on the left, tiny coordinate labels everywhere | Fixed DOM HUD |

### Toolshed version (CSS 3D + small vanilla JS, no WebGL)

| Beat | Toolshed | Build |
|---|---|---|
| 1 Loader | "Peg hole" ring: an orange circle that draws itself (SVG stroke-dashoffset), crosshair ticks, then scales open to reveal the page. 0.9s max, runs once per session, skipped under reduced motion | SVG + CSS |
| 2 Hero | Giant **TOOLSHED** wordmark, each letter its own slab with slight 3D tilt following the pointer (±6°). Background: a perspective **grid room** (floor + back wall made from repeating linear-gradients on transformed divs). Right column: "Recently added" list (last 5 tools from data). Top-right HUD: crosshair widget showing scroll % in mono | CSS 3D, pointer JS |
| 3 Title break | "CATEGORIES" in giant type; as you scroll, letters drift apart on Z and fade, revealing the ring | Per-letter spans, transforms driven by scroll progress |
| 4 **Ring (replaces §1 step 2)** | View the ring **from inside**: the stage is a dark gridded cylinder; 15 category panels sit on the inner wall facing the centre. Scroll rotates the cylinder. Caption bottom-left: `#03 · COLOUR`, category name, tool count, 3 tag pills; "Open →" bottom-right. Click/Enter opens the category (View Transition) | Panel `i`: `rotateY(i*angle) translateZ(-radius)`, flipped with an extra `rotateY(180deg)` so it faces inward; the stage wrapper rotates. Grid on the cylinder = the same panels' backgrounds + a ring of thin vertical lines |
| 5 Brand beat | Giant peg-hook mark (our own simple SVG) in orange, scaling up as a chapter break into the Workbench | SVG + scroll scale |
| 6 Manifesto | **Section inverts to light** regardless of theme (in light mode it inverts to dark). Three lines on highlight boxes, revealed one by one: "Free tools for everything you make." / "Sorted, searched, ready." / "Your files never leave your browser." | Each line: box `scaleX` 0→1 from left, then text fades in |
| 7 Liquid wipe | **Skip.** Use a simple diagonal clip-path wipe in `--accent` instead | CSS clip-path |
| 8 Feature scenes | Workbench: two big angled "screen" panels (image tool, PDF tool) with a looping CSS demo inside (e.g. a file icon shrinking with a size counter ticking down) | CSS 3D tilt + keyframes |
| 9 Outro | Mark + thin grid lines drawing in; footer with search box and links | SVG strokes |
| HUD | Fixed: mono nav top centre (Directory · Workbench · About · GitHub), theme toggle top right, vertical section index on the left (01–06, active one in accent), scroll % in the crosshair | Fixed DOM, IntersectionObserver for active section |

### Rules for this addendum
- All motion respects `prefers-reduced-motion`: no loader, no tilt, no letter drift; ring becomes the flat grid; reveals become instant.
- Under 720px: no pointer tilt, ring radius scales to viewport, HUD index hidden.
- Max 15 animated 3D elements on screen at once; animate only `transform` and `opacity`; one `requestAnimationFrame` loop drives everything.
- No sound, no video files, no WebGL in v1. A Three.js (MIT) upgrade of beats 2–4 and the liquid wipe is a possible v2.
