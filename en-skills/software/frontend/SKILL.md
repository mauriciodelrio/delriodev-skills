---
name: frontend
description: >
  Use this skill when working on frontend. Orchestrates 24 specialized
  sub-skills covering architecture, components, rendering, styles,
  data fetching, testing, performance, and security.
  Stack: React 19+, Next.js 15+, Vite 6+, TypeScript strict, Tailwind CSS, pnpm.
---

# Frontend Skills — Master Index

## Mandatory cross-references

Before executing any frontend task, the agent **must** consult these external skills when applicable:

| External skill | When to consult |
|----------------|----------------|
| [`agent-workflow`](../../agent-workflow/SKILL.md) | **Always** when starting a new project or resuming an existing one. Defines the clarification protocol, checkpoints, iteration-rules, and documentation (`docs-structure`, `project-resumption`). |
| [`governance-risk-and-compliance`](../../governance-risk-and-compliance/SKILL.md) | When the frontend handles personal data (forms, cookies, tokens), implements consent, opt-out, or any regulated flow. Activate relevant sub-skills: `gdpr` (consent, cookies), `owasp-top-10` (XSS, CSP, sanitization), `ccpa-cpra` (Do Not Sell, GPC). |

## Project type detection

Before applying sub-skills, identify the project type:

| Signal | Type | Implication |
|--------|------|-------------|
| `next.config.ts` or `next.config.js` exists | **Next.js App Router** | Use "Next.js" sections in each sub-skill. File-system routing, Server Components, Server Actions. |
| `vite.config.ts` exists and NO `next.config.*` | **Vite + React SPA** | Use "Vite SPA" sections in each sub-skill. Routing via `react-router-dom`, all client-side, tokens in memory. |
| Other framework (Remix, Astro, etc.) | **Other** | Adapt general principles from each sub-skill to the detected framework. |

If it's a **new project**, ask the developer what type of project it is before proceeding.

## Agent workflow

0. If new project or no context → consult `agent-workflow` → `project-resumption`.
1. Detect project type (Next.js vs Vite SPA vs Other) using the table above.
2. Identify the action (create component, form, hook, styles, data fetching).
3. Consult the skills map (section 2) or the keyword activation guide (section 3).
4. Read the specific sub-skill — apply the correct section based on project type.
5. Return to this index and consult "Mandatory skills by action" (section 4).
6. Read and apply each mandatory skill for the action type.
7. Consult `governance-risk-and-compliance` if the action involves personal data, cookies, or tokens.
8. Verify compliance with universal code rules (section 5).
9. Do not mark task as completed until all mandatory skills are satisfied.

## 1. Technology Stack

| Layer | Technologies |
|-------|-------------|
| **UI Library** | React 19+, Server Components, Suspense |
| **Meta-Framework** | Next.js 15+ (App Router), Vite 6+ |
| **Language** | TypeScript strict (`strict: true`, `noUncheckedIndexedAccess`) |
| **Styles** | Tailwind CSS 4+, CSS Modules, Material UI 6+ |
| **State** | Zustand, Jotai, Signals (`@preact/signals-react`), React Context |
| **Data Fetching** | TanStack Query v5, SWR, Server Actions |
| **Forms** | React Hook Form + Zod |
| **Testing** | Vitest, Jest, React Testing Library, Playwright |
| **Package Manager** | pnpm 9+ |
| **Monorepo** | Turborepo, pnpm workspaces |
| **i18n** | next-intl, react-i18next, ICU MessageFormat |
| **Animations** | Framer Motion, View Transitions API |

## 2. Skills Map by Layer

### Architecture and Structure

| Skill | Description | Scope |
|-------|-------------|-------|
| [nextjs-project-structure](./nextjs-project-structure/SKILL.md) | App Router folder structure, route groups, barrel files, path aliases | Next.js base organization |
| [vite-project-structure](./vite-project-structure/SKILL.md) | Vite SPA folder structure, centralized router, path aliases with vite-tsconfig-paths | Vite SPA base organization |
| [component-patterns](./component-patterns/SKILL.md) | Composition patterns: compound, render props, HOC, slots | Generic component design |
| [design-system-build-components-rules](./design-system-build-components-rules/SKILL.md) | Atomic Design: atoms, molecules, organisms, tokens, variants | Design System construction |
| [monorepo-and-tooling](./monorepo-and-tooling/SKILL.md) | Turborepo, pnpm workspaces, shared configs | Multi-package architecture |

