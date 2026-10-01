#!/usr/bin/env node
// Static pre-submission scanner for Chrome Web Store (CWS) rejection risks.
// Zero dependencies, Node >= 18. Findings are candidates: verify each one by reading the cited line.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, dirname, basename, extname } from 'node:path';

const HELP = `Usage: node scan.mjs [path] [--build <dir>] [--json] [--help]

Scans an extension project for statically detectable Chrome Web Store rejection risks.

  path           Extension project root (default: .)
  --build <dir>  Also scan the built package CWS will receive (e.g. .output/chrome-mv3,
                 build/chrome-mv3-prod, dist). Its manifest.json is preferred for manifest checks.
  --json         Machine-readable output
  --help         Show this help

Skips node_modules, .git and build output dirs unless passed via --build.
Exit code: 0 when the scan ran (findings are not errors), 2 on usage errors.`;

// ---------- args ----------
const argv = process.argv.slice(2);
let rootArg = '.', buildArg = null, asJson = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--help' || a === '-h') { console.log(HELP); process.exit(0); }
  else if (a === '--json') asJson = true;
  else if (a === '--build') {
    buildArg = argv[++i];
    if (!buildArg) usage('--build needs a directory');
  } else if (a.startsWith('--build=')) buildArg = a.slice(8);
  else if (a.startsWith('-')) usage(`Unknown option: ${a}`);
  else rootArg = a;
}
function usage(msg) { console.error(`Error: ${msg}\n\n${HELP}`); process.exit(2); }

const root = resolve(rootArg);
if (!existsSync(root) || !statSync(root).isDirectory()) usage(`Not a directory: ${root}`);
// --build is resolved against the project root first, then the current directory.
const buildDir = buildArg ? ([resolve(root, buildArg), resolve(buildArg)].find((d) => existsSync(d)) ?? resolve(root, buildArg)) : null;
if (buildDir && (!existsSync(buildDir) || !statSync(buildDir).isDirectory())) usage(`Build dir not found: ${buildDir}`);

// ---------- constants ----------
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.output', '.wxt', '.plasmo', 'coverage',
  '.next', '.turbo', '.cache', '.parcel-cache', '.vite', 'out', '.svelte-kit']);
const CODE_EXT = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts', '.tsx', '.vue', '.svelte', '.html', '.htm']);
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_PER_FILE_CHECK = 5;
const SEV_ORDER = ['critical', 'high', 'medium', 'low', 'review'];

const findings = [];
const suppressed = {}; // `${file}|${check}` -> extra count
const perFileCount = new Map();
const seenLines = new Set(); // one finding per check per line

function add(f, { capKey = true } = {}) {
  const key = `${f.file}|${f.check}`;
  if (capKey && f.file && f.line) {
    const lineKey = `${key}|${f.line}`;
    if (seenLines.has(lineKey)) return;
    seenLines.add(lineKey);
  }
  if (capKey && f.file) {
    const n = (perFileCount.get(key) || 0) + 1;
    perFileCount.set(key, n);
    if (n > MAX_PER_FILE_CHECK) { suppressed[key] = (suppressed[key] || 0) + 1; return; }
  }
  findings.push({ check: f.check, code: f.code, severity: f.severity, confidence: f.confidence,
    file: f.file ?? null, line: f.line ?? null, snippet: f.snippet ?? '', message: f.message });
}

function snippetAt(line, index = 0, len = 0) {
  const s = line.replace(/\t/g, ' ');
  if (s.length <= 140) return s.trim();
  const start = Math.max(0, index - 50);
  const end = Math.min(s.length, index + Math.max(len, 0) + 70);
  return (start > 0 ? '…' : '') + s.slice(start, end).trim() + (end < s.length ? '…' : '');
}

// ---------- file walk ----------
function walk(dir, out, isBuild) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      if (!isBuild && SKIP_DIRS.has(e.name)) continue;
      if (buildDir && !isBuild && resolve(p) === buildDir) continue;
      walk(p, out, isBuild);
    } else if (e.isFile()) {
      const ext = extname(e.name).toLowerCase();
      if (CODE_EXT.has(ext) && !e.name.endsWith('.d.ts')) out.push({ path: p, isBuild });
    }
  }
}
const files = [];
walk(root, files, false);
if (buildDir) walk(buildDir, files, true);

const rel = (p) => relative(root, p).split('\\').join('/') || '.';
const isCommentLine = (l) => /^\s*(\/\/|\/\*|\*|<!--)/.test(l);

