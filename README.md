# Politics Hub — test version

This repository is a **test copy** of the new Politics Hub APS website (6 languages, liquid-glass
design, 3D photos and cards). It exists only to try the site through a link before it replaces the
real one. The official site stays in the `Politics_Hub_APS` repository.

## Test link

After publishing (see below), the site is at:

- **Home (picks the browser language):** https://alessandrodellacqua.github.io/Politics_Hub_Tech/
- Italian: https://alessandrodellacqua.github.io/Politics_Hub_Tech/it/index.html
- English: https://alessandrodellacqua.github.io/Politics_Hub_Tech/en/index.html
- Projects page (3D bulb): https://alessandrodellacqua.github.io/Politics_Hub_Tech/it/progetti.html
- Architecture diagram: https://alessandrodellacqua.github.io/Politics_Hub_Tech/docs/architettura.html

### Publishing it (one time)

1. In GitHub Desktop: commit everything in this folder and **Push origin**.
2. On github.com open the repository → **Settings → Pages**.
3. *Source*: **Deploy from a branch** → Branch **main**, folder **/ (root)** → Save.
4. After 1–2 minutes the link above works. (GitHub Pages on a free account needs the repository
   to be **public**.)

## What to test

- **Chrome / Edge / Brave:** the menu bar and the buttons bend what is behind them like a lens.
- **Safari / Firefox:** a different technique is used there (still in progress — to be refined later).
  In Chrome you can preview the Safari technique by adding `?lg=mirror` to any address, e.g.
  `…/it/index.html?lg=mirror`.
- Cards, numbers and photos: move the mouse over them (tilt, light, 3D).
- Language menu (globe icon) in the top bar: IT, EN, FR, ES, DE, 中文.

## Good to know

- **Forms are real.** Newsletter and event registration on this test site send data to the real
  Google Sheet (same backend as the official site). Use test emails, then delete the test rows.
- **Search engines:** `robots.txt` blocks indexing, and every page points to www.politicshub.it
  as the official address, so this copy does not compete with the real site on Google.
- **No custom domain:** there is intentionally no `CNAME` file here, so this repository never
  takes over www.politicshub.it.

## Folder contents

| Folder / file | What it is |
|---|---|
| `index.html` | Language chooser / redirect |
| `it/ en/ fr/ es/ de/ zh/` | The generated pages (do not edit by hand) |
| `_src/` | Page sources + `build.py` (edit here, then run `cd _src && python3 build.py`) |
| `assets/` | Styles (`style.css`, `liquid-glass.css`, `bulb-navigation.css`) and scripts |
| `media/` | Optimised photos used by the pages |
| `data/` | `events.json`, `articles.json` (written by the admin panel) |
| `admin/` | Volunteer admin panel |
| `Logo3D/` | Licence notes for the 3D bulb |
| `docs/` | Architecture diagram, Google Apps Script setup guide, list of images still on Wix |
