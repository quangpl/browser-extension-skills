#!/usr/bin/env node
// Audit a browser extension's declared permissions against chrome.*/browser.* usage in source.
// Zero dependencies, Node >= 18. Findings are candidates; confirm each by reading the cited code.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, extname, basename } from 'node:path';

const HELP = `Usage: node audit-permissions.mjs [path] [--manifest <file>] [--json] [--help]

Compares the extension manifest with chrome.* / browser.* API usage in source files.

  path               Project root to scan (default: .)
  --manifest <file>  Use this manifest instead of auto-detecting one
  --json             Print machine-readable JSON
  --help             Show this help

Manifest lookup: --manifest, then manifest.json in root, src/, public/, then build output
(.output/chrome-mv3/, build/chrome-mv3-prod/, dist/), then dev builds, then a static parse of
wxt.config.* or the package.json "manifest" field (Plasmo).

Finding types: missing, unused, review, broad-host, install-warning, optional-candidate,
activeTab-candidate. Exit code 0 when the audit ran (with or without findings), 2 on usage errors.`;

// ---------- args ----------
function usageError(msg) {
  console.error(`audit-permissions: ${msg}\nRun with --help for usage.`);
  process.exit(2);
}
const argv = process.argv.slice(2);
let root = '.';
let manifestArg = null;
let asJson = false;
let rootSet = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--help' || a === '-h') { console.log(HELP); process.exit(0); }
  else if (a === '--json') asJson = true;
  else if (a === '--manifest') {
    manifestArg = argv[++i];
    if (!manifestArg || manifestArg.startsWith('--')) usageError('--manifest needs a file path');
  } else if (a.startsWith('--manifest=')) manifestArg = a.slice('--manifest='.length);
  else if (a.startsWith('-')) usageError(`unknown option ${a}`);
  else if (!rootSet) { root = a; rootSet = true; }
  else usageError(`unexpected argument ${a}`);
}
root = resolve(root);
if (!existsSync(root) || !statSync(root).isDirectory()) usageError(`not a directory: ${root}`);

// ---------- knowledge tables ----------
// Install warnings from https://developer.chrome.com/docs/extensions/reference/permissions-list
const WARNINGS = {
  'accessibilityFeatures.modify': 'Change your accessibility settings',
  'accessibilityFeatures.read': 'Read your accessibility settings',
  bookmarks: 'Read and change your bookmarks',
  clipboardRead: 'Read data you copy and paste',
  clipboardWrite: 'Modify data you copy and paste',
  contentSettings: "Change your settings that control websites' access to features such as cookies, JavaScript, plugins, geolocation, microphone, camera etc.",
  debugger: 'Access the page debugger backend; Read and change all your data on all websites',
  declarativeNetRequest: 'Block content on any page',
  declarativeNetRequestFeedback: 'Read your browsing history',
  desktopCapture: 'Capture content of your screen',
  downloads: 'Manage your downloads',
  'downloads.open': 'Manage your downloads',
  'downloads.ui': 'Manage your downloads',
  favicon: 'Read the icons of the websites you visit',
  geolocation: 'Detect your physical location',
  history: 'Read and change your browsing history on all signed-in devices',
  'identity.email': 'Know your email address',
  management: 'Manage your apps, extensions, and themes',
  nativeMessaging: 'Communicate with cooperating native applications',
  notifications: 'Display notifications',
  pageCapture: 'Read and change all your data on all websites',
  privacy: 'Change your privacy-related settings',
  proxy: 'Read and change all your data on all websites',
  readingList: 'Read and change entries in the reading list',
  'system.storage': 'Identify and eject storage devices',
  tabCapture: 'Read and change all your data on all websites',
  tabGroups: 'View and manage your tab groups',
  tabs: 'Read your browsing history',
  topSites: 'Read a list of your most frequently visited websites',
  ttsEngine: 'Read all text spoken using synthesized speech',
  webAuthenticationProxy: 'Read and change all your data on all websites',
  webNavigation: 'Read your browsing history',
};