### React and Rendering

| Skill | Description | Scope |
|-------|-------------|-------|
| [react-best-practices](./react-best-practices/SKILL.md) | Hooks, composition, memoization, refs, keys | React core |
| [state-management-rules](./state-management-rules/SKILL.md) | Zustand, Jotai, Signals, Context, tool selection | State management |
| [rendering-strategies](./rendering-strategies/SKILL.md) | SSR, SSG, ISR, Streaming, RSC, hydration | Rendering strategies |
| [nextjs-best-practices](./nextjs-best-practices/SKILL.md) | App Router, Server Actions, middleware, caching | Next.js specific |
| [nextjs-routing-rules](./nextjs-routing-rules/SKILL.md) | Layouts, route groups, parallel/intercepting routes, guards in layout | Next.js App Router routing |
| [vite-routing-rules](./vite-routing-rules/SKILL.md) | createBrowserRouter, Outlet layouts, protected routes, lazy loading | Vite SPA routing (React Router v6) |

### UI, Styles, and UX

| Skill | Description | Scope |
|-------|-------------|-------|
| [css-rules](./css-rules/SKILL.md) | Tailwind, CSS Modules, custom properties, responsive, theming | Styles and layout |
| [a11y-rules](./a11y-rules/SKILL.md) | WCAG 2.2 AA, ARIA, focus management, screen readers | Accessibility |
| [animations-and-transitions](./animations-and-transitions/SKILL.md) | Framer Motion, CSS transitions, View Transitions, skeletons | Animations and micro-interactions |
| [i18n-rules](./i18n-rules/SKILL.md) | next-intl, ICU formatting, plurals, RTL, locale detection | Internationalization |
| [seo-rules](./seo-rules/SKILL.md) | Metadata API, structured data, OG tags, sitemap, robots | Technical SEO |

### Data and Forms

| Skill | Description | Scope |
|-------|-------------|-------|
| [fetching-rules](./fetching-rules/SKILL.md) | TanStack Query, SWR, cache, optimistic updates, prefetch | Data fetching |
| [forms-and-validation-rules](./forms-and-validation-rules/SKILL.md) | React Hook Form, Zod, multi-step, file upload, validation UX | Forms |

### Quality and Security

| Skill | Description | Scope |
|-------|-------------|-------|
| [code-quality-rules](./code-quality-rules/SKILL.md) | ESLint, Prettier, Biome, naming conventions, imports | Code quality |
| [testing-rules](./testing-rules/SKILL.md) | Vitest/Jest, RTL, Playwright, coverage, test patterns | Testing |
| [performance-rules](./performance-rules/SKILL.md) | Core Web Vitals, lazy loading, bundle analysis, memoization | Performance |
| [security-rules](./security-rules/SKILL.md) | XSS, CSP, sanitization, auth tokens, CORS | Frontend security |
| [error-handling-rules](./error-handling-rules/SKILL.md) | Error boundaries, Sentry, fallback UI, retry, toast | Error handling |

### Infrastructure

| Skill | Description | Scope |
|-------|-------------|-------|
| [package-management-rules](./package-management-rules/SKILL.md) | pnpm, lockfiles, versioning, auditing, updates | Dependency management |

## 3. Keyword Activation Guide

### Keywords → Skill

**Architecture and structure:**
- `structure`, `folders`, `folder`, `barrel`, `alias`, `path` → `nextjs-project-structure` / `vite-project-structure` (based on project type)
- `compound component`, `render props`, `HOC`, `slots`, `composition`, `pattern` → `component-patterns`
- `design system`, `atom`, `molecule`, `organism`, `token`, `variant`, `storybook` → `design-system-build-components-rules`
- `monorepo`, `turborepo`, `workspace`, `shared config`, `multi-package` → `monorepo-and-tooling`

