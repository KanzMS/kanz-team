# Kanz team

A site for the Kanz team: a library of logos and designs that copy on click, and the brand docs. A static React site, deployed to GitHub Pages from the `dev` branch, using MokhbirPro's design system.

**The site is public.** There is no sign-in, so anyone with the URL can read everything in `content/`. Don't add anything that isn't OK to share.

## Run it

```bash
cd frontend && npm install && npm run dev
```

Open http://localhost:5173/kanz-team/.

To check the production build, run `npm run build && npm run preview` in `frontend/`.

## Deploy

Every push to `dev` builds the site and publishes it to https://kanzms.github.io/kanz-team/ through `.github/workflows/pages.yml`.

The site is served from a subfolder named after the repository. If the repository is renamed, change `base` in `frontend/vite.config.ts`.

## Add content

Add the file to `content/` and push to `dev`. When running locally, restart `npm run dev` to pick it up.

- **Logos and designs:** put a PNG, JPG, WebP or SVG in `content/assets/<Category>/`. The folder is the section title and the filename is the name (`kanz-logo-white.png` shows as "Kanz logo white").
- **Docs:** put a Markdown file in `content/docs/`, named in lowercase with hyphens:

  ```markdown
  ---
  title: Page title
  summary: One line for the list.
  icon: description   # a Material Symbols name
  order: 5
  ---
  ```

## Copying

Click-to-copy needs https or localhost, because browsers block clipboard images on plain http. Everything is copied as a PNG; SVGs are rasterised at 2048px on the longest side.
