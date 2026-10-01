#!/usr/bin/env node
// Validate every skills/<name>/ directory against the repository's skill rules.
// Zero dependencies, Node >= 18. Usage: node scripts/validate-skills.mjs [--json] [skill-dir ...]

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_ROOT = join(REPO_ROOT, 'skills');

const ALLOWED_KEYS = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_LINES = 150;
const CONTENTS_THRESHOLD = 100;
const DESCRIPTION_MAX = 1024;
const DESCRIPTION_WARN = 400;
const SHORT_DESCRIPTION_MAX = 80;
const BANNED = [
  { re: /docs-seeker/, label: '`docs-seeker` (skill not bundled in this repo)' },
  { re: /ai-multimodal/, label: '`ai-multimodal` (skill not bundled in this repo)' },
  { re: /\bck:[a-z]/, label: '`ck:*` command (not bundled in this repo)' },
  { re: /Do NOT just explain/i, label: '"Do NOT just explain" (old-model crutch)' },
  { re: /\(Execute This\)/i, label: '"(Execute This)" (old-model crutch)' },
  { re: /When to Activate/i, label: '"When to Activate" section (restates the description)' },
];
const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db']);

const HELP = `Usage: node scripts/validate-skills.mjs [options] [skill-dir ...]

Validates skills/*/ (or the given skill directories) against the repo rules:
frontmatter, line limits, links, reference coverage, agents/openai.yaml.

Options:
  --json     Print machine-readable JSON instead of text
  -h, --help Show this help

Exit code: 0 when no errors (warnings allowed), 1 when any error, 2 on usage errors.`;

// ---------- small helpers ----------

function countLines(text) {
  if (text === '') return 0;
  const lines = text.split(/\r?\n/);
  if (lines[lines.length - 1] === '') lines.pop();
  return lines.length;
}

function walkFiles(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_FILES.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

const toPosix = (p) => p.split(sep).join('/');
const isInside = (child, parent) => child === parent || child.startsWith(parent + sep);

// Remove fenced code blocks, keeping line structure; return [prose, fencedText].
function splitFences(text) {
  const prose = [];
  const fenced = [];
  let fence = null;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
      else fenced.push(line);
      prose.push('');
    } else if (m) {
      fence = m[1];
      prose.push('');
    } else {
      prose.push(line);
    }
  }
  return [prose.join('\n'), fenced.join('\n')];
}

function markdownLinks(prose) {
  const links = [];
  const re = /!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
  for (const m of prose.matchAll(re)) links.push(m[1]);
  return links;
}

function isLocalLink(target) {
  return !/^[a-z][a-z0-9+.-]*:/i.test(target) && !target.startsWith('#') && !target.startsWith('/');
}

function stripFragment(target) {
  let t = target.split('#')[0].split('?')[0];
  try {
    t = decodeURIComponent(t);
  } catch {
    // keep raw target
  }
  return t;
}