**React and rendering:**
- `hook`, `useEffect`, `useState`, `useMemo`, `useCallback`, `ref`, `key`, `react composition` → `react-best-practices`
- `state`, `zustand`, `jotai`, `signal`, `context`, `store`, `atom` → `state-management-rules`
- `SSR`, `SSG`, `ISR`, `streaming`, `server component`, `RSC`, `hydration`, `suspense` → `rendering-strategies`
- `next.js`, `app router`, `server action`, `next middleware`, `revalidate`, `next/image` → `nextjs-best-practices`
- `route`, `layout`, `guard`, `redirect`, `parallel route`, `intercepting` → `nextjs-routing-rules` / `vite-routing-rules` (based on project type)

**UI, styles, and UX:**
- `tailwind`, `css module`, `responsive`, `dark mode`, `theme`, `custom property`, `material ui` → `css-rules`
- `accessibility`, `a11y`, `WCAG`, `ARIA`, `screen reader`, `focus`, `tab`, `landmark` → `a11y-rules`
- `animation`, `transition`, `framer motion`, `skeleton`, `loading`, `view transition` → `animations-and-transitions`
- `i18n`, `internationalization`, `translation`, `locale`, `pluralization`, `RTL`, `next-intl` → `i18n-rules`
- `SEO`, `metadata`, `og tag`, `structured data`, `sitemap`, `robots`, `canonical` → `seo-rules`

**Data and forms:**
- `fetch`, `query`, `tanstack`, `SWR`, `cache`, `optimistic`, `prefetch`, `stale` → `fetching-rules`
- `form`, `validation`, `zod`, `react hook form`, `multi-step`, `file upload` → `forms-and-validation-rules`

**Quality and security:**
- `eslint`, `prettier`, `biome`, `lint`, `naming`, `import order`, `code review` → `code-quality-rules`
- `test`, `vitest`, `jest`, `RTL`, `playwright`, `coverage`, `mock`, `snapshot` → `testing-rules`
- `performance`, `web vitals`, `LCP`, `CLS`, `INP`, `lazy`, `bundle`, `code splitting` → `performance-rules`
- `XSS`, `CSP`, `sanitize`, `CORS`, `token`, `cookie`, `frontend security` → `security-rules`
- `error boundary`, `sentry`, `fallback`, `retry`, `toast`, `error notification` → `error-handling-rules`

**Infrastructure:**
- `pnpm`, `dependency`, `lockfile`, `version`, `audit`, `update package` → `package-management-rules`

## 4. Mandatory Skills by Action

When creating/modifying a **component**:
- `testing-rules` — Vitest + RTL tests (coverage ≥ 80%)
- `a11y-rules` — WCAG 2.2 AA, roles, aria-labels, focus
- `clean-code-principles` — JSDoc on props/interfaces, named exports
- `i18n-rules` — strings not hardcoded (if the project uses i18n)
- `error-handling-rules` — error boundaries, fallback UI

When creating/modifying a **form** (all of the above plus):
- `forms-and-validation-rules` — React Hook Form + Zod
- `security-rules` — input sanitization, XSS prevention
- `a11y-rules` — associated labels, accessible error messages
- `governance-risk-and-compliance` → `gdpr` if capturing personal data, `owasp-top-10` for XSS

When creating/modifying a **hook or store**:
- `testing-rules` — unit tests for the hook/store
- `state-management-rules` — selectors, avoid re-renders

When creating/modifying **styles**:
- `css-rules` — Tailwind, responsive, dark mode
- `a11y-rules` — contrast, focus visible, reduced motion

When creating/modifying **data fetching**:
- `fetching-rules` — TanStack Query, cache, error states
- `error-handling-rules` — loading/error/empty states
- `security-rules` — don't expose tokens, sanitize responses

When implementing **authentication or token handling**:
- `security-rules` — secure token storage based on project type
- `governance-risk-and-compliance` → `owasp-top-10` (A07: Authentication Failures)
- `governance-risk-and-compliance` → `gdpr` if login involves personal data

When implementing **cookies or consent**:
- `governance-risk-and-compliance` → `gdpr` (cookie banner, granular consent)
- `governance-risk-and-compliance` → `ccpa-cpra` (Do Not Sell, GPC signal detection)

## 5. Universal Code Rules

```typescript
// TypeScript strict always
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}

// Export types alongside the component
export interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

// Components as named functions
export function Button({ variant, size, children, ...props }: ButtonProps) {
  return <button className={cn(variants[variant], sizes[size])} {...props}>{children}</button>;
}
```
