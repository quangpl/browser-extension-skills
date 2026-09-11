# Framework Documentation & Style Guides

Always fetch the relevant framework docs before writing code. Use `docs-seeker` skill or web search.

## UI Frameworks

### React (react.dev)

- **Docs**: https://react.dev/learn
- **API Reference**: https://react.dev/reference/react
- **Hooks**: https://react.dev/reference/react/hooks
- **Key patterns**: Functional components, hooks, context, Suspense
- **React Compiler** auto-optimizes (useMemo/useCallback less needed)
- **In extensions**: Use for popup, sidepanel, options pages

### Vue.js (vuejs.org)

- **Docs**: https://vuejs.org/guide/introduction.html
- **Style Guide**: https://vuejs.org/style-guide/
- **API Reference**: https://vuejs.org/api/
- **Key patterns**: Composition API, `<script setup>`, reactive refs
- **In extensions**: WXT has first-class Vue support

### Svelte (svelte.dev)

- **Docs**: https://svelte.dev/docs/introduction
- **Tutorial**: https://svelte.dev/tutorial
- **Key patterns**: No virtual DOM, compile-time reactivity, `$:` reactive
- **In extensions**: WXT has first-class Svelte support, smallest bundles

### SolidJS (solidjs.com)

- **Docs**: https://www.solidjs.com/docs/latest
- **Tutorial**: https://www.solidjs.com/tutorial
- **Key patterns**: Fine-grained reactivity, no virtual DOM, React-like JSX
- **In extensions**: WXT supports Solid, best for data-intensive UIs

### Angular (angular.dev)

- **Docs**: https://angular.dev/guide
- **Style Guide**: https://angular.dev/style-guide
- **Key patterns**: Modules, dependency injection, signals, standalone components
- **In extensions**: Heavier; consider for large enterprise extensions only

## Meta-Frameworks

### Next.js (nextjs.org)

- **Docs**: https://nextjs.org/docs
- **App Router**: https://nextjs.org/docs/app
- **Note**: Not typically used in extensions (SSR not needed), but patterns apply

### Nuxt.js (nuxt.com)

- **Docs**: https://nuxt.com/docs
- **Note**: Vue meta-framework; not directly used in extensions

### Astro (astro.build)

- **Docs**: https://docs.astro.build
- **Note**: Content-focused; useful for extension landing pages, not extension UI

## Code Style Guides

### TypeScript (Google)

- **Guide**: https://google.github.io/styleguide/tsguide.html
- Key rules: strict mode, explicit types on public APIs, readonly where possible
- Naming: `camelCase` for variables/functions, `PascalCase` for types/classes

### JavaScript (Google)

- **Guide**: https://google.github.io/styleguide/jsguide.html
- Key rules: const/let (no var), arrow functions, template literals
- Naming: `camelCase` for variables, `UPPER_CASE` for constants

## Extension-Specific Framework Docs

### WXT

- **Docs**: https://wxt.dev/
- **Entrypoints**: https://wxt.dev/guide/essentials/entrypoints.html
- **Config**: https://wxt.dev/guide/essentials/config.html
- **Auto-imports**: https://wxt.dev/guide/essentials/auto-imports.html
- **Storage**: https://wxt.dev/guide/essentials/storage.html

### CRXJS

- **Docs**: https://docs.crxjs.com/
- **Quickstarts**: https://docs.crxjs.com/quickstarts
- **Content Scripts UI**: https://docs.crxjs.com/framework/content-scripts-ui
- **Messaging**: https://docs.crxjs.com/framework/messaging
- **Storage**: https://docs.crxjs.com/framework/storage

## How to Use

1. **Detect framework** from `package.json` and config files
2. **Fetch relevant docs** using `docs-seeker` skill or web search
3. **Follow style guide** for the detected framework
4. **Chrome API patterns** should follow Google TypeScript style guide
5. **Extension-specific code** (service worker, content script) = always vanilla TS
