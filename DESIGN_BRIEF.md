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
