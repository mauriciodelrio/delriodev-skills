# delriodev-skills

Interactive CLI wizard to install **GitHub Copilot skills** into your workspace — covering software development, security, and regulatory compliance.

71 curated `SKILL.md` files in **English** and **Spanish**, organized into 6 categories.

## Quick Start

```bash
npx delriodev-skills
```

No installation needed. The wizard guides you through language selection, category picking, and target directory.

## Features

- **Install** — Choose categories and copy skills to your workspace or global config
- **Update** — Re-sync installed skills from the latest source
- **Clean** — Remove installed skills and manifest

## Skill Categories

| Category | Skills | Topics |
|---|---|---|
| Frontend | 23 | React, Next.js, CSS, accessibility, testing, performance |
| Backend | 17 | Node.js, REST APIs, auth, databases, microservices |
| Architecture | 8 | Clean architecture, DDD, event-driven, system design |
| General Software | 7 | Git, clean code, Docker, TypeScript, CI/CD |
| Agent Workflow | 6 | Copilot agent patterns, prompt engineering |
| GRC (Compliance) | 10 | GDPR, HIPAA, ISO 27001, NIST, PCI DSS |

## How It Works

1. Select language (English / Spanish)
2. Choose action (Install / Update / Clean)
3. Pick categories or install all
4. Choose target (current workspace or global `~/.vscode`)
5. Skills are copied as `.instructions.md` / `SKILL.md` files

A `.copilot-skills.json` manifest is saved to track installed skills for updates and cleanup.

## Requirements

- Node.js >= 20

## License

MIT — [delriodev-skills on GitHub](https://github.com/mauriciodelrio/delriodev-skills)