// API namespace -> permission. Arrays = any one satisfies.
const API_PERMS = {
  alarms: 'alarms', audio: 'audio', bookmarks: 'bookmarks', browsingData: 'browsingData',
  certificateProvider: 'certificateProvider', contentSettings: 'contentSettings',
  contextMenus: ['contextMenus', 'menus'], menus: ['menus', 'contextMenus'], cookies: 'cookies',
  debugger: 'debugger', declarativeContent: 'declarativeContent',
  declarativeNetRequest: ['declarativeNetRequest', 'declarativeNetRequestWithHostAccess'],
  desktopCapture: 'desktopCapture', documentScan: 'documentScan', downloads: 'downloads',
  fileBrowserHandler: 'fileBrowserHandler', fileSystemProvider: 'fileSystemProvider',
  fontSettings: 'fontSettings', gcm: 'gcm', instanceID: 'gcm', history: 'history',
  identity: 'identity', idle: 'idle', loginState: 'loginState', management: 'management',
  notifications: 'notifications', offscreen: 'offscreen', pageCapture: 'pageCapture',
  platformKeys: 'platformKeys', power: 'power', printerProvider: 'printerProvider',
  printing: 'printing', printingMetrics: 'printingMetrics', privacy: 'privacy',
  processes: 'processes', proxy: 'proxy', readingList: 'readingList', scripting: 'scripting',
  search: 'search', sessions: 'sessions', sidePanel: 'sidePanel', storage: 'storage',
  tabCapture: 'tabCapture', tabGroups: 'tabGroups', topSites: 'topSites', tts: 'tts',
  ttsEngine: 'ttsEngine', userScripts: 'userScripts', vpnProvider: 'vpnProvider',
  wallpaper: 'wallpaper', webAuthenticationProxy: 'webAuthenticationProxy',
  webNavigation: 'webNavigation', webRequest: 'webRequest', dns: 'dns',
};
// Namespaces with sub-namespaces that map to their own permission (system.cpu, enterprise.*).
const SUB_NS = new Set(['system', 'enterprise', 'accessibilityFeatures']);
// Namespaces usable without a permission.
const FREE = new Set(['runtime', 'i18n', 'extension', 'action', 'browserAction', 'pageAction',
  'commands', 'windows', 'tabs', 'permissions', 'devtools', 'omnibox', 'dom', 'events', 'types',
  'extensionTypes']);
