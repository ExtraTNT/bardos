import { boot, site } from './components/site.js';

// ── Boot from API ─────────────────────────────────────────────────
// In production (served by bardosBackend), fetch pages from the API:
//   boot(document.getElementById('root'))('')
//
// For local dev without the backend, fall back to inline pages:

const apiAvailable = () =>
  fetch('/api/health')
    .then(r => r.ok)
    .catch(() => false);

const fallbackPages = [
  { type: 'page', title: 'Home', path: 'Home', content: `
# Welcome to Bardos

A tiny **markdown-driven** website rendered with [odocosJS](https://github.com/ExtraTNT/odocosJs).

---

The haskell backend is currently not answering API requests.
` },
    { type: 'page', title: 'About', path: 'About', content: `
# About

This site is powered by **odocosJS** — a small functional virtual-DOM library.

The markdown parser converts text into virtual nodes, which the render engine
patches into the real DOM.

---

*Built with zero dependencies.*
` }];

const root = document.getElementById('root');

apiAvailable().then(ok =>
  ok
    ? boot(root)('')
    : site(root)(fallbackPages)
);
