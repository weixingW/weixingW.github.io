# weixingw.github.io

Personal website of Weixing Wang — plain HTML/CSS/JS, served by GitHub Pages. No build step.

```
index.html              all content (edit text here)
404.html                not-found page
assets/css/style.css    design tokens at the top (colors, fonts, spacing)
assets/js/main.js       theme toggle, clock, publication filters, token-portrait canvas
assets/img/portrait.jpg source image for the token portrait
assets/fonts/           self-hosted fonts (SIL OFL)
```

## Common edits

- **Add a paper**: copy one `<li class="pub">` block in `index.html`. `data-tags` drives the filters
  (`first`, `hallucination`, `multimodal`, `language`). Put links inside `<p class="pub-links mono">`.
- **Add news**: copy one `<li>` in the `#news` list.
- **Change accent color**: `--accent` in `style.css` (separate values for light and dark).
- **Portrait**: replace `assets/img/portrait.jpg` (roughly 14:15, face centered).

## Preview locally

The token portrait reads image pixels, which browsers block on `file://`, so use a local server:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
# open http://127.0.0.1:8000
```

## Deploy

Push to `main`. GitHub Pages serves the repository root (Settings → Pages → Deploy from branch → `main` / root).
