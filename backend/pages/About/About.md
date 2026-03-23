# About Bardos

This site is powered by **odocosJS** — a small functional virtual-DOM library.

The markdown parser converts text into virtual nodes, which the render engine
patches into the real DOM.

---

## Architecture

- **Frontend**: Pure functional JS — markdown parser, vnode renderer, plugin-based syntax highlighting
- **Backend**: Haskell — Warp/TLS static file server with API routes

The pages you see are plain `.md` files served from a `pages/` directory.

---

*Built with zero external JS dependencies.*
