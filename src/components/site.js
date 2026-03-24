import { render, vnode } from '../../lib/odocosJS/src/render.js';
import { pipe, toMaybe, Just, Nothing } from '../../lib/odocosJS/src/core.js';
import { eq } from '../../lib/odocosJS/src/math.js';
import { markdownToVnode } from './markdown.js';

// ---------------------------------------------------------------------------
// site — functional, lazily-loaded markdown renderer
//
// Pure core: merge, mergeDeep, resolve, *View
// Effect boundary: boot / site (only places state is reassigned)
// ---------------------------------------------------------------------------

const bind = ma => f => ma(_ => Nothing)(f);
const fromMaybe = d => m => m(_ => d)(x => x);
const orElse = ma => mb => ma(_ => mb)(x => Just(x));

// ---------------------------------------------------------------------------
// State — plain immutable value, replaced wholesale at the effect boundary
// ---------------------------------------------------------------------------
const empty = () => ({ pages: {}, topNav: [], subNavs: {}, folders: {}, loaded: {} });

// appendUniq :: [{ path }] -> String -> a -> [a]
const appendUniq = arr => path => item =>
  arr.some(x => x.path === path) ? arr : [...arr, item];

// merge :: [Entry] -> String -> State -> State
// Folds entries at one level into a new state snapshot
const merge = entries => parent => state => {
  const isRoot = !parent;
  const pages   = { ...state.pages };
  const topNav  = [...state.topNav];
  const subNavs = { ...state.subNavs };
  const folders = { ...state.folders };
  const loaded  = { ...state.loaded, [parent || '']: true };

  entries.forEach(entry => {
    const fp = isRoot ? entry.path : parent + '/' + entry.path;
    if (entry.type === 'page') {
      pages[fp] = { title: entry.title, content: entry.content, parent: isRoot ? null : parent };
      if (isRoot) {
        if (!topNav.some(n => n.path === fp))
          topNav.push({ title: entry.title, path: fp, type: 'page' });
      } else {
        subNavs[parent] = appendUniq(subNavs[parent] || [])(fp)({ title: entry.title, path: fp });
      }
    } else {
      folders[fp] = true;
      if (isRoot) {
        if (!topNav.some(n => n.path === fp))
          topNav.push({ title: entry.title, path: fp, type: 'folder' });
      } else {
        subNavs[parent] = appendUniq(subNavs[parent] || [])(fp)({ title: entry.title, path: fp, type: 'folder' });
      }
    }
  });

  return { pages, topNav, subNavs, folders, loaded };
};

// mergeDeep :: [Entry] -> String -> State -> State
// Recursively merges a full tree (for inline fallback data)
const mergeDeep = entries => parent => state =>
  entries.reduce((s, entry) => {
    const s2 = merge([entry])(parent)(s);
    if (entry.type !== 'folder' || !entry.children) return s2;
    const fp = parent ? parent + '/' + entry.path : entry.path;
    return mergeDeep(entry.children)(fp)(s2);
  }, state);

// ---------------------------------------------------------------------------
// resolve :: State -> String -> String | null
// Pure path resolution: page > folder default child > first child
// ---------------------------------------------------------------------------
const resolve = state => hash => 
  fromMaybe(hash)(
    orElse(
      bind(toMaybe(state.pages[hash]))(_ => Just(hash))
    )(
      bind(toMaybe(state.folders[hash] || state.subNavs[hash] ? hash : null))(
        folder => {
          const defPath = folder + '/' + folder.split('/').pop();
          return orElse(
            bind(toMaybe(state.pages[defPath]))(_ => Just(defPath))
          )(
            toMaybe(((state.subNavs[folder] || [])[0] || {}).path)
          );
        }
      )
    )
  );

// firstPath :: State -> String
const firstPath = state => state.topNav[0] ? state.topNav[0].path : '';

// ---------------------------------------------------------------------------
// Pure view functions — State -> String -> VNode
// ---------------------------------------------------------------------------

// navLink :: String -> String -> Bool -> VNode
const navLink = (path) => (title) => (active) =>
  vnode("a")({ href: "#" + path, className: active ? "active" : "" })([title])

// isActiveTop :: String -> { path, type } -> Bool
const isActiveTop = cur => entry =>
  entry.type === 'folder'
    ? eq(cur)(entry.path) || cur.startsWith(entry.path + '/')
    : eq(cur)(entry.path);

