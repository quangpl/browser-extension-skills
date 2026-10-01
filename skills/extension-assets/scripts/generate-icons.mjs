#!/usr/bin/env node
// Rasterize one SVG/PNG source into extension icon PNGs.
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';

const HELP = `generate-icons.mjs — SVG/PNG → extension icon PNGs (uses sharp)

Usage:
  node generate-icons.mjs <source.svg|source.png> [options]

Options:
  --root <dir>     Project root used for layout detection (default: .)
  --out <dir>      Output directory (default: detected from --root)
                     WXT     → public/icon/<size>.png   (auto-discovered by WXT)
                     Plasmo  → assets/icon.png 512px    (Plasmo derives all sizes)
                     vanilla → icons/icon<size>.png (public/icons/ if public/manifest.json exists)
  --sizes <list>   Comma-separated sizes (default: 16,32,48,128)
  --no-pad         Do not pad sizes >= 128. By default the 128px icon gets 16px
                   transparent padding per side (96px artwork), per CWS guidance.
  --preview        Also write a contact sheet (all sizes + 16px zoomed 4x, on light
                   and dark backgrounds) to the OS temp dir for a legibility check.
  --json           Machine-readable output
  -h, --help       Show this help

Requires sharp:  npm i -D sharp`;

function parseArgs(argv) {
  const opts = { root: '.', out: null, sizes: [16, 32, 48, 128], pad: true, preview: false, json: false, source: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) usage(`Missing value for ${a}`);
      return v;
    };
    if (a === '-h' || a === '--help') { console.log(HELP); process.exit(0); }
    else if (a === '--root') opts.root = next();
    else if (a === '--out') opts.out = next();
    else if (a === '--sizes') {
      opts.sizes = next().split(',').map((s) => Number(s.trim()));
      if (opts.sizes.some((n) => !Number.isInteger(n) || n < 1 || n > 2048)) usage('--sizes must be integers between 1 and 2048');
    }
    else if (a === '--no-pad') opts.pad = false;
    else if (a === '--preview') opts.preview = true;
    else if (a === '--json') opts.json = true;
    else if (a.startsWith('-')) usage(`Unknown option ${a}`);
    else if (!opts.source) opts.source = a;
    else usage(`Unexpected argument ${a}`);
  }
  if (!opts.source) usage('Missing <source> (SVG, or PNG ≥ 512px).');
  return opts;
}

function usage(msg) {
  console.error(`Error: ${msg}\n\n${HELP}`);
  process.exit(2);
}

