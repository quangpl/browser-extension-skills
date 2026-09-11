# Extension Templates (WXT Patterns)

For each template: entrypoints to create + permissions needed.

---

## 1. URL Reader (Popup + Active Tab)

Entrypoints: `entrypoints/popup/`
Permissions: `['activeTab']`

```ts
// popup
const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
console.log(tab.url, tab.title);
```

---

## 2. Page Modifier (Content Script + CSS)

Entrypoints: `entrypoints/content.ts`, `entrypoints/content.css`
Permissions: `['activeTab']` or `host_permissions: ['https://*.site.com/*']`

```ts
export default defineContentScript({
  matches: ["https://*.target-site.com/*"],
  main() {
    const el = document.createElement("div");
    el.id = "my-extension-overlay";
    document.body.appendChild(el);
  },
});
```

---

## 3. Side Panel Assistant

Entrypoints: `entrypoints/sidepanel/`, `entrypoints/background.ts`
Permissions: `['sidePanel', 'storage', 'activeTab']`

```ts
// background.ts
browser.action.onClicked.addListener((tab) => {
  browser.sidePanel.open({ windowId: tab.windowId! });
});
```

---

## 4. Tab Manager

Entrypoints: `entrypoints/popup/`, `entrypoints/background.ts`
Permissions: `['tabs', 'storage']`

```ts
const tabs = await browser.tabs.query({});
await browser.tabs.update(tabId, { active: true });
await browser.tabs.group({ tabIds: [1, 2, 3] });
```

---

## 5. Bookmark Manager

Entrypoints: `entrypoints/popup/`, `entrypoints/background.ts`
Permissions: `['bookmarks', 'storage']`

```ts
await browser.bookmarks.create({ title, url });
const results = await browser.bookmarks.search({ query });
```

Keyboard shortcut in `wxt.config.ts`:

```ts
manifest: { commands: { 'save-bookmark': { suggested_key: { default: 'Ctrl+Shift+B' }, description: 'Save page' } } }
```

---

## 6. Context Menu Extension

Entrypoints: `entrypoints/background.ts`
Permissions: `['contextMenus', 'activeTab']`

```ts
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: "search",
      title: 'Search "%s"',
      contexts: ["selection"],
    });
  });
  browser.contextMenus.onClicked.addListener((info) => {
    browser.tabs.create({
      url: `https://google.com/search?q=${info.selectionText}`,
    });
  });
});
```

---

## Permission Summary

| Template         | permissions                   | host_permissions |
| ---------------- | ----------------------------- | ---------------- |
| URL Reader       | activeTab                     | —                |
| Page Modifier    | activeTab                     | target domain    |
| Side Panel       | sidePanel, storage, activeTab | —                |
| Tab Manager      | tabs, storage                 | —                |
| Bookmark Manager | bookmarks, storage            | —                |
| Context Menu     | contextMenus, activeTab       | —                |