const PATH_MENTION_RE = /(?:^|[\s/("'=])((?:references|scripts)\/[A-Za-z0-9._\/-]*[A-Za-z0-9_-])/g;

function pathMentions(text) {
  const out = [];
  for (const m of text.matchAll(PATH_MENTION_RE)) out.push(m[1]);
  return out;
}

function inlineCodeSpans(prose) {
  const spans = [];
  for (const m of prose.matchAll(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g)) spans.push(m[2]);
  return spans;
}

// ---------- strict frontmatter parser (subset) ----------

class ParseError extends Error {}

function parseDoubleQuoted(raw, lineNo) {
  // raw starts with '"'
  let out = '';
  let i = 1;
  const escapes = { '"': '"', '\\': '\\', '/': '/', n: '\n', t: '\t', r: '\r', '0': '\0', b: '\b', f: '\f', ' ': ' ' };
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '\\') {
      const next = raw[i + 1];
      if (next === undefined) throw new ParseError(`line ${lineNo}: unterminated escape in double-quoted string`);
      if (next === 'u' || next === 'x' || next === 'U') {
        const len = next === 'x' ? 2 : next === 'u' ? 4 : 8;
        const hex = raw.slice(i + 2, i + 2 + len);
        if (!new RegExp(`^[0-9a-fA-F]{${len}}$`).test(hex)) {
          throw new ParseError(`line ${lineNo}: invalid \\${next} escape`);
        }
        out += String.fromCodePoint(parseInt(hex, 16));
        i += 2 + len;
        continue;
      }
      if (!(next in escapes)) throw new ParseError(`line ${lineNo}: unsupported escape \\${next}`);
      out += escapes[next];
      i += 2;
      continue;
    }
    if (ch === '"') {
      const rest = raw.slice(i + 1).trim();
      if (rest !== '' && !rest.startsWith('#')) {
        throw new ParseError(`line ${lineNo}: unexpected text after closing quote: ${rest}`);
      }
      return out;
    }
    out += ch;
    i += 1;
  }
  throw new ParseError(`line ${lineNo}: unterminated double-quoted string (must be a single line)`);
}

function parseSingleQuoted(raw, lineNo) {
  let out = '';
  let i = 1;
  while (i < raw.length) {
    if (raw[i] === "'") {
      if (raw[i + 1] === "'") {
        out += "'";
        i += 2;
        continue;
      }
      const rest = raw.slice(i + 1).trim();
      if (rest !== '' && !rest.startsWith('#')) {
        throw new ParseError(`line ${lineNo}: unexpected text after closing quote: ${rest}`);
      }
      return out;
    }
    out += raw[i];
    i += 1;
  }
  throw new ParseError(`line ${lineNo}: unterminated single-quoted string (must be a single line)`);
}

function parseScalar(raw, lineNo) {
  const value = raw.trim();
  if (value === '') throw new ParseError(`line ${lineNo}: empty value`);
  if (value[0] === '"') return { value: parseDoubleQuoted(value, lineNo), style: 'double' };
  if (value[0] === "'") return { value: parseSingleQuoted(value, lineNo), style: 'single' };
  if (/^[\[\]{}>|&*!%@`#,?-]/.test(value) && !/^-?\d/.test(value)) {
    throw new ParseError(`line ${lineNo}: unsupported YAML syntax "${value.slice(0, 20)}" (use a double-quoted string)`);
  }
  if (/:\s|:$/.test(value)) {
    throw new ParseError(`line ${lineNo}: plain value contains ": " (wrap it in double quotes)`);
  }
  const hash = value.search(/\s#/);
  return { value: (hash === -1 ? value : value.slice(0, hash)).trim(), style: 'plain' };
}

// Returns { data, styles, errors, bodyStart }. Unparseable lines are reported and skipped;
// a top-level key whose value can't be parsed is recorded as null.
function parseFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') throw new ParseError('SKILL.md must start with a "---" frontmatter line');
  const end = lines.indexOf('---', 1);
  if (end === -1) throw new ParseError('frontmatter is not closed with "---"');
  const data = {};
  const styles = {};
  const errors = [];
  let currentMap = null;
  for (let i = 1; i < end; i += 1) {
    const lineNo = i + 1;
    const line = lines[i];
    if (line.trim() === '' || /^\s*#/.test(line)) continue;
    let key = null;
    let topLevel = false;
    try {
      if (/\t/.test(line.match(/^\s*/)[0])) throw new ParseError(`line ${lineNo}: tabs are not allowed for indentation`);
      const indent = line.match(/^ */)[0].length;
      const m = line.trim().match(/^([A-Za-z0-9_-]+):(?:\s+(.*))?$/);
      if (!m) throw new ParseError(`line ${lineNo}: cannot parse "${line.trim().slice(0, 40)}"`);
      key = m[1];
      topLevel = indent === 0;
      const rawValue = m[2] ?? '';
      if (topLevel) {
        if (key in data) throw new ParseError(`line ${lineNo}: duplicate key "${key}"`);
        currentMap = null;
        if (rawValue.trim() === '' || rawValue.trim().startsWith('#')) {
          data[key] = {};
          currentMap = data[key];
        } else {
          const parsed = parseScalar(rawValue, lineNo);
          data[key] = parsed.value;
          styles[key] = parsed.style;
        }
      } else {
        if (!currentMap) throw new ParseError(`line ${lineNo}: unexpected indentation`);
        if (indent !== 2) throw new ParseError(`line ${lineNo}: nested keys must be indented by exactly 2 spaces`);
        if (rawValue.trim() === '') throw new ParseError(`line ${lineNo}: only one level of nesting is supported`);
        if (key in currentMap) throw new ParseError(`line ${lineNo}: duplicate key "${key}"`);
        currentMap[key] = parseScalar(rawValue, lineNo).value;
      }
    } catch (err) {
      if (!(err instanceof ParseError)) throw err;
      errors.push(err.message);
      if (topLevel && key !== null && !(key in data)) data[key] = null;
    }
  }
  return { data, styles, errors, bodyStart: end + 1 };
}

// ---------- checks ----------

function checkFrontmatter(skillDir, text, report) {
  let parsed;
  try {
    parsed = parseFrontmatter(text);
  } catch (err) {
    if (err instanceof ParseError) {
      report.error(`SKILL.md frontmatter: ${err.message}`);
      return null;
    }
    throw err;
  }
  const { data, styles } = parsed;
  for (const msg of parsed.errors) report.error(`SKILL.md frontmatter: ${msg}`);
  const dirName = basename(skillDir);

  for (const key of Object.keys(data)) {
    if (!ALLOWED_KEYS.has(key)) report.error(`frontmatter key "${key}" is not allowed (allowed: ${[...ALLOWED_KEYS].join(', ')})`);
  }
  if ('allowed-tools' in data) report.warn('frontmatter "allowed-tools" is harness-specific; prefer omitting it');
  for (const key of ['name', 'description', 'license', 'compatibility', 'allowed-tools']) {
    if (data[key] != null && typeof data[key] !== 'string') report.error(`frontmatter "${key}" must be a string, not a map`);
  }
  if (data.metadata != null && typeof data.metadata !== 'object') report.error('frontmatter "metadata" must be a map');

  const { name, description } = data;
  if (name === null) {
    // parse error already reported
  } else if (typeof name !== 'string' || name === '') {
    report.error('frontmatter "name" is required');
  } else {
    if (!NAME_RE.test(name)) report.error(`name "${name}" must match ${NAME_RE}`);
    if (name.length > 64) report.error(`name is ${name.length} chars (max 64)`);
    if (name !== dirName) report.error(`name "${name}" must equal directory name "${dirName}"`);
    if (/anthropic|claude/.test(name)) report.error('name must not contain "anthropic" or "claude"');
  }

  if (description === null) {
    // parse error already reported
  } else if (typeof description !== 'string' || description.trim() === '') {
    report.error('frontmatter "description" is required');
  } else {
    if (description.length > DESCRIPTION_MAX) report.error(`description is ${description.length} chars (max ${DESCRIPTION_MAX})`);
    else if (description.length > DESCRIPTION_WARN) report.warn(`description is ${description.length} chars (target 200–350)`);
    if (/[<>]/.test(description)) report.error('description must not contain "<" or ">"');
    if (/\n/.test(description)) report.error('description must be a single line');
    if (styles.description !== 'double') report.warn('description should be a double-quoted string');
  }

  if (typeof data.compatibility === 'string' && data.compatibility.length > 500) {
    report.error(`compatibility is ${data.compatibility.length} chars (max 500)`);
  }
  return parsed;
}

function checkLineLimits(skillDir, skillText, report) {
  const n = countLines(skillText);
  if (n > MAX_LINES) report.error(`SKILL.md has ${n} lines (max ${MAX_LINES})`);
  for (const file of walkFiles(join(skillDir, 'references')).filter((f) => f.endsWith('.md'))) {
    const rel = toPosix(relative(skillDir, file));
    const text = readFileSync(file, 'utf8');
    const lines = countLines(text);
    if (lines > MAX_LINES) report.error(`${rel} has ${lines} lines (max ${MAX_LINES})`);
    if (lines > CONTENTS_THRESHOLD) {
      const [prose] = splitFences(text);
      const headings = [...prose.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]);
      const idx = headings.findIndex((h) => /^(table of )?contents$/i.test(h));
      if (idx === -1) report.error(`${rel} has ${lines} lines (> ${CONTENTS_THRESHOLD}) but no "## Contents" section`);
      else if (idx !== 0) report.warn(`${rel}: "## Contents" should be the first "##" section`);
    }
  }
}

function checkSkillLinks(skillDir, skillText, bodyStart, report) {
  const body = skillText.split(/\r?\n/).slice(bodyStart).join('\n');
  const [prose, fenced] = splitFences(body);
  const linked = new Set();
  const mentioned = new Set();

  for (const target of markdownLinks(prose)) {
    if (!isLocalLink(target)) continue;
    const clean = stripFragment(target);
    if (clean === '') continue;
    const abs = resolve(skillDir, clean);
    if (!isInside(abs, skillDir)) {
      report.warn(`SKILL.md links outside the skill directory: ${target} (reference sibling skills by name)`);
      continue;
    }
    if (!existsSync(abs)) report.error(`SKILL.md links to missing file: ${target}`);
    else linked.add(abs);
  }

  for (const span of inlineCodeSpans(prose)) {
    for (const p of pathMentions(span)) {
      const abs = resolve(skillDir, p);
      if (!existsSync(abs)) report.error(`SKILL.md mentions missing path: \`${p}\``);
      else mentioned.add(abs);
    }
  }

  for (const p of pathMentions(fenced)) {
    const abs = resolve(skillDir, p);
    if (!existsSync(abs)) report.warn(`SKILL.md code block mentions missing path: ${p}`);
    else mentioned.add(abs);
  }

  for (const sub of ['references', 'scripts']) {
    for (const file of walkFiles(join(skillDir, sub))) {
      const rel = toPosix(relative(skillDir, file));
      if (linked.has(file)) continue;
      if (mentioned.has(file)) report.warn(`${rel} is mentioned but not linked from SKILL.md; use [${basename(file)}](${rel}) with a "read when" cue`);
      else report.error(`${rel} is not referenced from SKILL.md`);
    }
  }
}

