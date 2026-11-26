# weixingw.github.io

Personal website of Weixing Wang — plain HTML/CSS, served by GitHub Pages. No build step.

```
index.html              all content (edit text here)
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

## Preview locally

```sh
python3 -m http.server 8000 --bind 127.0.0.1
# open http://127.0.0.1:8000
```

## Deploy

Push to `master`. GitHub Pages serves the repository root (Settings → Pages → Deploy from branch → `master` / root).
