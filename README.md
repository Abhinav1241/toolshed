# Toolshed

A workshop wall of small, free tools. Scroll a 3D ring of 15 drawers, open one, and use the tool. Everything runs in your browser, and your files never leave your device.

Plain HTML, CSS and JavaScript. No build step, no framework, no tracking.

## What works today

| Tool | Where |
|---|---|
| Image resize & compress (JPEG, PNG, WebP) | `tools/image.html` |
| PDF merge, reorder, remove and extract pages | `tools/pdf.html` |
| 39 small tools: text, encoding, security, calculators, converters, fun, developer, data, colour | `tools/tool.html?id=<tool id>` |

The catalogue lists 66 tools in 15 categories. Tools without a page yet are marked "Soon".

## Run it locally

The site is static, so any file server works:

```bash
python -m http.server 5173
```

Then open <http://localhost:5173>. Opening `index.html` straight from disk also works, but serve it over HTTP if you want the web fonts and the CDN script to behave like production.

## Add a tool

Small tools share one page, `tools/tool.html`, and a tiny UI kit in `assets/js/tool-runner.js`.

1. Add a row to `ROWS` in [`data/tools.js`](data/tools.js): `[category id, name, description, tags]`. A tool's id is its name in lower case with dashes (`Word counter` becomes `word-counter`).
2. Register it in a file under `assets/js/tools/`:
   ```js
   ToolshedTools.register('word-counter', function (root, kit) {
     var box = kit.area('Your text');
     root.appendChild(kit.group('', box.el));
   });
   ```
3. Add its id to the `LIVE` list in `data/tools.js`. The card then becomes a link.
4. If you add or remove a tool, update the `data-count` and sample names on that category's panel in `index.html`, so the page still reads correctly without JavaScript.

Bigger tools (like the image and PDF ones) can have their own page in `tools/`. Give the row an `href` as its fifth item.

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

The site appears at `https://abhinav1241.github.io/toolshed/`. All paths are relative, so it works from that sub-path. A `.nojekyll` file is included so GitHub serves the files as they are.

If you fork the project, change the GitHub links in the footers of `index.html`, `tools/image.html` and `tools/pdf.html` to your own repository.

## Licence

MIT. See [LICENSE](LICENSE).