function readPkg(root) {
  try { return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')); } catch { return {}; }
}

function detectLayout(root) {
  const pkg = readPkg(root);
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const files = existsSync(root) ? readdirSync(root) : [];
  if (deps.wxt || files.some((f) => /^wxt\.config\.(m?[jt]s)$/.test(f))) {
    const srcPublic = existsSync(join(root, 'src', 'public')) && !existsSync(join(root, 'public'));
    return { kind: 'wxt', dir: join(root, srcPublic ? 'src/public' : 'public', 'icon'), name: (s) => `${s}.png` };
  }
  if (deps.plasmo) {
    const srcAssets = existsSync(join(root, 'src', 'assets')) && !existsSync(join(root, 'assets'));
    return { kind: 'plasmo', dir: join(root, srcAssets ? 'src/assets' : 'assets'), name: () => 'icon.png', sizes: [512] };
  }
  const dir = existsSync(join(root, 'public', 'manifest.json')) ? join(root, 'public', 'icons') : join(root, 'icons');
  return { kind: 'vanilla', dir, name: (s) => `icon${s}.png` };
}

// Resolve sharp from the target project first (the script lives outside it), then from the script's own location.
async function loadSharp(root) {
  try {
    const path = createRequire(join(root, 'package.json')).resolve('sharp');
    return (await import(pathToFileURL(path).href)).default;
  } catch {}
  try {
    return (await import('sharp')).default;
  } catch {
    console.error('sharp is not installed. Install it in the project, then re-run:\n  npm i -D sharp');
    process.exit(2);
  }
}

async function render(sharp, input, isSvg, size, pad) {
  const art = pad && size >= 128 ? Math.round(size * 0.75) : size; // 96/128 artwork per CWS
  let density;
  if (isSvg) {
    const meta = await sharp(input).metadata();
    density = Math.min(2400, Math.ceil((72 * art) / Math.min(meta.width || art, meta.height || art)) * 2);
  }
  const resized = await sharp(input, density ? { density } : {})
    .resize(art, art, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  if (art === size) return resized;
  const inset = Math.floor((size - art) / 2);
  return sharp(resized)
    .extend({ top: inset, bottom: size - art - inset, left: inset, right: size - art - inset, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function writePreview(sharp, rendered) {
  const gap = 16;
  const tiles = [...rendered.map((r) => ({ buf: r.buf, w: r.size }))];
  const smallest = rendered.reduce((a, b) => (a.size <= b.size ? a : b));
  const zoom = await sharp(smallest.buf).resize(smallest.size * 4, smallest.size * 4, { kernel: 'nearest' }).png().toBuffer();
  tiles.push({ buf: zoom, w: smallest.size * 4 });
  const rowH = Math.max(...tiles.map((t) => t.w)) + gap * 2;
  const width = tiles.reduce((s, t) => s + t.w + gap, gap);
  const composites = [];
  [0, 1].forEach((row) => {
    let x = gap;
    for (const t of tiles) {
      composites.push({ input: t.buf, left: x, top: row * rowH + Math.round((rowH - t.w) / 2) });
      x += t.w + gap;
    }
  });
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${rowH * 2}">` +
      `<rect width="100%" height="${rowH}" fill="#f1f3f4"/><rect y="${rowH}" width="100%" height="${rowH}" fill="#202124"/></svg>`,
  );
  const file = join(tmpdir(), `icon-preview-${Date.now()}.png`);
  await sharp(bg).composite(composites).png().toFile(file);
  return file;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const source = resolve(opts.source);
  if (!existsSync(source)) usage(`Source not found: ${source}`);
  const ext = extname(source).toLowerCase();
  if (!['.svg', '.png'].includes(ext)) usage('Source must be .svg or .png');

  const root = resolve(opts.root);
  const layout = detectLayout(root);
  const outDir = opts.out ? resolve(opts.out) : layout.dir;
  const custom = Boolean(opts.out);
  const sizes = !custom && layout.sizes ? layout.sizes : opts.sizes;
  const nameFor = custom ? (s) => `icon${s}.png` : layout.name;

  const sharp = await loadSharp(root);
  const input = readFileSync(source);
  const isSvg = ext === '.svg';
  const warnings = [];
  if (!isSvg) {
    const { width = 0, height = 0 } = await sharp(input).metadata();
    if (Math.min(width, height) < Math.max(...sizes, 512)) warnings.push(`Source PNG is ${width}x${height}; use an SVG or a PNG ≥ 512px for crisp output.`);
    if (width !== height) warnings.push('Source is not square; it will be letterboxed with transparency.');
  }

  mkdirSync(outDir, { recursive: true });
  const rendered = [];
  for (const size of sizes) {
    const buf = await render(sharp, input, isSvg, size, opts.pad && layout.kind !== 'plasmo');
    const file = join(outDir, nameFor(size));
    await sharp(buf).toFile(file);
    rendered.push({ size, file, buf });
  }
  const preview = opts.preview ? await writePreview(sharp, rendered) : null;

  const result = {
    layout: custom ? 'custom' : layout.kind,
    outDir,
    files: rendered.map(({ size, file }) => ({ size, file })),
    preview,
    warnings,
  };
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`Layout: ${result.layout} → ${outDir}`);
  for (const f of result.files) console.log(`  wrote ${f.file} (${f.size}x${f.size})`);
  if (layout.kind === 'plasmo' && !custom) console.log('  Plasmo generates the smaller sizes from this file at build time.');
  if (preview) console.log(`Preview: ${preview}`);
  for (const w of warnings) console.log(`Warning: ${w}`);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