// topNavView :: State -> String -> VNode
const topNavView = state => cur =>
  vnode('nav')({ className: 'site-nav' })(
    state.topNav.map(e => navLink(e.path)(e.title)(isActiveTop(cur)(e)))
  );

// backTarget :: State -> String -> String -> String
const backTarget = state => cur => parent => {
  const page = state.pages[cur];
  const folderName = parent.split('/').pop();
  return page && page.title === folderName && parent.includes('/')
    ? parent.slice(0, parent.lastIndexOf('/'))
    : page && page.title === folderName
      ? firstPath(state)
      : parent;
};

// isActiveSub :: String -> { path, type? } -> Bool
const isActiveSub = cur => s =>
  s.type === 'folder'
    ? cur.startsWith(s.path + '/') || eq(cur)(s.path)
    : eq(cur)(s.path);

// subNavView :: State -> String -> VNode | null
const subNavView = state => cur =>
  fromMaybe(null)(
    bind(toMaybe(state.pages[cur]))(page =>
    bind(toMaybe(page.parent))(parent =>
        Just(vnode('nav')({ className: 'site-subnav' })([
          vnode('a')({ href: '#' + backTarget(state)(cur)(parent), className: 'back-btn' })
            (['\u2190 Back']),
          ...(state.subNavs[parent] || []).map(s =>
            navLink(s.path)(s.title)(isActiveSub(cur)(s))
          ),
        ]))
    )));

// contentView :: State -> String -> VNode
const contentView = state => cur =>
  toMaybe(state.pages[cur])
    (() => markdownToVnode('# Not Found\n\nPage not found.'))
    (page => markdownToVnode(page.content));

// siteView :: State -> String -> VNode  (top-level pure composition)
const siteView = state => cur => {
  const sub = subNavView(state)(cur);
  return vnode('div')({ className: 'site' })([
    topNavView(state)(cur),
    ...(sub ? [sub] : []),
    vnode('main')({ className: 'site-content' })([contentView(state)(cur)]),
    vnode('footer')({ className: 'site-footer' })(['Built with BardosJS, a minimalist CMS based on OdocosJS.']),
  ]);
};

// ---------------------------------------------------------------------------
// Effects — fetch + navigate (state threaded through promise chain)
// ---------------------------------------------------------------------------

// fetchEntries :: String -> String -> Promise [Entry]
const fetchEntries = base => path =>
  fetch(base + '/api/pages' + (path ? '/' + path : ''))
    .then(r => r.ok ? r.json() : []);

// navigate :: String -> String -> State -> Promise { state, path }
// Walks ancestors, lazily loading each folder, threading state through
const navigate = apiBase => hash => state => {
  if (!hash) return Promise.resolve({ state, path: firstPath(state) });
  if (state.pages[hash]) return Promise.resolve({ state, path: hash });

  const parts = hash.split('/');
  return parts.reduce(
    (chain, _, i) => {
      const prefix = parts.slice(0, i + 1).join('/');
      return chain.then(s =>
        s.folders[prefix] && !s.loaded[prefix]
          ? fetchEntries(apiBase)(prefix).then(entries => merge(entries)(prefix)(s))
          : s
      );
    },
    Promise.resolve(state)
  ).then(s => ({ state: s, path: resolve(s)(hash) || hash }));
};

// ---------------------------------------------------------------------------
// site :: Element -> [Entry] -> ()   (offline / fallback, fully loaded tree)
// ---------------------------------------------------------------------------
const site = root => tree => {
  const go    = render(root);
  const state = pipe(mergeDeep(tree)(''))(empty());
  const first = firstPath(state);
  const draw  = cur => go(siteView(state)(cur));

  const onHash = () => {
    const raw = location.hash.slice(1) || first;
    draw(resolve(state)(raw) || raw);
  };

  window.addEventListener('hashchange', onHash);
  onHash();
};

// ---------------------------------------------------------------------------
// boot :: Element -> String -> ()    (lazy loading from API)
// ---------------------------------------------------------------------------
const boot = root => apiBase =>
  fetchEntries(apiBase)('').then(initial => {
    const go  = render(root);
    let state = merge(initial)('')(empty());

    const nav = hash =>
      navigate(apiBase)(hash)(state).then(result => {
        state = result.state;
        go(siteView(state)(result.path));
      });

    const onHash = () => nav(location.hash.slice(1) || firstPath(state));

    window.addEventListener('hashchange', onHash);
    onHash();
  });

export { site, boot };
