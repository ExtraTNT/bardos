# BardosJS

BardosJS is a small static-site / markdown server with a tiny JavaScript frontend.

## Features
- Serve markdown pages and directories via a shallow API
- Syntax-highlight fenced code blocks (Extendable in highlight.js)
- Serve and index image files under /api/images
- Simple functional frontend renderer bundled with esbuild (minify)

## Tech
- Backend: Haskell (warp / wai), built with Cabal/GHC
- Frontend: JavaScript (odocosJS virtual DOM), bundled with esbuild (node/yarn)
- Container: Docker + docker-compose (optional)

## Quick start (dev)
0. Git clone

- copy the command from github and run

1. Update Submodules

```bash
git submodules update
```

2. Build frontend bundle:

```bash
yarn install
yarn build
```

3. Run backend locally from the `backend/` directory:

```bash
cd backend
cabal build
cabal run bardosBackend.cabal -- ../dist --pages ../backend/pages --images ../backend/images --port 3443
```

4. Alternatively start via Docker compose (binds host pages/images/.dev-cert):

```bash
docker compose up --build
```

5.  or run completely without backend and as a non minified build
```bash
yarn dev
```

## API
- `GET /api/pages` — list top-level pages and directories
- `GET /api/pages/<path...>` — list directories contents or fetch a page
- `GET /api/images` — image index
- `GET /api/images/<path...>` — serve image file

## Configuration (backend)

The backend accepts a few CLI options (see the server help for full details). Common options used in development:

- `<dir>` — directory to serve frontend assets (usually `dist/`).
- `--pages <dir>` — root directory containing markdown pages and directories (default: `backend/pages`).
- `--images <dir>` — directory with image files to index/serve (default: `backend/images`).
- `--port <n>` — port to listen on (example: `3443`).
- `--cert <file>` and `--key <file>` — paths to TLS certificate and key; if omitted, the app will generate dev certs in `.dev-cert/`.

When running via `cabal run` or the released binary, pass these flags to configure where the server looks for pages, images, and static assets.

### Managing pages

Pages are plain Markdown files stored under the configured `pages` directory. The server performs a shallow scan for top-level entries and resolves directory contents on demand, so you can organize content into directories.

#### Recommended structure:

- `backend/pages/` — top-level pages and directories
- `backend/pages/About.md` — a single page
- `backend/pages/Blog/` — a directory containing many posts (each a `.md` file)
- `backend/pages/Blog/2026-03-01-hello.md` — example post file

#### Guidelines

- File format: Markdown (`.md`). Fenced codeblocks are syntax-highlighted by the frontend.
- Directory behavior: directories are treated as navigable collections. The frontend requests `/api/pages` for the root list and `/api/pages/Blog` (or deeper paths) to list directory contents or fetch a page.
- Image embedding: reference images served by the backend using `/api/images/<path>`; images placed under the configured `images` directory will be indexed and served.
- Live edits: when running the server directly against the host filesystem (or using the default `docker-compose` bind mounts), changes to files are visible immediately to clients once the server rescans or when the frontend requests the directory again.
- Safety: avoid using characters in filenames that may be interpreted by URLs; use simple slugs (dashes, letters, numbers). The backend validates paths to prevent traversal outside the configured `pages` root.

#### To add a new page:

1. Create a `.md` file under `backend/pages/` or a subdirectory.
2. Use a descriptive filename (e.g., `my-post.md` or `2026-03-23-notes.md`).
3. If images are needed, put them in the `backend/images/` directory and reference them with `/api/images/<relative-path>` in your markdown.

##### Example

```
backend/pages/Demo/Images.md
```

contains markdown that embeds `/api/images/coffee.png` (the project includes a demo image example).


## Notes
- The frontend bundle lives in `dist/` after `yarn build`.
- Development certificates live in `.dev-cert/` (auto-generated for dev by the backend if missing).


