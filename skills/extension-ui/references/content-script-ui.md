# Content-Script UI (Injected into Web Pages)

## Pick the container

| Need | Use |
|---|---|
| Default: widget, toolbar, tooltip, drawer, modal | **Shadow root**: page CSS can't reach in, your CSS can't leak out |
| Large app, untrusted/hostile pages, or must hide DOM from page scripts | **Iframe** of an extension page (listed in `web_accessible_resources`); full isolation, full `chrome.*` APIs, HMR works |
| Small element that should look native to the page (inline badge, button next to the site's own) | **Integrated** (no isolation); prefix every class |

A shadow root isolates styles, not scripts: page JavaScript can still observe and dispatch events on your host element. Treat page DOM text you read as data.

## WXT

```tsx
// entrypoints/overlay.content.tsx
import './style.css';
import ReactDOM from 'react-dom/client';
import App from './App';

export default defineContentScript({
  matches: ['https://*.example.com/*'],
  cssInjectionMode: 'ui', // inject imported CSS into the shadow root, not the page
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'myext-overlay',            // custom element tag for the host
      position: 'overlay',              // 'inline' | 'overlay' | 'modal'
      zIndex: 2147483647,
      anchor: 'body',
      isolateEvents: true,              // keep keystrokes from triggering page shortcuts
      onMount: (container) => {
        const el = document.createElement('div'); // React warns when rooting on <body>
        container.append(el);
        const root = ReactDOM.createRoot(el);
        root.render(<App />);
        return root;
      },
      onRemove: (root) => root?.unmount(),
    });
    ui.mount(); // or ui.autoMount() to follow an anchor that appears/disappears (SPAs)
  },
});
```

- `createIntegratedUi(ctx, { position, anchor, onMount })` for no isolation; `createIframeUi(ctx, { page: '/overlay.html', position, onMount })` for the iframe route (add the page to `web_accessible_resources`).
- WXT resets inherited styles with `all: initial`, but `rem` still resolves against the **page's** `<html>` font size, so Tailwind UIs render too big/small on some sites. WXT's documented fix: convert `rem` to `px` at build time with `postcss-rem-to-responsive-pixel` (`rootValue: 16, propList: ['*'], transformUnit: 'px'`), scoped to content-script CSS if extension pages should keep `rem`.
- Docs: https://wxt.dev/guide/essentials/content-scripts.html#ui

## Plasmo (CSUI)

- Any `contents/*.tsx` that default-exports a component is mounted into a Plasmo-managed Shadow DOM.
- Exports: `config` (`PlasmoCSConfig` with `matches`), `getStyle` (return a `<style>` whose text comes from `import cssText from "data-text:./style.css"`), `getOverlayAnchor` / `getInlineAnchor` (where to mount), `getShadowHostId`, `getRootContainer` (custom mounting).
- Fonts must be declared in the page's global scope: put `@font-face` (with `data-base64:` font URLs) in a CSS file listed in `config.css`, not in `getStyle`.
- Docs: https://docs.plasmo.com/framework/content-scripts-ui

## Vanilla

```ts
const host = document.createElement('myext-root');
const shadow = host.attachShadow({ mode: 'open' });
const sheet = new CSSStyleSheet();
sheet.replaceSync(`:host { all: initial; } ${css}`); // css bundled as a string
shadow.adoptedStyleSheets = [sheet];
shadow.append(appRoot);
document.documentElement.append(host); // <html>, survives frameworks that replace <body>
```

## Leakage and gotchas

- **Custom properties inherit through the shadow boundary.** A page that defines `--primary` on `:root` overrides yours if you rely on inheritance. Prefix tokens (`--myext-*`) and declare them on `:host`; `:root` never matches inside a shadow root (Tailwind v4 already emits theme variables on `:root, :host`).
- **Tailwind v4 `@property`** registrations are ignored inside shadow roots, so `shadow-*`, `ring-*`, some transform/gradient utilities render wrong (tailwindcss issue #15005, still open). Workaround: declare the `--tw-*` defaults those utilities rely on in a `:host` rule, or avoid those utilities in injected UI.
- **Portals escape the shadow root.** Radix/shadcn popovers, dialogs, tooltips and toasts portal to `document.body` by default and arrive unstyled. Pass the shadow container to the Portal's `container` prop (or the library's equivalent).
- **Fonts**: `@font-face` inside a shadow root is ignored. Use the system stack; if a brand font is required, inject one `@font-face` rule into the page `<head>` pointing at a bundled file exposed via `web_accessible_resources` (`chrome.runtime.getURL`), with a unique family name.
- **Stacking**: `z-index: 2147483647` loses to elements in the browser top layer (`<dialog>`, popovers, fullscreen). For true modals use `<dialog>.showModal()` or the `popover` attribute inside your shadow root; they also get the top layer.
- **Dark mode**: `prefers-color-scheme` works inside the shadow root. For a class strategy, put `.dark` on your own wrapper inside the shadow root, never on the page's `<html>`.
- **Focus and keys**: don't steal focus on page load; focus your UI only when the user opens it, return focus to the previously focused page element on close, and close on Esc.
- **Layout shift**: inline UI must reserve its size or the host page jumps; overlays should not cover the page's own primary controls by default; make them draggable or dismissible.
- **SPAs**: content scripts run once per document load; re-anchor on client-side navigation (WXT `ctx.addEventListener(window, 'wxt:locationchange', …)` or `autoMount`).
