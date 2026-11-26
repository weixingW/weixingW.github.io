# weixingw.github.io

Personal website of Weixing Wang — plain HTML/CSS, served by GitHub Pages. No build step.

```
index.html              homepage content
cv.html                 full CV page (also the source of the PDF)
assets/cv/              generated CV PDF
404.html                not-found page
assets/css/style.css    colors and layout (variables at the top)
assets/img/portrait.jpg profile photo
assets/fonts/           self-hosted Inter Tight (SIL OFL)
```

## Common edits

- **Add a paper**: copy one `<li>` in the publications list. Put links inside `<p class="pub-links">`,
  e.g. `<a href="https://arxiv.org/abs/...">arXiv</a>`.
- **Add news**: copy one `<li>` in the `#news` list.
- **Accent color**: `--accent` in `style.css` (light and dark values).

## Regenerate the CV PDF

After editing `cv.html`, start the local server (below) and run:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --no-pdf-header-footer \
  --print-to-pdf=assets/cv/weixing-wang-cv.pdf http://127.0.0.1:8000/cv.html
```

## Preview locally

```sh
python3 -m http.server 8000 --bind 127.0.0.1
# open http://127.0.0.1:8000
```

## Deploy

Push to `master`. GitHub Pages serves the repository root (Settings → Pages → Deploy from branch → `master` / root).