function checkReferenceNesting(skillDir, report) {
  const refDir = join(skillDir, 'references');
  for (const file of walkFiles(refDir).filter((f) => f.endsWith('.md'))) {
    const rel = toPosix(relative(skillDir, file));
    const [prose] = splitFences(readFileSync(file, 'utf8'));
    for (const target of markdownLinks(prose)) {
      if (!isLocalLink(target)) continue;
      const clean = stripFragment(target);
      if (clean === '') continue;
      const abs = resolve(dirname(file), clean);
      if (abs !== file && isInside(abs, refDir)) {
        report.error(`${rel} links to another reference (${target}); keep references one level deep`);
      } else if (!isInside(abs, skillDir)) {
        report.warn(`${rel} links outside the skill directory: ${target}`);
      } else if (!existsSync(abs)) {
        report.error(`${rel} links to missing file: ${target}`);
      }
    }
    for (const span of inlineCodeSpans(prose)) {
      for (const p of pathMentions(span)) {
        if (p.startsWith('references/') && resolve(skillDir, p) !== file) {
          report.warn(`${rel} mentions another reference (\`${p}\`); keep references one level deep`);
        }
      }
    }
  }
}

function checkOpenAIYaml(skillDir, report) {
  const file = join(skillDir, 'agents', 'openai.yaml');
  if (!existsSync(file)) {
    report.error('agents/openai.yaml is missing');
    return;
  }
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const topKeys = [];
  const iface = {};
  let inInterface = false;
  lines.forEach((line, i) => {
    if (line.trim() === '' || /^\s*#/.test(line)) return;
    const top = line.match(/^([A-Za-z0-9_-]+):(.*)$/);
    if (top) {
      topKeys.push(top[1]);
      inInterface = top[1] === 'interface';
      return;
    }
    const sub = line.match(/^ {2}([A-Za-z0-9_-]+):(?:\s+(.*))?$/);
    if (inInterface && sub) {
      try {
        iface[sub[1]] = sub[2] ? parseScalar(sub[2], i + 1).value : '';
      } catch (err) {
        if (!(err instanceof ParseError)) throw err;
        report.error(`agents/openai.yaml: ${err.message}`);
        iface[sub[1]] = '';
      }
    }
  });

  if (!topKeys.includes('interface')) report.error('agents/openai.yaml: missing "interface:"');
  for (const key of topKeys) {
    if (key !== 'interface') report.warn(`agents/openai.yaml: top-level "${key}" is not used by this repo (interface only)`);
  }
  for (const key of ['display_name', 'short_description', 'default_prompt']) {
    if (!(key in iface)) report.error(`agents/openai.yaml: missing "interface.${key}"`);
    else if (iface[key].trim() === '') report.error(`agents/openai.yaml: "interface.${key}" is empty`);
  }
  for (const key of Object.keys(iface)) {
    if (!['display_name', 'short_description', 'default_prompt'].includes(key)) {
      report.warn(`agents/openai.yaml: "interface.${key}" is not used by this repo`);
    }
  }
  const sd = iface.short_description;
  if (typeof sd === 'string' && sd.length > SHORT_DESCRIPTION_MAX) {
    report.error(`agents/openai.yaml: short_description is ${sd.length} chars (max ${SHORT_DESCRIPTION_MAX})`);
  }
}

function checkBannedPatterns(skillDir, report) {
  const files = [join(skillDir, 'SKILL.md'), ...walkFiles(join(skillDir, 'references')).filter((f) => f.endsWith('.md'))];
  for (const file of files) {
    if (!existsSync(file)) continue;
    const rel = toPosix(relative(skillDir, file));
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .forEach((line, i) => {
        for (const { re, label } of BANNED) {
          if (re.test(line)) report.warn(`${rel}:${i + 1}: banned pattern ${label}`);
        }
      });
  }
}

function validateSkill(skillDir) {
  const shownPath = isInside(skillDir, REPO_ROOT) ? toPosix(relative(REPO_ROOT, skillDir)) || '.' : toPosix(skillDir);
  const result = { skill: basename(skillDir), path: shownPath, errors: [], warnings: [] };
  const report = {
    error: (msg) => result.errors.push(msg),
    warn: (msg) => result.warnings.push(msg),
  };
  const skillFile = join(skillDir, 'SKILL.md');
  if (!existsSync(skillFile)) {
    report.error('SKILL.md is missing');
    return result;
  }
  const text = readFileSync(skillFile, 'utf8');
  const parsed = checkFrontmatter(skillDir, text, report);
  checkLineLimits(skillDir, text, report);
  checkSkillLinks(skillDir, text, parsed ? parsed.bodyStart : 0, report);
  checkReferenceNesting(skillDir, report);
  checkOpenAIYaml(skillDir, report);
  checkBannedPatterns(skillDir, report);
  return result;
}

// ---------- CLI ----------

function main(argv) {
  let json = false;
  const targets = [];
  for (const arg of argv) {
    if (arg === '--json') json = true;
    else if (arg === '-h' || arg === '--help') {
      console.log(HELP);
      return 0;
    } else if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}\n\n${HELP}`);
      return 2;
    } else targets.push(arg);
  }

  let skillDirs;
  if (targets.length > 0) {
    skillDirs = targets.map((t) => resolve(t));
    const missing = skillDirs.filter((d) => !existsSync(d) || !statSync(d).isDirectory());
    if (missing.length > 0) {
      console.error(`Not a directory: ${missing.join(', ')}`);
      return 2;
    }
  } else {
    if (!existsSync(SKILLS_ROOT)) {
      console.error(`No skills directory at ${SKILLS_ROOT}`);
      return 2;
    }
    skillDirs = readdirSync(SKILLS_ROOT, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => join(SKILLS_ROOT, e.name))
      .sort();
  }

  const results = skillDirs.map(validateSkill);
  const errorCount = results.reduce((n, r) => n + r.errors.length, 0);
  const warningCount = results.reduce((n, r) => n + r.warnings.length, 0);
  const failed = results.filter((r) => r.errors.length > 0).length;

  if (json) {
    console.log(JSON.stringify({ ok: errorCount === 0, skills: results, summary: { skills: results.length, failed, errors: errorCount, warnings: warningCount } }, null, 2));
  } else {
    for (const r of results) {
      const status = r.errors.length > 0 ? 'FAIL' : r.warnings.length > 0 ? 'WARN' : 'OK';
      console.log(`${status.padEnd(4)} ${r.path}`);
      for (const e of r.errors) console.log(`  error: ${e}`);
      for (const w of r.warnings) console.log(`  warn:  ${w}`);
    }
    console.log(`\n${results.length} skills checked: ${failed} failed, ${errorCount} errors, ${warningCount} warnings`);
  }
  return errorCount > 0 ? 1 : 0;
}

process.exitCode = main(process.argv.slice(2));
