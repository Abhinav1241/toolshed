# Toolshed

A workshop wall of small, free tools. Scroll a 3D ring of 15 drawers, open one, and use the tool. Everything runs in your browser, and your files never leave your device.

Plain HTML, CSS and JavaScript. No build step, no framework, no tracking.

## What works today

| Tool | Where |
|---|---|
| Image resize & compress (JPEG, PNG, WebP) | `tools/image.html` |
| PDF merge, reorder, remove and extract pages | `tools/pdf.html` |

The catalogue lists 66 tools in 15 categories. Tools without a page yet are marked "Soon".

## Run it locally

The site is static, so any file server works:

```bash
python -m http.server 5173
```

Then open <http://localhost:5173>. Opening `index.html` straight from disk also works, but serve it over HTTP if you want the web fonts and the CDN script to behave like production.

## Add a tool

1. Add a row to `ROWS` in [`data/tools.js`](data/tools.js): `[category id, name, description, tags, href]`. Leave `href` out until the page exists.
2. Build the page in `tools/` using the shared styles (`assets/css/style.css`, `assets/css/tool.css`, `assets/css/site.css`) and `assets/js/theme.js`.
3. Update the `data-count` and sample names on the matching panel in `index.html` so the page still reads correctly without JavaScript.

## Design

[`DESIGN_BRIEF.md`](DESIGN_BRIEF.md) is the source of truth for colour ("Pegboard"), type (Bricolage Grotesque and JetBrains Mono), motion and accessibility.

- The ring is vanilla JS: a sticky stage, `rotateY` driven by scroll progress, and a snap to the nearest panel after 150 ms.
- With `prefers-reduced-motion: reduce`, or without JavaScript, the 15 categories show as a flat grid.
- Arrow keys turn the ring, Enter opens a drawer, Esc closes it.
- The theme follows the system and can be toggled; the choice is stored in `localStorage`.

## Dependencies

| What | Licence | How loaded |
|---|---|---|
| [pdf-lib](https://github.com/Hopding/pdf-lib) 1.17.1 | MIT | jsDelivr, only on the PDF page |
| Bricolage Grotesque, JetBrains Mono | SIL OFL | Google Fonts |

## Deploy on GitHub Pages

The site needs no build. After pushing to GitHub:

1. Open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Pick the `main` branch and the `/ (root)` folder, then save.

The site appears at `https://<your-user>.github.io/<repo>/`. All paths are relative, so it works from that sub-path. A `.nojekyll` file is included so GitHub serves the files as they are.

Before publishing, replace `YOUR-USER` in the footer links (`index.html`, `tools/image.html`, `tools/pdf.html`) and in this file with your GitHub username and repository name.

## Licence

MIT. See [LICENSE](LICENSE).
