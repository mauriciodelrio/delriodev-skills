# Changelog

## [0.5.1](https://github.com/mauriciodelrio/delriodev-skills/compare/v0.5.0...v0.5.1) (2026-04-14)

In version 0.5.1 of "delriodev-skills," we've enhanced the skill installation process for improved visibility in VS Code by flattening the directory structure. This change allows VS Code to discover all skills more effectively, ensuring that users can access a broader range of available capabilities. Additionally, we've updated over 200 cross-references in the SKILL.md files to streamline navigation and improve usability.

### Pull Requests

- [#18](https://github.com/mauriciodelrio/delriodev-skills/pull/18) feat: flatten skill installation for VS Code discovery

## [0.5.0](https://github.com/mauriciodelrio/delriodev-skills/compare/v0.4.4...v0.5.0) (2026-04-14)

In version 0.5.0 of "delriodev-skills," we've streamlined the skill installation process for VS Code, ensuring that all custom skills are easily discoverable. By flattening the installation structure, users can now access all 75 skills directly from the top level, significantly improving the visibility and usability of the skills. Additionally, we've updated the SKILL.md files to ensure that all cross-references are correctly linked, enhancing the overall documentation experience.

### Pull Requests

- [#17](https://github.com/mauriciodelrio/delriodev-skills/pull/17) feat: flatten skill installation for VS Code discovery

## [0.4.4](https://github.com/mauriciodelrio/delriodev-skills/compare/v0.4.3...v0.4.4) (2026-04-14)

In version 0.4.4 of "delriodev-skills," we've introduced significant improvements to the CLI installer, enhancing user experience and accuracy. The dynamic file counting feature now ensures that SKILL.md counts are updated in real-time after language selection, eliminating outdated information when skills are added or removed. Additionally, we've corrected the personal skills path, ensuring a more reliable installation process across different platforms.

### Pull Requests

- [#16](https://github.com/mauriciodelrio/delriodev-skills/pull/16) fix(cli): dynamic file counts + correct personal skills path

## [0.4.3](https://github.com/mauriciodelrio/delriodev-skills/compare/v0.4.2...v0.4.3) (2026-04-14)

In version 0.4.3 of "delriodev-skills," we've enhanced the user experience by addressing inconsistencies in the agent-workflow and frontend skills through a comprehensive audit. This update includes the addition of missing cross-reference links, improved formatting for requirements, and updates to the SKILL.md files to better support internationalization. These changes ensure a more cohesive and user-friendly experience when utilizing our GitHub Copilot custom skills for software development, security, and compliance.

### Pull Requests

- [#15](https://github.com/mauriciodelrio/delriodev-skills/pull/15) fix(skills): audit and correct agent-workflow and frontend skill inconsistencies

## [0.4.2](https://github.com/mauriciodelrio/delriodev-skills/compare/v0.4.1...v0.4.2) (2026-04-14)

In version 0.4.2 of "delriodev-skills," we've enhanced the user experience by unifying the `apiClient` as a single source of truth and adding cross-references for improved navigation between security and fetching rules. This release introduces support for single-page applications (SPAs) using Vite and React Router v6, expanding our skills to include in-memory token patterns, advanced state management, and refined error handling. Additionally, we've addressed CORS issues with Vite's dev-server and provided comprehensive updates to ensure a smoother development process.

### Pull Requests

- [#13](https://github.com/mauriciodelrio/delriodev-skills/pull/13) feat(frontend): SPA support + split routing & project-structure by framework
- [#14](https://github.com/mauriciodelrio/delriodev-skills/pull/14) refactor(frontend): unify apiClient source of truth + add cross-references

## [0.4.1](https://github.com/mauriciodelrio/delriodev-skills/compare/v0.4.0...v0.4.1) (2026-04-13)

In version 0.4.1 of "delriodev-skills," we've enhanced the testing skill by clarifying the coverage configuration process and introducing new steps to improve user understanding. Additionally, we've strengthened the cross-references between testing, data validation, and security in the backend skills, addressing gaps identified during real project implementation. These updates aim to ensure better quality control and security practices in your development workflow.

### Pull Requests

- [#11](https://github.com/mauriciodelrio/delriodev-skills/pull/11) fix(backend): improve cross-references between testing, data-validation, and orchestrator
- [#12](https://github.com/mauriciodelrio/delriodev-skills/pull/12) fix(testing): clarify coverage config step and required devDependency

## [0.4.0](https://github.com/mauriciodelrio/delriodev-skills/compare/v0.3.2...v0.4.0) (2026-04-13)

In version 0.4.0 of "delriodev-skills," all backend, architecture, frontend, software, and GRC skills have been optimized for improved agent consumption, adhering to agentskills.io best practices. This release features imperative frontmatter descriptions, streamlined agent workflow sections with step-by-step instructions, and the removal of decorative elements for clarity. Additionally, a new root orchestrator has been introduced for the software domain, enhancing the overall functionality and usability of the CLI.

### Pull Requests

- [#5](https://github.com/mauriciodelrio/delriodev-skills/pull/5) refactor(agent-workflow): optimize all agent-workflow skills following agentskills.io best practices
- [#6](https://github.com/mauriciodelrio/delriodev-skills/pull/6) refactor(grc): optimize all GRC skills for agent consumption
- [#7](https://github.com/mauriciodelrio/delriodev-skills/pull/7) refactor(software): optimize standalone skills and add root orchestrator
- [#8](https://github.com/mauriciodelrio/delriodev-skills/pull/8) refactor(frontend): optimize 22 frontend skills + orchestrator for agent consumption
- [#9](https://github.com/mauriciodelrio/delriodev-skills/pull/9) optimize(architecture): Improve all architecture skills — agentskills.io best practices
- [#10](https://github.com/mauriciodelrio/delriodev-skills/pull/10) optimize(backend): improve all 17 backend skills for agent consumption

## [0.3.2](https://github.com/mauriciodelrio/delriodev-skills/compare/v0.2.3...v0.3.2) (2026-04-12)

In version 0.3.2 of "delriodev-skills," users will benefit from improved release management with the addition of workflows and scripts that enhance the generation of release notes. This update also includes synchronization of the package version to ensure consistency across deployments. Additionally, the GitHub release token has been updated for better security and reliability during the publishing process.

### Pull Requests

- [#1](https://github.com/mauriciodelrio/delriodev-skills/pull/1) feat: add workflows and scripts to release notes smarters
- [#2](https://github.com/mauriciodelrio/delriodev-skills/pull/2) chore(cli): sync package version to 0.3.0 (already published on npm)
- [#3](https://github.com/mauriciodelrio/delriodev-skills/pull/3) chore: update release github token
- [#4](https://github.com/mauriciodelrio/delriodev-skills/pull/4) fix(cli): sync version to 0.3.1 and publish npm after git push

## [0.2.3](https://github.com/mauriciodelrio/delriodev-skills/compare/v0.2.2...v0.2.3) (2026-04-12)

## [0.2.2](https://github.com/mauriciodelrio/delriodev-skills/compare/v0.2.1...v0.2.2) (2026-04-12)

## [0.2.1](https://github.com/mauriciodelrio/delriodev-skills/compare/v0.2.0...v0.2.1) (2026-04-12)

# 0.2.0 (2026-04-12)


### Features

* first commit - basic skills, package and instructions ([737e675](https://github.com/mauriciodelrio/delriodev-skills/commit/737e675facedc1a94605a4917d00d5c18bd980c3))
