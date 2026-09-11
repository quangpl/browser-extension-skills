# Contributing to Browser Extension Skills

Thank you for contributing! These skills help developers build better Chrome extensions with AI coding agents.

## Skill Structure

Every skill follows the [progressive disclosure](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices) pattern:

```
skills/
└── extension-your-skill/
    ├── SKILL.md              # Quick reference (required, < 150 lines)
    └── references/           # Detailed docs (optional, < 150 lines each)
        ├── topic-a.md
        └── topic-b.md
```

## Requirements

### SKILL.md

- **Max 150 lines** — concise, actionable, straight to the point
- **YAML frontmatter** with `name` (must match folder name) and `description` (< 200 chars)
- **Imperative form** — "Scan the codebase" not "You should scan the codebase"
- **Token-efficient** — sacrifice grammar for brevity where appropriate
- **No duplicate content** between SKILL.md and references

### Reference Files

- **Max 150 lines each** — split large topics into multiple files
- **Practical instructions** — teach Claude how to perform tasks, not just what tools do
- **Code examples** — copy-pasteable, production-ready

### Framework Support

All relevant skills should support both major extension frameworks:

- [WXT](https://wxt.dev/) — multi-framework, file-based entrypoints
- [CRXJS](https://crxjs.dev/) — Vite plugin integration, standard setup

Detect the user's framework and adapt accordingly.

## How to Contribute

### Adding a New Skill

1. Fork the repository
2. Create `skills/extension-your-skill/SKILL.md` with YAML frontmatter
3. Add reference files under `skills/extension-your-skill/references/`
4. Update the skills table in `README.md`
5. Test the skill with Claude Code on a real extension project
6. Submit a pull request

### Improving an Existing Skill

1. Fork the repository
2. Edit the relevant files under `skills/`
3. Verify line counts stay within limits (SKILL.md < 150, refs < 150)
4. Test the changes with Claude Code
5. Submit a pull request with a clear description of what improved

### Reporting Issues

Open an issue with:

- Which skill has the problem
- What you expected vs what happened
- Extension framework you're using (WXT, CRXJS, vanilla)

## Code of Conduct

Be respectful, constructive, and focused on making extension development better for everyone.

## License

By contributing, you agree your contributions will be licensed under the [MIT License](LICENSE).
