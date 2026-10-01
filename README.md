<div align="center">

<a href="https://extensionbooster.net/">
  <img src="https://extensionbooster.net/logo.webp" alt="Extension Booster" width="120" />
</a>

# Browser Extension Skills

### AI-Powered Chrome Extension Development Toolkit

Production-grade skills for building, testing, analyzing, and publishing<br/>
Chrome & browser extensions with AI coding agents.

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg?style=flat-square)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-f97316.svg?style=flat-square)](https://developer.chrome.com/docs/extensions/develop/migrate)
[![Skills](https://img.shields.io/badge/Skills-12-3b82f6.svg?style=flat-square)](#-skills-overview)
[![Powered by](https://img.shields.io/badge/Powered%20by-Extension%20Booster-7c3aed.svg?style=flat-square)](https://extensionbooster.net/)

**[Get Started](#-installation)** · **[Skills](#-skills-overview)** · **[Quick Start](#-quick-start)** · **[Documentation](#-skill-details)** · **[Contributing](CONTRIBUTING.md)**

</div>

---

## 💎 Diamond Sponsor

<table align="center">
  <tr>
    <td align="center" width="720">
      <br/>
      <a href="https://extensionbooster.net/">
        <img src="https://extensionbooster.net/logo.webp" alt="Extension Booster" width="160" />
      </a>
      <br/><br/>
      <h2>Extension Booster</h2>
      <p><strong>Build, optimize, and grow Chrome extensions — faster.</strong></p>
      <p>
        The all-in-one platform for Chrome extension developers.<br/>
        Analytics, A/B testing, user feedback, growth tooling, and revenue optimization — all in one place.
      </p>
      <br/>
      <a href="https://extensionbooster.net/">
        <img src="https://img.shields.io/badge/Visit-extensionbooster.net-7C3AED?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Visit Extension Booster" />
      </a>
      <br/><br/>
    </td>
  </tr>
</table>

> Interested in becoming a sponsor? [Reach out via Extension Booster](https://extensionbooster.net/).

---

## 🤖 Compatible AI Coding Agents

These are standard [Agent Skills](https://agentskills.io/specification) (`SKILL.md` + optional `references/`, `scripts/`), so any agent that implements the open format can load them. Agents with documented native support:

| Agent | Project skills | User skills |
|-------|----------------|-------------|
| [Claude Code](https://code.claude.com/docs/en/skills) | `.claude/skills/` | `~/.claude/skills/` |
| [OpenAI Codex / ChatGPT](https://developers.openai.com/codex/skills) | `.agents/skills/` | `~/.agents/skills/` |
| [Cursor](https://cursor.com/docs/skills) | `.agents/skills/` or `.cursor/skills/` | `~/.agents/skills/` or `~/.cursor/skills/` |
| [Gemini CLI](https://geminicli.com/docs/cli/skills/) | `.agents/skills/` or `.gemini/skills/` | `~/.agents/skills/` or `~/.gemini/skills/` |
| [GitHub Copilot](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills) | `.github/skills/`, `.claude/skills/` or `.agents/skills/` | `~/.agents/skills/` or `~/.copilot/skills/` |
| [OpenCode](https://opencode.ai/docs/skills) | `.agents/skills/` or `.opencode/skills/` | `~/.agents/skills/` or `~/.config/opencode/skills/` |

The [Skills CLI](https://github.com/vercel-labs/skills) knows the install path for these and many more agents.

---

## ✨ Why These Skills?

Built by [Extension Booster](https://extensionbooster.net/), these skills address the real pain points of Chrome extension development: scattered documentation, confusing permission warnings, multi-context debugging, and opaque Chrome Web Store reviews.

They turn your AI coding agent into an extension development expert that can:

- 🏗️ **Scaffold** a new extension (WXT by default) and load it unpacked
- 🛠️ **Develop** features across service worker, content scripts, popup, and side panel
- 📝 **Generate** a `manifest.json` with the minimum permissions
- 🔍 **Audit** security and performance, and **predict** Chrome Web Store rejections
- 🧪 **Test** with unit, integration, and end-to-end suites
- 🎨 **Create** icons and store listing assets
- 🚀 **Publish** to the Chrome Web Store, manually or from CI
- 🔄 **Migrate** Manifest V2 extensions to V3

---

## 📦 Skills Overview

| Skill | Owns | Hands off to |
|-------|------|--------------|
| [`extension-create`](skills/extension-create/) | Scaffolding a new extension (WXT default; Plasmo, CRXJS, or vanilla on request), first entrypoints, first build + load unpacked | `extension-dev` for features |
| [`extension-dev`](skills/extension-dev/) | Features and debugging in an existing extension: framework detection, Chrome APIs, messaging, storage, service worker lifecycle, content scripts, side panel, offscreen | `extension-ui`, `extension-manifest`, `extension-test` |
| [`extension-ui`](skills/extension-ui/) | Popup, side panel, options, new tab, and content-script UI: layout limits, design system, dark mode, accessibility, UX states | `extension-dev` for logic |
| [`extension-manifest`](skills/extension-manifest/) | Generating/validating `manifest.json` (or WXT/Plasmo config), minimum, host, and optional permissions, permission warnings | — |
| [`extension-analyze`](skills/extension-analyze/) | Engineering audit: XSS, unsafe messaging, CSP, secrets, storage, performance, MV3 practices → prioritized fixes | `extension-review` for CWS rejection risk |
| [`extension-review`](skills/extension-review/) | Predicting Chrome Web Store rejection: policy checks mapped to CWS violation codes, verdict, saved report | `extension-analyze`, `extension-publish` |
| [`extension-test`](skills/extension-test/) | Unit, integration, and E2E test setup and authoring | — |
| [`extension-assets`](skills/extension-assets/) | Icons, action icons, CWS screenshots, promo tiles, `public/` wiring | `extension-publish` for listing copy |
| [`extension-publish`](skills/extension-publish/) | CWS submission and updates: listing copy, privacy practices form, packaging, API/CI upload, staged rollout, rejection handling | `extension-review` for pre-submit scan |
| [`extension-migration`](skills/extension-migration/) | MV2 → MV3: service worker, `declarativeNetRequest`, CSP, API replacements, optional move to WXT | — |
| [`extension-payment`](skills/extension-payment/) | Monetization: gateway vs Merchant of Record, checkout flow, license/entitlement checks, freemium and trials | `extension-backend` for server endpoints |
| [`extension-backend`](skills/extension-backend/) | Server API (NestJS + MongoDB default): `chrome.identity` auth, license verification, payment webhooks, API-key proxy, CORS, rate limiting | `extension-payment` for provider choice |

---

## 📥 Installation

### Skills CLI (any agent)

```bash
# Install to the current project (prompts for agents and skills)
npx skills add quangpl/browser-extension-skills

# Install globally for your user
npx skills add quangpl/browser-extension-skills -g

# Pick skills and agents non-interactively
npx skills add quangpl/browser-extension-skills --skill extension-create --skill extension-dev -a claude-code -a codex -y

# List the skills without installing
npx skills add quangpl/browser-extension-skills --list
```

See the [Skills CLI docs](https://github.com/vercel-labs/skills) for every flag.

### Claude Code plugin marketplace

This repository is also a Claude Code [plugin marketplace](https://code.claude.com/docs/en/plugins/create-marketplace) with one plugin, `extension-skills`, that bundles all 12 skills:

```
/plugin marketplace add quangpl/browser-extension-skills
/plugin install extension-skills@browser-extension-skills
```

Plugin skills are namespaced, e.g. `/extension-skills:extension-create`.

### Manual copy

```bash
git clone https://github.com/quangpl/browser-extension-skills.git

# Claude Code (project or user)
cp -r browser-extension-skills/skills/* .claude/skills/
cp -r browser-extension-skills/skills/* ~/.claude/skills/

# Codex / ChatGPT, Cursor, Gemini CLI, Copilot, OpenCode (all read .agents/skills; see table for agent-specific paths)
mkdir -p .agents/skills && cp -r browser-extension-skills/skills/* .agents/skills/
mkdir -p ~/.agents/skills && cp -r browser-extension-skills/skills/* ~/.agents/skills/
```

Copy individual folders (e.g. `skills/extension-create`) to install only some skills. Restart the agent if a new skill doesn't show up.

---

## ⚡ Quick Start

<details>
<summary><strong>1. Create a New Extension</strong></summary>

```
> Create a Chrome extension that highlights all links on a page
```

`extension-create` → scaffolds with WXT (unless you ask for another framework) → adds entrypoints → builds → gives load-unpacked steps.

</details>

<details>
<summary><strong>2. Develop Features</strong></summary>

```
> Add a popup that shows link count and lets users toggle highlighting
```

`extension-dev` → detects the framework and UI library → implements the popup, messaging, and storage → verifies in the browser.

</details>

<details>
<summary><strong>3. Generate Assets</strong></summary>

```
> Generate all icons and store listing screenshots for my extension
```

`extension-assets` → creates the icon set from one source image → prepares CWS screenshots and promo tiles.

</details>

<details>
<summary><strong>4. Check Before Publishing</strong></summary>

```
> Will my extension get rejected by the Chrome Web Store?
```

`extension-review` → scans for policy risks mapped to CWS violation codes → saves a report with a verdict and fixes. Use `extension-analyze` for a general security/performance audit.

</details>

<details>
<summary><strong>5. Publish</strong></summary>

```
> Prepare my extension for Chrome Web Store submission
```

`extension-publish` → drafts the listing and privacy disclosures → packages the zip → sets up API/CI upload. It asks before anything is actually submitted.

</details>

---

## 📚 Skill Details

Each skill's `SKILL.md` holds the workflow; `references/` hold details the agent reads on demand. Primary sources the skills build on:

- **Platform:** [Extensions docs](https://developer.chrome.com/docs/extensions) · [API reference](https://developer.chrome.com/docs/extensions/reference/api) · [Manifest](https://developer.chrome.com/docs/extensions/reference/manifest) · [Permissions list](https://developer.chrome.com/docs/extensions/reference/permissions-list) · [MV3 migration](https://developer.chrome.com/docs/extensions/develop/migrate)
- **Frameworks:** [WXT](https://wxt.dev/) · [Plasmo](https://docs.plasmo.com/) · [CRXJS](https://crxjs.dev/)
- **Testing:** [Extension testing guide](https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing) · [Puppeteer](https://pptr.dev/guides/chrome-extensions) · [Playwright](https://playwright.dev/docs/chrome-extensions)
- **Chrome Web Store:** [Program policies](https://developer.chrome.com/docs/webstore/program-policies) · [Troubleshooting violations](https://developer.chrome.com/docs/webstore/troubleshooting) · [Publish](https://developer.chrome.com/docs/webstore/publish) · [CWS API](https://developer.chrome.com/docs/webstore/using-api)
- **Backend:** [NestJS](https://docs.nestjs.com/) · [Mongoose](https://mongoosejs.com/docs/)

---

## ✅ Requirements

| Requirement | Details |
|-------------|---------|
| AI coding agent | Any agent that loads Agent Skills (see [Compatible agents](#-compatible-ai-coding-agents)) |
| Node.js | 18+ (bundled scripts and the validator use only built-in modules) |
| Package manager | npm, pnpm, yarn, or bun |
| Chrome or Chromium | For loading, debugging, and testing the extension |

---

## 💡 Tips & Best Practices

### Permissions
- Prefer `activeTab` over broad host permissions when the user triggers the action
- Move non-essential capabilities to `optional_permissions` / `optional_host_permissions`

### Service worker & performance
- The service worker can stop at any time: register listeners at the top level and keep state in `chrome.storage`, not globals
- Use `chrome.alarms` instead of long-lived timers; use `chrome.storage.session` for in-memory session data
- Inject content scripts only where needed (narrow `matches`, or `chrome.scripting` on demand)

### Security
- Validate message senders and treat messages from content scripts as untrusted
- Never put untrusted data into `innerHTML`
- Keep API keys and secrets on a server; anything in the bundle is public

### Testing
- Chrome's headless mode (`--headless`) loads extensions, so CI doesn't need a display; the separate `chrome-headless-shell` binary does not
- Branded Chrome and Edge removed the `--load-extension` flag, so load extensions through [Puppeteer's `enableExtensions`](https://pptr.dev/guides/chrome-extensions) or Playwright's bundled Chromium with a persistent context
- Give each E2E test a fresh browser profile

### Publishing
- One clear single purpose per extension, stated plainly in the listing
- Request only the permissions you use and justify each in the privacy practices tab
- Run `extension-review` before every submission

---

## 🏛️ Architecture

Each skill uses progressive disclosure: only `name` + `description` sit in the agent's context until the skill triggers; then `SKILL.md` loads, and references or scripts are read or run only when needed.

```
skills/
├── extension-create/
│   ├── SKILL.md            # Workflow and defaults (≤ 150 lines, loaded when triggered)
│   ├── references/         # Focused details (≤ 150 lines each, read on demand)
│   ├── scripts/            # Optional zero-dependency Node tools (executed, not read)
│   └── agents/
│       └── openai.yaml     # Display metadata for Codex / ChatGPT
├── extension-dev/
├── extension-ui/
├── extension-manifest/
├── extension-analyze/
├── extension-review/
├── extension-test/
├── extension-assets/
├── extension-publish/
├── extension-migration/
├── extension-payment/
└── extension-backend/
.claude-plugin/marketplace.json   # Claude Code plugin marketplace
scripts/validate-skills.mjs       # Repo validator
```

Check every skill against the repo rules with:

```bash
node scripts/validate-skills.mjs          # human-readable
node scripts/validate-skills.mjs --json   # machine-readable
```

---

## 🤝 Contributing

1. Fork the repository
2. Add or edit a skill under `skills/` following [CONTRIBUTING.md](CONTRIBUTING.md)
3. Run `node scripts/validate-skills.mjs` until it reports no errors
4. Try the skill in an agent on a real extension project
5. Open a pull request

---

## 📄 License

[MIT](LICENSE) © [quangpl](https://github.com/quangpl)

---

<div align="center">

### Powered by Extension Booster

<a href="https://extensionbooster.net/">
  <img src="https://extensionbooster.net/logo.webp" alt="Extension Booster" width="80" />
</a>

**[extensionbooster.net](https://extensionbooster.net/)** — Supercharge your extension development workflow.

<sub>Made with ❤️ for the Chrome extension developer community.</sub>

</div>