// APIs that also need host access (host_permissions or activeTab).
const HOST_APIS = /^(scripting\.(executeScript|insertCSS|removeCSS)|tabs\.captureVisibleTab|cookies\.|webRequest\.|userScripts\.)/;
// Declared permissions with no API namespace: evidence comes from other code patterns.
const SUPPORT_PATTERNS = {
  geolocation: /navigator\.geolocation/,
  clipboardRead: /navigator\.clipboard\.read(Text)?\s*\(|execCommand\(\s*['"]paste/,
  clipboardWrite: /navigator\.clipboard\.write(Text)?\s*\(|execCommand\(\s*['"](copy|cut)/,
  notifications: /showNotification\s*\(|new\s+Notification\s*\(/,
  favicon: /_favicon\//,
  unlimitedStorage: /indexedDB|caches\.open|storage\.local|getDirectory\s*\(/,
  // Wrapper libraries call chrome.storage internally (WXT storage, @plasmohq/storage).
  storage: /['"](?:wxt\/utils\/storage|wxt\/storage|@wxt-dev\/storage|@plasmohq\/storage(?:\/[\w-]+)?)['"]|import\s*\{[^}]*\bstorage\b[^}]*\}\s*from\s*['"]#imports['"]|(?<![.\w$])storage\.(?:defineItem|getItem|setItem|getItems|setItems|removeItem|removeItems|watch|getMeta|setMeta|removeMeta)\s*\(/,
};
// https://developer.chrome.com/docs/extensions/reference/api/permissions (cannot be optional)
const NOT_OPTIONAL = new Set(['debugger', 'declarativeNetRequest', 'devtools', 'geolocation', 'mdns', 'proxy', 'tts', 'ttsEngine', 'wallpaper']);
const ALWAYS_REVIEW = {
  activeTab: 'grants temporary host access after a user gesture; keep it if code acts on the current tab from action/context menu/command clicks',
  background: 'keeps Chrome running after windows close; rarely justified',
  declarativeNetRequestFeedback: 'debug-only (ignored for CWS installs) and adds "Read your browsing history"; remove before publishing',
  webRequestBlocking: 'in MV3 only policy-installed (enterprise) extensions can use it; use declarativeNetRequest otherwise',
};

const SRC_EXT = new Set(['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.mts', '.cts', '.vue', '.svelte']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.output', '.wxt', '.plasmo',
  'coverage', '.next', '.turbo', '.cache', 'out']);

// ---------- manifest location ----------
function readJson(file) {
  try { return JSON.parse(readFileSync(file, 'utf8')); }
  catch (e) { return { __error: e.message }; }
}
function strings(src) {
  return [...src.matchAll(/(['"`])((?:(?!\1).)*)\1/g)].map((m) => m[2]);
}
function arrayField(text, key) {
  const re = new RegExp(`(?<![A-Za-z_])['"]?${key}['"]?\\s*:\\s*\\[([^\\]]*)\\]`);
  const m = text.match(re);
  return m ? strings(m[1]) : undefined;
}

function locateManifest() {
  const notes = [];
  if (manifestArg) {
    const p = resolve(manifestArg);
    if (!existsSync(p)) usageError(`manifest not found: ${p}`);
    return { path: p, source: 'flag', manifest: readJson(p), notes };
  }
  const direct = ['manifest.json', 'src/manifest.json', 'public/manifest.json'];
  const built = ['.output/chrome-mv3/manifest.json', 'build/chrome-mv3-prod/manifest.json', 'dist/manifest.json'];
  const dev = ['.output/chrome-mv3-dev/manifest.json', 'build/chrome-mv3-dev/manifest.json'];
  for (const [list, source] of [[direct, 'source'], [built, 'build'], [dev, 'dev-build']]) {
    for (const rel of list) {
      const p = join(root, rel);
      if (existsSync(p)) {
        if (source === 'dev-build') notes.push('Using a dev build: WXT/Plasmo dev servers add permissions (e.g. tabs, scripting) for reloading. Run a production build and re-audit before trusting "unused"/"broad" results.');
        return { path: p, source, manifest: readJson(p), notes };
      }
    }
  }
  // Static fallbacks: approximate, framework config.
  const wxtCfg = ['wxt.config.ts', 'wxt.config.js', 'wxt.config.mts', 'wxt.config.mjs'].map((f) => join(root, f)).find(existsSync);
  if (wxtCfg) {
    const text = readFileSync(wxtCfg, 'utf8');
    const m = { manifest_version: 3 };
    for (const k of ['permissions', 'optional_permissions', 'host_permissions', 'optional_host_permissions']) {
      const v = arrayField(text, k);
      if (v) m[k] = v;
    }
    notes.push('No built manifest found; parsed string arrays from wxt.config (approximate). Run `wxt build` and re-audit for exact results.');
    return { path: wxtCfg, source: 'wxt-config', manifest: m, notes };
  }
  const pkgPath = join(root, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = readJson(pkgPath);
    if (pkg && pkg.manifest && typeof pkg.manifest === 'object') {
      notes.push('No built manifest found; using package.json "manifest" overrides (Plasmo). Plasmo adds generated fields at build time; run `plasmo build` and re-audit for exact results.');
      return { path: pkgPath, source: 'plasmo-package-json', manifest: { manifest_version: 3, ...pkg.manifest }, notes };
    }
  }
  return { path: null, source: 'none', manifest: {}, notes: ['No manifest found. Reporting API usage and the permissions it requires.'] };
}

function detectFramework() {
  if (['wxt.config.ts', 'wxt.config.js', 'wxt.config.mts', 'wxt.config.mjs'].some((f) => existsSync(join(root, f)))) return 'wxt';
  const pkgPath = join(root, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = readJson(pkgPath);
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    if (deps.plasmo) return 'plasmo';
    if (deps['@crxjs/vite-plugin']) return 'crxjs';
    if (deps.wxt) return 'wxt';
  }
  return 'vanilla';
}

// ---------- source scan ----------
function walk(dir, out) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(join(dir, e.name), out);
    } else if (e.isFile() && SRC_EXT.has(extname(e.name)) && !e.name.endsWith('.d.ts')) {
      const p = join(dir, e.name);
      try { if (statSync(p).size <= 1_000_000) out.push(p); } catch { /* unreadable */ }
    }
  }
  return out;
}

const files = walk(root, []);
const rel = (p) => relative(root, p) || basename(p);

const required = new Map(); // permission -> [{file,line,api}]
const supported = new Map(); // permission -> evidence that justifies but doesn't require it
const hostNeeded = []; // evidence of APIs needing host access
const tabsPrivileged = []; // tabs/windows usage in files that read url/title/favIconUrl
const gestureEntrypoints = []; // action.onClicked / contextMenus.onClicked / commands.onCommand
const permissionRequests = []; // chrome.permissions.request(...) lines
const sourceMatches = []; // content-script matches found in WXT/Plasmo entrypoints
const usedApis = new Map(); // api namespace -> count

function add(map, key, ev) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(ev);
}
const keyOf = (perm) => (Array.isArray(perm) ? perm.join('|') : perm);

const API_RE = /\b(?:chrome|browser)\s*\??\.\s*([A-Za-z]+)(?:\s*\??\.\s*([A-Za-z]+))?/g;
for (const file of files) {
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { continue; }
  const lines = text.split(/\r?\n/);
  const readsTabFields = /\.(url|title|favIconUrl|pendingUrl)\b/.test(text);
  if (/defineContentScript|PlasmoCSConfig/.test(text)) {
    const m = arrayField(text, 'matches');
    if (m) sourceMatches.push(...m);
  }
  lines.forEach((line, i) => {
    const ev = (api) => ({ file: rel(file), line: i + 1, api });
    for (const [perm, re] of Object.entries(SUPPORT_PATTERNS)) {
      if (re.test(line)) add(supported, perm, ev(`web API (${perm})`));
    }
    for (const m of line.matchAll(API_RE)) {
      const [, ns, member] = m;
      const api = member ? `${ns}.${member}` : ns;
      usedApis.set(ns, (usedApis.get(ns) || 0) + 1);
      if (/^(permissions\.(request|contains))/.test(api)) permissionRequests.push({ ...ev(api), text: line.trim().slice(0, 160) });
      const gesture = /^(action|browserAction)\.onClicked|^(contextMenus|menus)\.onClicked|^commands\.onCommand/.test(api);
      if (gesture) gestureEntrypoints.push(ev(api));
      if (HOST_APIS.test(api + '.')) hostNeeded.push(ev(api));
      if ((/^(tabs|windows|sessions)$/.test(ns) || gesture) && readsTabFields) tabsPrivileged.push(ev(api));
      if (ns === 'runtime' && /^(connectNative|sendNativeMessage)$/.test(member || '')) { add(required, 'nativeMessaging', ev(api)); continue; }
      if (ns === 'identity' && member === 'getProfileUserInfo') add(supported, 'identity.email', ev(api));
      if (ns === 'downloads' && member === 'open') add(required, 'downloads.open', ev(api));
      if (ns === 'downloads' && member === 'setUiOptions') add(required, 'downloads.ui', ev(api));
      if (SUB_NS.has(ns) && member) {
        const perm = ns === 'accessibilityFeatures' ? ['accessibilityFeatures.read', 'accessibilityFeatures.modify'] : `${ns}.${member}`;
        add(required, keyOf(perm), ev(api));
        continue;
      }
      if (FREE.has(ns)) continue;
      const perm = API_PERMS[ns];
      if (perm) add(required, keyOf(perm), ev(api));
    }
  });
}

// ---------- compare ----------
const { path: manifestPath, source, manifest, notes } = locateManifest();
const framework = detectFramework();
if (manifest.__error) notes.push(`Manifest is not valid JSON: ${manifest.__error}`);
const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
const declared = {
  permissions: arr(manifest.permissions),
  optional_permissions: arr(manifest.optional_permissions),
  host_permissions: arr(manifest.host_permissions),
  optional_host_permissions: arr(manifest.optional_host_permissions),
  content_script_matches: [...new Set([
    ...(Array.isArray(manifest.content_scripts) ? manifest.content_scripts.flatMap((c) => arr(c && c.matches)) : []),
    ...(source === 'wxt-config' || source === 'plasmo-package-json' ? sourceMatches : []),
  ])],
};
const mv = manifest.manifest_version ?? null;
// MV2 manifests list host patterns inside permissions.
const isHost = (p) => p === '<all_urls>' || p.includes('://');
const apiPerms = declared.permissions.filter((p) => !isHost(p));
const optApiPerms = declared.optional_permissions.filter((p) => !isHost(p));
const hostPerms = [...declared.host_permissions, ...declared.permissions.filter(isHost)];
const allDeclared = new Set([...apiPerms, ...optApiPerms]);
// Manifest keys that imply permission use.
if (manifest.side_panel) add(supported, 'sidePanel', { file: 'manifest', line: 0, api: 'side_panel key' });
if (manifest.declarative_net_request) {
  for (const p of ['declarativeNetRequest', 'declarativeNetRequestWithHostAccess']) add(supported, p, { file: 'manifest', line: 0, api: 'declarative_net_request key' });
}
if (framework === 'wxt' && files.some((f) => /entrypoints[\\/]sidepanel/.test(f))) add(supported, 'sidePanel', { file: 'entrypoints/sidepanel', line: 0, api: 'WXT sidepanel entrypoint' });

const findings = [];
const push = (type, permission, message, evidence = []) =>
  findings.push({ type, permission, message, evidence: evidence.slice(0, 5), evidenceCount: evidence.length });

const isAllHosts = (p) => p === '<all_urls>' || /^(\*|https?|wss?|ftp|file):\/\/\*\//.test(p);
const hasAllHosts = hostPerms.some(isAllHosts);

// missing
for (const [key, ev] of required) {
  const options = key.split('|');
  if (options.some((p) => allDeclared.has(p))) continue;
  if (source === 'none') { push('missing', options[0], `code uses an API that requires "${options[0]}"`, ev); continue; }
  push('missing', options[0], `used in code but not declared${options.length > 1 ? ` (any of: ${options.join(', ')})` : ''}`, ev);
}
if (source !== 'none' && hostNeeded.length && !hostPerms.length && !declared.optional_host_permissions.length && !allDeclared.has('activeTab')) {
  push('missing', 'host access', 'APIs that need host access are used, but there are no host_permissions, optional_host_permissions, or activeTab', hostNeeded);
}
if (source !== 'none' && required.has('declarativeNetRequest|declarativeNetRequestWithHostAccess') && allDeclared.has('declarativeNetRequestWithHostAccess') && !allDeclared.has('declarativeNetRequest') && !hostPerms.length && !declared.optional_host_permissions.length) {
  push('missing', 'host access', 'declarativeNetRequestWithHostAccess needs host permissions before any rule acts on a host');
}

// unused / review for declared permissions
const requiredFlat = new Set([...required.keys()].flatMap((k) => k.split('|')));
for (const perm of allDeclared) {
  if (ALWAYS_REVIEW[perm]) {
    if (perm === 'activeTab' && (hostNeeded.length || gestureEntrypoints.length || manifest.action?.default_popup)) continue;
    if (perm === 'webRequestBlocking' && mv !== 3) continue;
    push('review', perm, ALWAYS_REVIEW[perm]);
    continue;
  }
  if (perm === 'tabs') {
    if (tabsPrivileged.length) {
      push('review', 'tabs', 'only needed to read url/title/favIconUrl/pendingUrl of tabs you have no host access to; activeTab or matching host_permissions may suffice', tabsPrivileged);
    } else if (usedApis.has('tabs') || usedApis.has('windows')) {
      push('review', 'tabs', 'tabs/windows APIs are used but no url/title/favIconUrl reads were found; basic tab operations need no permission');
    } else push('unused', 'tabs', 'no tabs/windows/sessions usage found');
    continue;
  }
  if (requiredFlat.has(perm)) continue;
  if (supported.has(perm)) continue;
  if (perm === 'identity.email' && usedApis.has('identity')) continue;
  if (perm === 'unlimitedStorage') { push('review', perm, 'no large-storage usage found (storage.local/IndexedDB/Cache/OPFS)'); continue; }
  const known = Object.values(API_PERMS).flat().includes(perm) || WARNINGS[perm] || /^(system|enterprise)\./.test(perm) || ['nativeMessaging', 'downloads.open', 'downloads.ui'].includes(perm) || SUPPORT_PATTERNS[perm];
  if (known) push('unused', perm, 'declared but no matching API usage found in scanned source');
  else push('review', perm, 'no detector for this permission; verify manually');
}

for (const p of optApiPerms) if (NOT_OPTIONAL.has(p)) push('review', p, 'cannot be declared in optional_permissions; move it to permissions (or drop the feature)');

// broad hosts
for (const p of hostPerms) if (isAllHosts(p)) push('broad-host', p, 'grants access to every site ("Read and change all your data on all websites")');
for (const p of declared.content_script_matches) if (isAllHosts(p)) push('broad-host', p, 'content script injected on every site; same install warning as all-hosts host_permissions');

// install warnings (required permissions only; optional ones warn at request time)
const warnings = [];
for (const perm of apiPerms) {
  if (!WARNINGS[perm]) continue;
  if (perm === 'tabs' && hasAllHosts) continue; // suppressed by all-hosts warning
  warnings.push({ permission: perm, warning: WARNINGS[perm] });
}
const hostWarnSet = [...new Set([...hostPerms, ...declared.content_script_matches])];
if (hostWarnSet.some(isAllHosts)) warnings.push({ permission: 'hosts', warning: 'Read and change all your data on all websites' });
else {
  const hosts = [...new Set(hostWarnSet.map((p) => (p.match(/^[^:]+:\/\/([^/]+)/) || [])[1]).filter(Boolean))];
  if (hosts.length === 1) warnings.push({ permission: 'hosts', warning: `Read and change your data on ${hosts[0]}` });
  else if (hosts.length > 1) warnings.push({ permission: 'hosts', warning: `Read and change your data on ${hosts.length} sites (${hosts.slice(0, 4).join(', ')}${hosts.length > 4 ? ', …' : ''})` });
}
for (const w of warnings) push('install-warning', w.permission, `"${w.warning}"`);

// optional candidates
const requestedInCode = permissionRequests.map((r) => r.text).join('\n');
for (const w of warnings) {
  if (w.permission === 'hosts') {
    if (hasAllHosts) push('optional-candidate', 'hosts', 'if not every site is needed at install, move broad hosts to optional_host_permissions and request per site on a user gesture');
    continue;
  }
  if (ALWAYS_REVIEW[w.permission] || NOT_OPTIONAL.has(w.permission) || findings.some((f) => f.type === 'unused' && f.permission === w.permission)) continue;
  const alsoRequested = new RegExp(`['"]${w.permission.replace('.', '\\.')}['"]`).test(requestedInCode);
  push('optional-candidate', w.permission, alsoRequested
    ? 'code already calls permissions.request/contains for it, yet it is a required permission; move it to optional_permissions'
    : 'warning-triggering; if the feature is not core at install, move to optional_permissions and request on a user gesture');
}

// activeTab candidates
const broadCS = declared.content_script_matches.some(isAllHosts);
if (!allDeclared.has('activeTab') && (hasAllHosts || allDeclared.has('tabs')) && !broadCS && (gestureEntrypoints.length || manifest.action)) {
  push('activeTab-candidate', 'activeTab', `${hasAllHosts ? 'broad host access' : 'tabs'} may be replaceable by activeTab (no warning) if access is only needed on the current tab after a click, context-menu item, or shortcut`, gestureEntrypoints);
}

const order = ['missing', 'unused', 'review', 'broad-host', 'install-warning', 'optional-candidate', 'activeTab-candidate'];
findings.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
const summary = Object.fromEntries(order.map((t) => [t, findings.filter((f) => f.type === t).length]));

const result = {
  root,
  framework,
  manifest: { path: manifestPath ? rel(manifestPath) : null, source, manifestVersion: mv },
  scannedFiles: files.length,
  declared,
  requiredByCode: [...required.keys()].sort(),
  findings,
  summary,
  notes,
};

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const out = [];
  out.push(`Extension permission audit: ${root}`);
  out.push(`Framework: ${framework} | Manifest: ${result.manifest.path ?? '(none)'} [${source}] | MV${mv ?? '?'} | ${files.length} source files`);
  for (const n of notes) out.push(`Note: ${n}`);
  out.push(`Declared: permissions=[${declared.permissions.join(', ')}] optional=[${declared.optional_permissions.join(', ')}]`);
  out.push(`          host=[${declared.host_permissions.join(', ')}] optional_host=[${declared.optional_host_permissions.join(', ')}] content_scripts=[${declared.content_script_matches.join(', ')}]`);
  out.push(`Required by code: ${result.requiredByCode.map((k) => k.split('|')[0]).join(', ') || '(none)'}`);
  for (const type of order) {
    const group = findings.filter((f) => f.type === type);
    if (!group.length) continue;
    out.push('', `${type.toUpperCase()} (${group.length})`);
    for (const f of group) {
      out.push(`  - ${f.permission}: ${f.message}`);
      for (const e of f.evidence) out.push(`      ${e.file}${e.line ? `:${e.line}` : ''}  ${e.api}`);
      if (f.evidenceCount > f.evidence.length) out.push(`      … ${f.evidenceCount - f.evidence.length} more`);
    }
  }
  if (!findings.length) out.push('', 'No findings.');
  out.push('', 'Findings are candidates: confirm each against the cited code before editing.');
  console.log(out.join('\n'));
}
