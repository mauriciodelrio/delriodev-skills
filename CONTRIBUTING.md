# Contributing to delriodev-skills

Thanks for your interest in contributing! This is an open-source Copilot skill library and every contribution helps improve it for everyone.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** from `main` using conventional naming:
   ```bash
   git checkout -b feat/new-skill-name
   # or
   git checkout -b fix/skill-name-typo
   ```

## Adding or Editing Skills

- Each skill lives in its own folder with a `SKILL.md` file
- Skills must exist in **both** `en-skills/` (English) and `es-skills/` (Spanish)
- Every `SKILL.md` must include YAML frontmatter:
  ```yaml
  ---
  name: my-skill-name
  description: One-line description of what this skill does
  ---
  ```
- Code examples should always be in **TypeScript**
- Keep instructions actionable — tell Copilot *what to do*, not what to know

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Usage |
|--------|-------|
| `feat:` | New skill or feature |
| `fix:` | Fix incorrect content or bugs |
| `docs:` | README, CONTRIBUTING, or doc-only changes |
| `refactor:` | Restructure without changing behavior |
| `chore:` | Tooling, CI, build config |

Examples:
```
feat: add kubernetes-basics skill
fix: correct auth skill JWT example
docs: update README with new skill count
chore: update tsup to v9
```

## Pull Request Process

1. **One PR per skill or change** — keep it focused
2. **Fill in the PR description** — what changed and why
3. **Ensure both languages** — if you add/edit an `en-skills/` file, include the `es-skills/` counterpart (or request help with translation)
4. **Test the CLI** if you changed anything under `cli/`:
   ```bash
   cd cli && npm test
   ```

## Code of Conduct

- Be respectful and constructive
- Welcome newcomers — no question is too simple
- Give credit where it's due
- Keep discussions focused on the contribution

## Questions?

Open a [GitHub Issue](https://github.com/mauriciodelrio/delriodev-skills/issues) or start a [Discussion](https://github.com/mauriciodelrio/delriodev-skills/discussions).

---

Thank you for helping make Copilot skills better for everyone!
