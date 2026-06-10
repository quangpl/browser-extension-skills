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

| Agent | Type | Skills Support |
|-------|------|----------------|
| [Claude Code](https://docs.claude.com/en/docs/claude-code) | CLI / IDE extension | Native skill loading |
| [Cursor](https://cursor.com/) | AI-powered IDE | Via `.cursor/rules/` |
| [Windsurf (Codeium)](https://codeium.com/windsurf) | AI-powered IDE | Via `.windsurfrules` |
| [GitHub Copilot](https://github.com/features/copilot) | IDE extension | Via `.github/copilot-instructions.md` |
| [Cline](https://github.com/cline/cline) | VS Code extension | Via `.clinerules` |
| [Aider](https://aider.chat/) | CLI agent | Via `.aider.conf.yml` conventions |
| [Continue](https://continue.dev/) | IDE extension | Via `.continue/` config |
| [Roo Code](https://roo.dev/) | VS Code extension | Via `.roo/rules/` |
| [Augment Code](https://www.augmentcode.com/) | IDE extension | Via project instructions |
| [Amazon Q Developer](https://aws.amazon.com/q/developer/) | IDE extension | Via project context |

---

## ✨ Why These Skills?

Built by [Extension Booster](https://extensionbooster.net/), these skills address the real pain points of Chrome extension development: scattered documentation, confusing permission warnings, multi-context debugging, and opaque Chrome Web Store reviews.

They turn your AI coding agent into an extension development expert that can:

- 🏗️ **Scaffold** a complete extension project in seconds
- 🛠️ **Develop** features with proper API usage and framework detection
- 📝 **Generate** optimized `manifest.json` with minimum permissions
- 🔍 **Analyze** code for security vulnerabilities and CWS compliance
- 🧪 **Test** across all extension contexts (service worker, content script, popup)
- 🎨 **Create** all required icons and store listing assets
- 🚀 **Publish** to Chrome Web Store with CI/CD automation
- 🔄 **Migrate** existing extensions from Manifest V2 to V3

---

## 📦 Skills Overview

| Skill | Description | Use When |
|-------|-------------|----------|
| [`extension-create`](skills/extension-create/) | Auto-scaffold with WXT or Plasmo based on framework choice | Starting a new extension project |
| [`extension-dev`](skills/extension-dev/) | Develop features with auto-detection for WXT, Plasmo, CRXJS, vanilla | Building new features, debugging |
| [`extension-manifest`](skills/extension-manifest/) | Generate `manifest.json` or validate Plasmo auto-manifest | Setting up or updating manifest |
| [`extension-analyze`](skills/extension-analyze/) | Security audit, best practices, CWS compliance (framework-aware) | Pre-submission review, code quality |
| [`extension-test`](skills/extension-test/) | Unit, integration, and E2E testing with Puppeteer | Writing and running tests |
| [`extension-assets`](skills/extension-assets/) | Generate icons, screenshots, and store listing images | Preparing visual assets |
| [`extension-payment`](skills/extension-payment/) | Integrate payments (Stripe, Paddle, Lemon Squeezy, Polar, +10 more) | Monetizing, subscriptions, licensing |
| [`extension-backend`](skills/extension-backend/) | Build backend APIs with NestJS + MongoDB for auth, licensing, webhooks | Need server-side logic, API proxy |
| [`extension-ui`](skills/extension-ui/) | Polish extension UI/UX for popup, sidepanel, options (dark mode, a11y) | Building or improving extension UI |
| [`extension-review`](skills/extension-review/) | Scan code for CWS rejection risks, generate report with fixes | Pre-submission review, compliance |
| [`extension-publish`](skills/extension-publish/) | Chrome Web Store submission, listing optimization, CI/CD | Publishing and updates |
| [`extension-migration`](skills/extension-migration/) | Migrate from Manifest V2 to V3 with step-by-step guidance | Upgrading legacy extensions |

---

## 📥 Installation

### Recommended: Using Skills CLI

Install all skills at once using the [Skills CLI](https://github.com/vercel-labs/skills):

```bash
# Install all skills to your project
npx skills add quangpl/browser-extension-skills

# Install globally (available in all projects)
npx skills add quangpl/browser-extension-skills -g

# Install specific skills only
npx skills add quangpl/browser-extension-skills -s extension-create,extension-dev

# List available skills before installing
npx skills add quangpl/browser-extension-skills -l
```

### Alternative: Manual Installation

```bash
# Clone the repository
git clone https://github.com/quangpl/browser-extension-skills.git

# Copy all skills to your project
cp -r browser-extension-skills/skills/* .claude/skills/

# Or copy to global Claude Code skills
cp -r browser-extension-skills/skills/* ~/.claude/skills/
```

### Alternative: Install Individual Skills

```bash
# Copy only the skills you need
cp -r browser-extension-skills/skills/extension-create .claude/skills/
cp -r browser-extension-skills/skills/extension-dev .claude/skills/
```

---

## ⚡ Quick Start

<details>
<summary><strong>1. Create a New Extension</strong></summary>

```
> Create a Chrome extension that highlights all links on a page
```

Your agent activates `extension-create` → asks for framework preference → picks WXT or Plasmo → scaffolds → sets up entrypoints → configures manifest.

</details>

<details>
<summary><strong>2. Develop Features</strong></summary>

```
> Add a popup that shows link count and lets users toggle highlighting
```

Your agent activates `extension-dev` → detects WXT + React → implements popup with `chrome.tabs` API.

</details>

<details>
<summary><strong>3. Generate Assets</strong></summary>

```
> Generate all icons and store listing screenshots for my extension
```

Your agent activates `extension-assets` → creates icons (16/32/48/128px) → generates listing images.

</details>

<details>
<summary><strong>4. Analyze Before Publishing</strong></summary>

```
> Analyze my extension for security issues and CWS compliance
```

Your agent activates `extension-analyze` → scans permissions, CSP, message handlers → reports issues.

</details>

<details>
<summary><strong>5. Publish</strong></summary>

```
> Prepare and publish my extension to Chrome Web Store
```

Your agent activates `extension-publish` → validates listing → packages → submits via CI/CD.

</details>

---

## 📚 Skill Details

### `extension-create`

Automatically scaffolds a Chrome extension using [WXT](https://wxt.dev/) or [Plasmo](https://docs.plasmo.com/), chosen based on your UI framework. References [Chrome Extensions Samples](https://github.com/GoogleChrome/chrome-extensions-samples) for proven patterns.

**Scaffolder selection:**

| Framework | Recommended | Why |
|-----------|-------------|-----|
| React | Plasmo | CSUI, rich [quickstarts](https://docs.plasmo.com/quickstarts), auto-manifest |
| Vue / Svelte | WXT | First-class support, file-based entrypoints |
| Vanilla TS | WXT | Lightest setup |

**Supports:** React, Vue, Svelte, Solid, Vanilla TypeScript
**Features:** Auto-scaffold, framework-based scaffolder pick, entrypoint generation, Plasmo quickstart templates

### `extension-dev`

Auto-detects your framework (WXT, Plasmo, CRXJS, vanilla) and UI library, then finds proper documentation to implement features.

**References:**
- [Getting Started](https://developer.chrome.com/docs/extensions/get-started) · [Development Guide](https://developer.chrome.com/docs/extensions/develop)
- [API Reference](https://developer.chrome.com/docs/extensions/reference/api) · [Permissions List](https://developer.chrome.com/docs/extensions/reference/permissions-list)
- [WXT Docs](https://wxt.dev/) · [Plasmo Docs](https://docs.plasmo.com/)

### `extension-manifest`

Generates optimal `manifest.json` by analyzing your codebase for Chrome API usage. For Plasmo projects, validates the auto-generated manifest and `plasmo.config.ts` overrides.

**References:**
- [Manifest Reference](https://developer.chrome.com/docs/extensions/reference/manifest)
- [Permissions List](https://developer.chrome.com/docs/extensions/reference/permissions-list)

### `extension-analyze`

Audits extensions for security vulnerabilities, performance issues, and Chrome Web Store policy compliance.

**Checks:** Permissions, CSP, message handlers, storage security, XSS vectors, dependencies, CWS compliance

### `extension-test`

Sets up and runs unit, integration, and E2E tests for Chrome extensions.

**Stack:** Jest for unit/integration, Puppeteer for E2E, Chrome API mocks
**Key constraint:** Extensions cannot run in headless mode

### `extension-assets`

Generates all required icons and Chrome Web Store listing assets.

**Supports:** ImageMagick CLI generation, Gemini API for AI-generated images, prompt templates for manual generation

### `extension-payment`

Integrates payment gateways and Merchant of Record services into Chrome extensions. Asks user for provider preference, fetches docs, implements backend + extension integration.

**Providers:** Stripe, PayPal, Paddle, Lemon Squeezy, Polar, Creem, Dodo Payments, Razorpay, Adyen, Square, Braintree, Authorize.Net, FastSpring, Gumroad
**Patterns:** Account-based licensing, license keys, freemium with usage limits, trial periods
**AI-assisted docs:** Stripe ([llms.txt](https://docs.stripe.com/llms.txt)), Polar ([llms.txt](https://docs.polar.sh/llms-full.txt))

### `extension-backend`

Builds a secure backend API for extensions that need server-side logic. Auto-activates when the agent detects a need for auth, licensing, webhooks, or API proxying.

**Recommended stack:** [NestJS](https://docs.nestjs.com/) + [MongoDB (Mongoose)](https://mongoosejs.com/docs/)
**Covers:** Google OAuth via `chrome.identity`, license verification, payment webhooks, CORS for extensions, rate limiting, input validation
**Style guides:** [Google TypeScript](https://google.github.io/styleguide/tsguide.html) · [Google JavaScript](https://google.github.io/styleguide/jsguide.html)

### `extension-ui`

Builds polished, professional extension UIs. Analyzes existing UI and suggests improvements for popup, sidepanel, and options pages.

**Covers:** Extension UI constraints (popup 800x600, sidepanel 320-400px), design system setup (shadcn/ui, Tailwind, DaisyUI), dark mode, accessibility (WCAG AA), UX patterns (loading states, empty states, onboarding)
**Stacks:** React + shadcn/ui, Vue + DaisyUI, Svelte + Tailwind, vanilla

### `extension-review`

Scans extension source code for Chrome Web Store rejection risks based on [official troubleshooting docs](https://developer.chrome.com/docs/webstore/troubleshooting). Generates a clear Markdown or HTML report.

**Checks:** Remote code execution, code obfuscation, excessive permissions, missing privacy policy, single purpose, insecure transmission, keyword stuffing, minimum functionality, crypto mining, copyright circumvention, data disclosure
**Output:** Markdown or HTML report with severity, root cause, file locations, and step-by-step fixes
**Verdict:** LIKELY APPROVED / NEEDS FIXES / WILL BE REJECTED

### `extension-publish`

Handles Chrome Web Store submission, listing optimization, and CI/CD automation. Supports both standard `chrome-webstore-upload` and Plasmo's built-in `plasmo package` workflow.

**Features:** Pre-submission checklist, listing SEO, common rejections guide, GitHub Actions workflow, Plasmo publish support

### `extension-migration`

Step-by-step migration from Manifest V2 to V3. Suggests adopting WXT or Plasmo during migration for built-in MV3 support.

**Reference:** [Migration Guide](https://developer.chrome.com/docs/extensions/develop/migrate) · [WXT](https://wxt.dev/) · [Plasmo](https://docs.plasmo.com/)
**Covers:** Service workers, `declarativeNetRequest`, CSP changes, API replacements, framework adoption

---

## ✅ Requirements

| Requirement | Details |
|-------------|---------|
| [Claude Code](https://docs.claude.com/en/docs/claude-code) | CLI or IDE extension |
| Node.js | v18+ recommended |
| npm / pnpm / yarn / bun | Any package manager |
| Chrome | For testing and debugging |
| Gemini API Key | Optional, for AI-generated assets (`extension-assets`) |

---

## 💡 Tips & Best Practices

### Permission Optimization
- Always prefer `activeTab` over broad `tabs` + host permissions
- Use optional permissions for non-essential features
- Run `extension-analyze` before every CWS submission

### Performance
- Keep content scripts under 50KB (lazy-load heavy logic)
- Service workers should be event-driven (no polling)
- Use `chrome.storage.session` for temporary data

### Security
- Validate all message senders (`sender.id === chrome.runtime.id`)
- Never use `innerHTML` with untrusted data
- No API keys in source code; use a proxy server

### Testing
- Extensions cannot run in headless Chrome — always use `headless: false`
- Each E2E test should get a fresh browser instance
- Mock `chrome.*` APIs consistently with `jest-chrome` or manual mocks

### Publishing
- First 150 characters of description appear in search results
- Screenshots at 1280x800 showing features in action convert best
- Single-purpose policy: one clear function per extension

---

## 🏛️ Architecture

Each skill follows the [progressive disclosure](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices) pattern for optimal token efficiency:

```
skills/
├── extension-create/
│   ├── SKILL.md              # Quick reference (< 150 lines, always loaded)
│   └── references/           # Detailed docs (loaded on-demand by Claude)
│       ├── wxt-scaffold-guide.md
│       ├── wxt-entrypoints.md
│       ├── extension-templates.md
│       └── chrome-samples-reference.md
├── extension-dev/
├── extension-manifest/
├── extension-analyze/
├── extension-test/
├── extension-assets/
├── extension-publish/
└── extension-migration/
```

- **`SKILL.md`** — Always loaded when skill activates. Concise, actionable, < 150 lines.
- **`references/`** — Loaded only when Claude needs deeper context. < 150 lines each.

---

## 🤝 Contributing

1. Fork the repository
2. Create your skill under `skills/` following the structure above
3. Ensure `SKILL.md` < 150 lines, each reference < 150 lines
4. Test the skill with Claude Code on real extension projects
5. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

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
