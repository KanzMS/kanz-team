# Kanz team

An internal site for the Kanz team: a library of logos and designs that copy on click, and the brand docs. FastAPI backend, React frontend, MokhbirPro's design system.

## Run it

```bash
cp .env.example .env          # set TEAM_PASSWORD and SESSION_SECRET (skip if .env exists)

cd frontend && npm install && npm run build && cd ..
cd backend && uv run uvicorn app.main:app --port 8000
```

Open http://localhost:8000.

For frontend work, run the backend as above with `--reload` and `npm run dev` in `frontend/`, then open http://localhost:5173.

## Sign-in

There is one shared account, set by `TEAM_USERNAME` and `TEAM_PASSWORD` in `.env`. Sessions last 7 days. To remove someone's access, change the password and `SESSION_SECRET`, then restart.

Over https, set `COOKIE_SECURE=true`.

## Add content

No code or restart needed.

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

## Tests

```bash
cd backend && uv run pytest
```