// ---------- line-level rules ----------
// Each rule: id, code, severity, confidence, re (global), message, optional filter(line, match) -> confidence|false
const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\]|[^/]*\.local|[^/]*\.localhost|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:|\/|$)/i;
const NS_HOST = /^(www\.w3\.org|w3\.org|schemas\.|ns\.adobe\.com|purl\.org|xmlns\.com|json-schema\.org|www\.apache\.org|apache\.org|opensource\.org|www\.opensource\.org|example\.(com|org|net)|www\.example\.|mozilla\.org\/MPL|feross\.org|www\.inkscape\.org|inkscape\.org|sodipodi\.|creativecommons\.org|www\.gnu\.org|jquery\.org|underscorejs\.org|momentjs\.com|fb\.me|reactjs\.org|react\.dev)/i;
const NET_CONTEXT = /fetch\s*\(|XMLHttpRequest|\.open\s*\(|axios|\$\.(ajax|get|post)|sendBeacon|WebSocket|EventSource|\burl\b|endpoint|\bapi|baseURL|src\s*=|href\s*=|action\s*=/i;

const AFFILIATE_DOMAINS = /(amzn\.to|go\.skimresources\.com|redirect\.viglink\.com|click\.linksynergy\.com|linksynergy\.com|anrdoezrs\.net|dpbolvw\.net|jdoqocy\.com|tkqlhce\.com|kqzyfj\.com|awin1\.com|shareasale\.com\/r\.cfm|prf\.hn|pjtra\.com|pntra\.com|sjv\.io|s\.click\.aliexpress\.com|click\.aliexpress\.com|ad\.admitad\.com|clk\.tradedoubler\.com|tradedoubler\.com\/click|rstyle\.me|shopstyle\.it|howl\.me|wild\.link|bit\.ly\/aff)/i;
const AFFILIATE_PARAMS = /[?&](aff|aff_id|affid|affiliate|affiliate_id|affiliateid|aff_sub|irclickid|clickref|ranmid|raneaid|ransiteid|awc|subid|sub_id|partner_id|partnerid)=/i;
const AMAZON_TAG = /amazon\.[a-z.]+\/[^\s'"`]*[?&]tag=|[?&]tag=[\w-]+-2\d\b/i;

const MINING = /\b(coinhive|coin-hive|cryptonight|cryptoloot|crypto-loot|jsecoin|webminepool|minero\.cc|mineralt|deepminer|coinimp|xmrig|stratum\+tcp|monerominer|webmine\.|authedmine|cryptonoter|minr\.pw|ppoi\.org)\b/i;

const RULES = [
  { id: 'remote-code.remote-script', code: 'Blue Argon', severity: 'critical', confidence: 'high',
    re: /<script\b[^>]*\bsrc\s*=\s*["']?(?:https?:)?\/\/[^"'\s>]+/gi, html: true,
    message: 'HTML loads a script from outside the package; bundle it locally.' },
  { id: 'remote-code.remote-script', code: 'Blue Argon', severity: 'critical', confidence: 'medium',
    re: /\.src\s*=\s*["'`](?:https?:)?\/\/[^"'`]+\.m?js\b/gi,
    message: 'Script element pointed at a remote .js URL; remote code is banned in MV3.' },
  { id: 'remote-code.import-scripts', code: 'Blue Argon', severity: 'critical', confidence: 'high',
    re: /\bimportScripts\s*\(\s*["'`](?:https?:)?\/\//g, message: 'importScripts() of a remote URL.' },
  { id: 'remote-code.dynamic-import-url', code: 'Blue Argon', severity: 'critical', confidence: 'high',
    re: /\bimport\s*\(\s*["'`](?:https?:)?\/\//g, message: 'Dynamic import() of a remote URL.' },
  { id: 'remote-code.eval', code: 'Blue Argon', severity: 'critical', confidence: 'medium',
    re: /(?<![\w$.])eval\s*\(/g,
    filter: (l) => (isCommentLine(l) ? 'low' : /\bfetch\s*\(|XMLHttpRequest|eval\s*\(\s*(atob|decodeURIComponent|unescape|await|\w+\.text\(\)|response|res\.|data\b)/i.test(l) ? 'high' : 'medium'),
    message: 'eval() — a violation when it can run strings fetched remotely; also blocked by MV3 extension CSP.' },
  { id: 'remote-code.new-function', code: 'Blue Argon', severity: 'critical', confidence: 'medium',
    re: /\bnew\s+Function\s*\(/g, filter: (l) => (isCommentLine(l) ? 'low' : 'medium'),
    message: 'new Function() executes strings as code; confirm the input is never remote.' },
  { id: 'remote-code.string-timer', code: 'Blue Argon', severity: 'critical', confidence: 'medium',
    re: /\bset(?:Timeout|Interval)\s*\(\s*["'`]/g, filter: (l) => (isCommentLine(l) ? 'low' : 'medium'),
    message: 'setTimeout/setInterval with a string argument evaluates code; pass a function.' },
  { id: 'obfuscation.packed', code: 'Red Titanium', severity: 'critical', confidence: 'high',
    re: /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[rd]\s*\)/g, minified: true,
    message: 'Dean Edwards packer signature (packed eval).' },
  { id: 'obfuscation.encoded-eval', code: 'Red Titanium', severity: 'critical', confidence: 'high',
    re: /\b(?:eval|Function)\s*\(\s*(?:atob|unescape|decodeURIComponent|String\.fromCharCode)\s*\(/g, minified: true,
    message: 'Code decoded and executed at runtime.' },
  { id: 'obfuscation.char-codes', code: 'Red Titanium', severity: 'high', confidence: 'medium',
    re: /String\.fromCharCode\s*\(\s*(?:\d+\s*,\s*){10,}/g,
    message: 'Long String.fromCharCode() sequence hides a string literal.' },
  { id: 'obfuscation.base64-blob', code: 'Red Titanium', severity: 'high', confidence: 'medium',
    re: /["'`]([A-Za-z0-9+/]{120,}={0,2})["'`]/g, minifiedConfidence: 'low',
    filter: (l, m) => (/[A-Z]/.test(m[1]) && /[a-z]/.test(m[1]) && /\d/.test(m[1]) ? undefined : false),
    message: 'Long base64 string literal; reviewers treat encoded code/strings as obfuscation. Use readable source or a real asset file.' },
  { id: 'insecure-http.endpoint', code: 'Purple Copper', severity: 'high', confidence: 'medium',
    re: /http:\/\/([^\s'"`<>)\\]+)/gi, minified: true,
    filter: (l, m) => {
      if (LOCAL_HOST.test(m[1]) || NS_HOST.test(m[1])) return false;
      if (/xmlns(:\w+)?\s*=\s*["']?$/.test(l.slice(Math.max(0, m.index - 12), m.index))) return false;
      if (isCommentLine(l)) return false; // URLs in comments transmit nothing
      return NET_CONTEXT.test(l.slice(Math.max(0, m.index - 80), m.index + m[0].length + 20)) ? 'medium' : 'low';
    },
    message: 'Plain-HTTP URL; user data must be sent over HTTPS.' },
  { id: 'insecure-http.sensitive-query', code: 'Purple Copper', severity: 'medium', confidence: 'medium',
    re: /[?&](password|passwd|pwd|token|access_token|id_token|api_?key|secret|session_?id|email)=/gi, minified: true,
    filter: (l) => (isCommentLine(l) ? false : undefined),
    message: 'Sensitive value in a query string; CWS asks not to put user data in URLs or headers even over HTTPS — use a POST body.' },
  { id: 'crypto-mining.signature', code: 'Grey Silicon', severity: 'critical', confidence: 'high',
    re: new RegExp(MINING.source, 'gi'), minified: true, message: 'Known crypto-mining library/pool signature.' },
  { id: 'affiliate.link', code: 'Grey Titanium', severity: 'medium', confidence: 'medium',
    re: new RegExp(`${AFFILIATE_DOMAINS.source}|${AFFILIATE_PARAMS.source}|${AMAZON_TAG.source}`, 'gi'), minified: true,
    message: 'Affiliate link/code; must be disclosed in listing + UI and only added after a related user action with a user benefit.' },
];

// ---------- scan code files ----------
const corpus = []; // for API-usage lookups
const minifiedFiles = [];
let scannedCount = 0;

function looksMinified(path, text, lines) {
  const name = basename(path).toLowerCase();
  if (/\.min\.(m?js|css)$/.test(name)) return true;
  if (/(^|\/)(vendor|vendors|third[_-]?party|lib|libs)\//i.test(rel(path)) && text.length > 20000) return true;
  if (lines.length === 0) return false;
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  return longest > 3000 || text.length / lines.length > 400;
}

for (const { path, isBuild } of files) {
  let st; try { st = statSync(path); } catch { continue; }
  if (st.size > MAX_FILE_BYTES) {
    add({ check: 'meta.file-too-large', code: '—', severity: 'review', confidence: 'low', file: rel(path),
      message: `Skipped (${(st.size / 1048576).toFixed(1)} MB); inspect manually.` });
    continue;
  }
  let text;
  try { text = readFileSync(path, 'utf8'); } catch {
    add({ check: 'meta.unreadable-file', code: '—', severity: 'review', confidence: 'low', file: rel(path),
      message: 'Skipped (unreadable); inspect manually.' });
    continue;
  }
  scannedCount++;
  corpus.push(text);
  const lines = text.split(/\r?\n/);
  const minified = looksMinified(path, text, lines);
  const isHtml = /\.html?$/i.test(path);
  if (minified && !isBuild) {
    minifiedFiles.push(rel(path));
    add({ check: 'obfuscation.minified-file', code: 'Red Titanium', severity: 'review', confidence: 'low', file: rel(path), line: 1,
      snippet: snippetAt(lines[0] || ''),
      message: 'Minified/vendored file in source: confirm it is an unmodified published library build (minification is allowed, obfuscation is not). Only high-signal checks ran on it.' });
  }

  // javascript-obfuscator style identifiers (_0x1a2b) — file-level signal
  const hexIds = text.match(/\b_0x[0-9a-f]{4,6}\b/g);
  if (hexIds && hexIds.length >= 5) {
    const idx = lines.findIndex((l) => /\b_0x[0-9a-f]{4,6}\b/.test(l));
    const m = lines[idx].match(/\b_0x[0-9a-f]{4,6}\b/);
    add({ check: 'obfuscation.hex-identifiers', code: 'Red Titanium', severity: 'critical', confidence: 'high', file: rel(path),
      line: idx + 1, snippet: snippetAt(lines[idx], m.index, m[0].length),
      message: `${hexIds.length} _0x… identifiers — javascript-obfuscator output. Ship minified, not obfuscated, code.` });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // escape-sequence density (character-encoding obfuscation); skipped in minified bundles (unicode tables)
    if (!minified) {
      const esc = line.match(/\\x[0-9a-fA-F]{2}|\\u\{[0-9a-fA-F]{1,6}\}|\\u[0-9a-fA-F]{4}/g);
      if (esc && esc.length >= 8 && esc.join('').length / line.trim().length >= 0.3) {
        const inRegex = /new RegExp|(^|[=(,:]\s*)\/[^/*]/.test(line) && /\[[^\]]*\\u/.test(line);
        add({ check: 'obfuscation.escape-density', code: 'Red Titanium', severity: 'high', confidence: inRegex ? 'low' : 'medium', file: rel(path), line: i + 1,
          snippet: snippetAt(line, line.indexOf('\\'), 40),
          message: `${esc.length} \\x/\\u escapes on one line — character-encoded strings count as obfuscation unless it is a regex/unicode table.` });
      }
    }

    for (const r of RULES) {
      if (r.html && !isHtml) continue;
      if (minified && !r.minified && !r.minifiedConfidence) continue;
      r.re.lastIndex = 0;
      let m;
      while ((m = r.re.exec(line)) !== null) {
        let conf = r.confidence;
        if (r.filter) {
          const res = r.filter(line, m);
          if (res === false) { if (m[0].length === 0) r.re.lastIndex++; continue; }
          if (res) conf = res;
        }
        if (minified && r.minifiedConfidence) conf = r.minifiedConfidence;
        add({ check: r.id, code: r.code, severity: r.severity, confidence: conf, file: rel(path), line: i + 1,
          snippet: snippetAt(line, m.index, m[0].length), message: r.message });
        if (m[0].length === 0) r.re.lastIndex++;
      }
    }
  }
}
const allCode = corpus.join('\n');

// ---------- manifest ----------
function readJson(p) {
  try { return JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, '')); } catch (e) { return { __error: e.message }; }
}
const BUNDLER_CONFIG = /^(vite|webpack|rollup|esbuild|parcel|wxt|plasmo|rspack|tsup)\.config\.[cm]?[jt]s$/;
const hasBundler = readdirSync(root).some((n) => BUNDLER_CONFIG.test(n));
const BUILT_CANDIDATES = ['.output/chrome-mv3', 'build/chrome-mv3-prod', 'dist', 'build'];

let manifestPath = null, manifest = null, manifestSource = null;
const candidates = buildDir
  ? [join(buildDir, 'manifest.json')]
  : ['manifest.json', 'src/manifest.json', 'extension/manifest.json', 'public/manifest.json'].map((p) => join(root, p));
for (const c of candidates) if (existsSync(c)) { manifestPath = c; break; }
if (manifestPath) {
  manifest = readJson(manifestPath);
  manifestSource = buildDir ? 'build' : 'source';
  if (manifest.__error) {
    add({ check: 'manifest.invalid-json', code: 'Yellow Magnesium', severity: 'critical', confidence: 'high', file: rel(manifestPath),
      message: `manifest.json does not parse: ${manifest.__error}` });
    manifest = null;
  }
} else {
  const pkgPath = join(root, 'package.json');
  const pkg = existsSync(pkgPath) ? readJson(pkgPath) : null;
  if (pkg && pkg.manifest && typeof pkg.manifest === 'object') { // Plasmo keeps overrides in package.json
    manifest = { name: pkg.displayName || pkg.name, description: pkg.description, ...pkg.manifest };
    manifestPath = pkgPath; manifestSource = 'package.json';
  }
  const built = BUILT_CANDIDATES.find((d) => existsSync(join(root, d, 'manifest.json')));
  add({ check: 'meta.manifest-not-found', code: '—', severity: 'review', confidence: 'high', file: null,
    message: built
      ? `No source manifest.json (framework-generated). Re-run with --build ${built} to check the package CWS receives.`
      : 'No manifest.json found (WXT/Plasmo generate it). Build for production, then re-run with --build <output dir>.' });
}
if (!buildDir && manifestPath && manifestSource === 'source') {
  const built = BUILT_CANDIDATES.find((d) => existsSync(join(root, d, 'manifest.json')));
  if (built) add({ check: 'meta.build-not-scanned', code: '—', severity: 'review', confidence: 'high', file: null,
    message: `Built package found at ${built}; re-run with --build ${built} to scan what CWS actually reviews.` });
}

const API_FOR_PERMISSION = {
  alarms: 'alarms', bookmarks: 'bookmarks', browsingData: 'browsingData', contentSettings: 'contentSettings',
  contextMenus: 'contextMenus|menus', cookies: 'cookies', debugger: 'debugger', declarativeContent: 'declarativeContent',
  declarativeNetRequest: 'declarativeNetRequest', declarativeNetRequestWithHostAccess: 'declarativeNetRequest',
  declarativeNetRequestFeedback: 'declarativeNetRequest', desktopCapture: 'desktopCapture', downloads: 'downloads',
  fontSettings: 'fontSettings', gcm: 'gcm|instanceID', history: 'history', identity: 'identity', idle: 'idle',
  management: 'management', nativeMessaging: 'runtime\\.(?:connectNative|sendNativeMessage)', notifications: 'notifications',
  offscreen: 'offscreen', pageCapture: 'pageCapture', power: 'power', printerProvider: 'printerProvider', privacy: 'privacy',
  proxy: 'proxy', readingList: 'readingList', scripting: 'scripting', search: 'search', sessions: 'sessions',
  sidePanel: 'sidePanel', storage: 'storage', 'system.cpu': 'system\\.cpu', 'system.memory': 'system\\.memory',
  'system.display': 'system\\.display', 'system.storage': 'system\\.storage', tabCapture: 'tabCapture', tabGroups: 'tabGroups',
  topSites: 'topSites', tts: 'tts', ttsEngine: 'ttsEngine', webNavigation: 'webNavigation', webRequest: 'webRequest',
  userScripts: 'userScripts', printing: 'printing', documentScan: 'documentScan', dns: 'dns', favicon: '__FAVICON__',
  geolocation: '__GEO__', clipboardWrite: '__CLIPW__', clipboardRead: '__CLIPR__',
};
const SPECIAL_USAGE = {
  __FAVICON__: /_favicon\//, __GEO__: /navigator\.geolocation/,
  __CLIPW__: /navigator\.clipboard\.write|execCommand\(\s*["'](copy|cut)/, __CLIPR__: /navigator\.clipboard\.read|execCommand\(\s*["']paste/,
};
// Wrapper libraries call chrome.storage internally (WXT storage, @plasmohq/storage).
const STORAGE_WRAPPER = /['"](?:wxt\/utils\/storage|wxt\/storage|@wxt-dev\/storage|@plasmohq\/storage(?:\/[\w-]+)?)['"]|import\s*\{[^}]*\bstorage\b[^}]*\}\s*from\s*['"]#imports['"]|(?<![.\w$])storage\.(?:defineItem|getItem|setItem|getItems|setItems|removeItem|removeItems|watch|getMeta|setMeta|removeMeta)\s*\(/;
function apiUsed(perm) {
  const api = API_FOR_PERMISSION[perm];
  if (!api) return null; // unknown → not judged
  if (SPECIAL_USAGE[api]) return SPECIAL_USAGE[api].test(allCode);
  if (perm === 'storage' && STORAGE_WRAPPER.test(allCode)) return true;
  if (perm.startsWith('declarativeNetRequest') && manifest?.declarative_net_request) return true;
  if (perm === 'sidePanel' && manifest?.side_panel) return true;
  return new RegExp(`\\b(?:chrome|browser)\\s*\\.\\s*(?:${api})\\b|\\b(?:chrome|browser)\\s*\\[\\s*["'](?:${api})["']\\s*\\]`).test(allCode);
}
const BROAD = /^(<all_urls>|\*:\/\/\*\/\*|https?:\/\/\*\/\*|file:\/\/\/\*|\*:\/\/\*\/.*|https?:\/\/\*\/.*)$/;

function resolveMsg(str) {
  if (typeof str !== 'string') return str;
  const m = str.match(/^__MSG_(\w+)__$/);
  if (!m || !manifestPath) return str;
  const loc = manifest.default_locale || 'en';
  const msgs = readJson(join(dirname(manifestPath), '_locales', loc, 'messages.json'));
  const hit = msgs && !msgs.__error && Object.entries(msgs).find(([k]) => k.toLowerCase() === m[1].toLowerCase());
  return hit ? hit[1].message : str;
}

if (manifest) {
  const mf = rel(manifestPath);
  const mdir = dirname(manifestPath);
  const mfText = manifestSource !== 'package.json' ? readFileSync(manifestPath, 'utf8') : '';
  const lineOf = (needle) => { const i = mfText.split(/\r?\n/).findIndex((l) => l.includes(needle)); return i >= 0 ? i + 1 : null; };
  const mAdd = (o) => add({ file: mf, line: o.needle ? lineOf(o.needle) : null, snippet: o.needle || '', ...o }, { capKey: false });

  if (manifest.manifest_version && manifest.manifest_version !== 3) {
    mAdd({ check: 'manifest.version', code: '—', severity: 'critical', confidence: 'high', needle: '"manifest_version"',
      message: 'CWS only accepts Manifest V3 packages; migrate to MV3.' });
  }

  // name / description
  const name = resolveMsg(manifest.name) || '';
  const desc = resolveMsg(manifest.description) || '';
  if (!name) mAdd({ check: 'manifest.name', code: 'Yellow Zinc', severity: 'high', confidence: 'high', message: 'Missing name.' });
  else if (name.length > 75) mAdd({ check: 'manifest.name', code: 'Yellow Zinc', severity: 'high', confidence: 'high', needle: '"name"',
    message: `Name is ${name.length} chars; the limit is 75.` });
  if (!desc) mAdd({ check: 'manifest.description', code: 'Yellow Zinc', severity: 'high', confidence: 'high',
    message: 'Missing description; CWS listings need a meaningful one.' });
  else if (desc.length > 132) mAdd({ check: 'manifest.description', code: 'Yellow Zinc', severity: 'high', confidence: 'high',
    needle: '"description"', message: `Description is ${desc.length} chars; the manifest limit is 132.` });
  else if (desc.length < 25 || /^(a |an |my )?(chrome |browser )?extension\.?$/i.test(desc.trim()))
    mAdd({ check: 'manifest.description', code: 'Yellow Zinc', severity: 'medium', confidence: 'medium', needle: '"description"',
      snippet: desc, message: 'Description is too short/generic to explain the functionality.' });

  // keyword stuffing heuristic
  const meta = `${name} ${desc}`;
  const STOP = new Set(['with', 'your', 'this', 'that', 'from', 'into', 'more', 'than', 'have', 'will', 'just', 'what', 'when', 'easy', 'best', 'free']);
  const counts = {};
  // repeats are counted in the description only: echoing the name once is normal
  for (const w of desc.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || []) if (!STOP.has(w)) counts[w] = (counts[w] || 0) + 1;
  const repeated = Object.entries(counts).filter(([, n]) => n >= 3).map(([w, n]) => `${w}×${n}`);
  const domains = meta.match(/\b[a-z0-9-]+\.(com|net|org|io|tv|co|me|app)\b/gi) || [];
  const BRANDS = /\b(youtube|facebook|instagram|twitter|tiktok|netflix|amazon|google|gmail|reddit|linkedin|whatsapp|spotify|twitch|pinterest|chatgpt|openai|claude|gemini|discord|telegram|ebay|shopify|etsy|x\.com)\b/gi;
  const brands = new Set((meta.match(BRANDS) || []).map((b) => b.toLowerCase()));
  const segments = desc.split(/[,|•·;]/).map((s) => s.trim()).filter(Boolean);
  const listy = segments.length >= 7 && segments.reduce((a, s) => a + s.split(/\s+/).length, 0) / segments.length <= 3;
  const reasons = [];
  if (repeated.length) reasons.push(`repeated words: ${repeated.join(', ')}`);
  if (domains.length >= 3) reasons.push(`${domains.length} site names`);
  if (brands.size >= 4) reasons.push(`${brands.size} brand names (${[...brands].join(', ')})`);
  if (listy) reasons.push('description is a keyword list');
  if (reasons.length) mAdd({ check: 'listing.keyword-stuffing', code: 'Yellow Argon', severity: 'medium',
    confidence: reasons.length > 1 ? 'medium' : 'low', needle: '"description"', snippet: meta.slice(0, 140),
    message: `Possible keyword stuffing (${reasons.join('; ')}). Apply the same check to the store listing text.` });

  // icons
  const icons = manifest.icons || {};
  const sizes = { 128: 'high', 48: 'medium', 16: 'low' };
  for (const [size, sev] of Object.entries(sizes)) {
    if (!icons[size]) mAdd({ check: 'manifest.icons', code: 'Yellow Zinc', severity: sev, confidence: 'high', needle: Object.keys(icons).length ? '"icons"' : undefined,
      message: size === '128' ? 'No 128×128 icon; it is used at install and by CWS.' : `No ${size}×${size} icon in "icons".` });
  }
  for (const [size, p] of Object.entries(icons)) {
    if (typeof p === 'string' && /\.(svg|webp)$/i.test(p)) mAdd({ check: 'manifest.icons', code: 'Yellow Magnesium', severity: 'high',
      confidence: 'high', needle: p, message: `Icon ${size} is ${extname(p)}; manifest icons must be raster (PNG recommended), SVG/WebP unsupported.` });
  }

  // referenced files exist (exact case) — only meaningful for the package manifest
  const checkFiles = manifestSource === 'build' || (manifestSource === 'source' && !hasBundler && dirname(manifestPath) === root);
  if (checkFiles) {
    const refs = new Set();
    const push = (v) => { if (typeof v === 'string' && v && !/^(https?:|data:)/.test(v) && !v.includes('*')) refs.add(v.replace(/^\//, '')); };
    Object.values(icons).forEach(push);
    const act = manifest.action || manifest.browser_action || manifest.page_action || {};
    push(act.default_popup);
    if (typeof act.default_icon === 'string') push(act.default_icon); else Object.values(act.default_icon || {}).forEach(push);
    push(manifest.background?.service_worker); (manifest.background?.scripts || []).forEach(push); push(manifest.background?.page);
    for (const cs of manifest.content_scripts || []) { (cs.js || []).forEach(push); (cs.css || []).forEach(push); }
    push(manifest.options_page); push(manifest.options_ui?.page); push(manifest.side_panel?.default_path); push(manifest.devtools_page);
    Object.values(manifest.chrome_url_overrides || {}).forEach(push);
    for (const r of manifest.declarative_net_request?.rule_resources || []) push(r.path);
    if (manifest.default_locale) push(`_locales/${manifest.default_locale}/messages.json`);
    for (const r of refs) {
      const status = existsExactCase(mdir, r);
      if (status !== 'ok') mAdd({ check: 'manifest.missing-file', code: 'Yellow Magnesium', severity: 'high', confidence: 'high', needle: r,
        message: status === 'case' ? `"${r}" exists only with different letter case; fails on case-sensitive systems.` : `"${r}" referenced in manifest but not in the package.` });
    }
  }

  // CSP
  const csp = manifest.content_security_policy;
  const pagesCsp = typeof csp === 'string' ? csp : csp?.extension_pages;
  if (pagesCsp && (/'unsafe-eval'/.test(pagesCsp) || /script-src[^;]*\b(https?:|\*)/.test(pagesCsp))) {
    mAdd({ check: 'remote-code.csp', code: 'Blue Argon', severity: 'critical', confidence: 'high', needle: 'content_security_policy',
      snippet: pagesCsp.slice(0, 140), message: "extension_pages CSP allows eval or remote script sources; MV3 rejects this ('wasm-unsafe-eval' is allowed)." });
  }

  // permissions
  const perms = (manifest.permissions || []).filter((p) => typeof p === 'string');
  const optPerms = (manifest.optional_permissions || []).filter((p) => typeof p === 'string');
  const hosts = [...(manifest.host_permissions || []), ...perms.filter((p) => p.includes('://') || p === '<all_urls>')];
  const csMatches = (manifest.content_scripts || []).flatMap((c) => c.matches || []);
  const broad = [...new Set([...hosts, ...csMatches].filter((h) => BROAD.test(h)))];
  if (broad.length) mAdd({ check: 'permissions.broad-host', code: 'Purple Potassium', severity: 'medium', confidence: 'medium',
    needle: broad[0], snippet: broad.join(', '),
    message: 'Broad host access triggers in-depth review and the "read and change all your data" warning; narrow to specific origins or use activeTab if the feature is user-invoked.' });
  if (perms.includes('activeTab') && broad.length) mAdd({ check: 'permissions.redundant', code: 'Purple Potassium', severity: 'medium',
    confidence: 'medium', needle: '"activeTab"', message: 'activeTab is redundant alongside broad host permissions; drop one.' });
  if (perms.includes('tabs') && (broad.length || !/\.(url|pendingUrl|title|favIconUrl)\b/.test(allCode)))
    mAdd({ check: 'permissions.unused', code: 'Purple Potassium', severity: 'medium', confidence: 'low', needle: '"tabs"',
      message: '"tabs" only unlocks Tab.url/pendingUrl/title/favIconUrl; chrome.tabs methods work without it, and broad host access already grants these.' });
  const unused = [];
  for (const p of perms) { if (p !== 'tabs' && apiUsed(p) === false) unused.push(p); }
  for (const p of unused) mAdd({ check: 'permissions.unused', code: 'Purple Potassium', severity: 'high', confidence: 'medium',
    needle: `"${p}"`, message: `No chrome./browser.${API_FOR_PERMISSION[p].split('|')[0].replace(/\\/g, '')} usage found for permission "${p}"; remove it or confirm indirect use.` });
  for (const p of optPerms) if (apiUsed(p) === false) mAdd({ check: 'permissions.unused', code: 'Purple Potassium', severity: 'medium',
    confidence: 'low', needle: `"${p}"`, message: `Optional permission "${p}" has no matching API usage.` });

  // privacy policy hint
  const DATA_PERMS = ['cookies', 'history', 'webRequest', 'identity', 'tabs', 'webNavigation', 'topSites', 'bookmarks', 'sessions', 'geolocation', 'browsingData', 'identity.email'];
  const dataPerms = perms.filter((p) => DATA_PERMS.includes(p));
  if (broad.length) dataPerms.push('broad host access');
  const network = /\bfetch\s*\(|XMLHttpRequest|sendBeacon|new\s+WebSocket|axios|\$\.ajax/.test(allCode);
  if (dataPerms.length && network) {
    const policyFile = existsSync(root) && readdirSync(root).find((n) => /privacy/i.test(n));
    const policyUrl = /https:\/\/[^\s'"`]*privacy[^\s'"`]*/i.exec(allCode)?.[0];
    mAdd({ check: 'privacy.policy-required', code: 'Purple Lithium', severity: 'high', confidence: policyFile || policyUrl ? 'low' : 'medium',
      message: `Uses data-access APIs (${dataPerms.join(', ')}) plus network calls: a privacy policy URL must be set in the CWS Developer Dashboard Privacy tab (the manifest has no field for it)${policyFile || policyUrl ? `; found ${policyFile || policyUrl} — confirm it is linked there and covers collection, use, sharing` : ''}.` });
  }
}

function existsExactCase(base, relPath) {
  let dir = base;
  for (const part of relPath.split('/').filter(Boolean)) {
    if (part === '.') continue;
    if (part === '..') { dir = dirname(dir); continue; }
    let names; try { names = readdirSync(dir); } catch { return 'missing'; }
    if (names.includes(part)) { dir = join(dir, part); continue; }
    return names.some((n) => n.toLowerCase() === part.toLowerCase()) ? 'case' : 'missing';
  }
  return 'ok';
}

// ---------- output ----------
findings.sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity)
  || String(a.file).localeCompare(String(b.file)) || (a.line || 0) - (b.line || 0));
const counts = Object.fromEntries(SEV_ORDER.map((s) => [s, findings.filter((f) => f.severity === s).length]));
const suppressedList = Object.entries(suppressed).map(([k, n]) => { const [file, check] = k.split('|'); return { file, check, count: n }; });
const result = {
  root, buildDir, manifest: manifestPath ? rel(manifestPath) : null, manifestSource,
  scannedFiles: scannedCount, minifiedFiles, counts, findings, suppressed: suppressedList,
};

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const out = [];
  out.push(`CWS pre-submission scan: ${root}${buildDir ? `  (+ build: ${rel(buildDir)})` : ''}`);
  out.push(`Manifest: ${result.manifest ?? 'not found'}${manifestSource ? ` [${manifestSource}]` : ''} · files scanned: ${scannedCount}`);
  out.push(`Findings: ${SEV_ORDER.map((s) => `${s} ${counts[s]}`).join(' · ')}`, '');
  for (const f of findings) {
    const loc = f.file ? `${f.file}${f.line ? `:${f.line}` : ''}` : '(project)';
    out.push(`[${f.severity.toUpperCase()}] ${f.check} (${f.code}) ${loc} — confidence ${f.confidence}`);
    out.push(`    ${f.message}`);
    if (f.snippet) out.push(`    > ${f.snippet}`);
  }
  for (const s of suppressedList) out.push(`(+${s.count} more ${s.check} in ${s.file})`);
  if (!findings.length) out.push('No statically detectable issues. Still run the judgement checks.');
  console.log(out.join('\n'));
}
