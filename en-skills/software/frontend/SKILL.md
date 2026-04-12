---
name: frontend
description: >
  Master index skill for frontend development. Orchestrates and routes to
  22 specialized sub-skills covering project architecture and component
  patterns through to performance, security, and testing.
  Main stack: React 19+, Next.js 15+, Vite, TypeScript strict,
  Tailwind CSS / Material UI, pnpm, Vitest/Jest/RTL.
---

# 🏗️ Frontend Skills — Master Index

## Technology Stack

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

---

## Skills Map by Layer

### 🏛️ Architecture and Structure

| Skill | Description | Scope |
|-------|-------------|-------|
| [project-structure](./project-structure/SKILL.md) | Folder structure, barrel files, path aliases | Base project organization |
| [component-patterns](./component-patterns/SKILL.md) | Composition patterns: compound, render props, HOC, slots | Generic component design |
| [design-system-build-components-rules](./design-system-build-components-rules/SKILL.md) | Atomic Design: atoms, molecules, organisms, tokens, variants | Design System construction |
| [monorepo-and-tooling](./monorepo-and-tooling/SKILL.md) | Turborepo, pnpm workspaces, shared configs | Multi-package architecture |

### ⚛️ React and Rendering

| Skill | Description | Scope |
|-------|-------------|-------|
| [react-best-practices](./react-best-practices/SKILL.md) | Hooks, composition, memoization, refs, keys | React core |
| [state-management-rules](./state-management-rules/SKILL.md) | Zustand, Jotai, Signals, Context, tool selection | State management |
| [rendering-strategies](./rendering-strategies/SKILL.md) | SSR, SSG, ISR, Streaming, RSC, hydration | Rendering strategies |
| [nextjs-best-practices](./nextjs-best-practices/SKILL.md) | App Router, Server Actions, middleware, caching | Next.js specific |
| [routing-rules](./routing-rules/SKILL.md) | Layouts, guards, route groups, parallel/intercepting routes | Navigation and routes |

### 🎨 UI, Styles, and UX

| Skill | Description | Scope |
|-------|-------------|-------|
| [css-rules](./css-rules/SKILL.md) | Tailwind, CSS Modules, custom properties, responsive, theming | Styles and layout |
| [a11y-rules](./a11y-rules/SKILL.md) | WCAG 2.2 AA, ARIA, focus management, screen readers | Accessibility |
| [animations-and-transitions](./animations-and-transitions/SKILL.md) | Framer Motion, CSS transitions, View Transitions, skeletons | Animations and micro-interactions |
| [i18n-rules](./i18n-rules/SKILL.md) | next-intl, ICU formatting, plurals, RTL, locale detection | Internationalization |
| [seo-rules](./seo-rules/SKILL.md) | Metadata API, structured data, OG tags, sitemap, robots | Technical SEO |

### 📡 Data and Forms

| Skill | Description | Scope |
|-------|-------------|-------|
| [fetching-rules](./fetching-rules/SKILL.md) | TanStack Query, SWR, cache, optimistic updates, prefetch | Data fetching |
| [forms-and-validation-rules](./forms-and-validation-rules/SKILL.md) | React Hook Form, Zod, multi-step, file upload, validation UX | Forms |

### ✅ Quality and Security

| Skill | Description | Scope |
|-------|-------------|-------|
| [code-quality-rules](./code-quality-rules/SKILL.md) | ESLint, Prettier, Biome, naming conventions, imports | Code quality |
| [testing-rules](./testing-rules/SKILL.md) | Vitest/Jest, RTL, Playwright, coverage, test patterns | Testing |
| [performance-rules](./performance-rules/SKILL.md) | Core Web Vitals, lazy loading, bundle analysis, memoization | Performance |
| [security-rules](./security-rules/SKILL.md) | XSS, CSP, sanitization, auth tokens, CORS | Frontend security |
| [error-handling-rules](./error-handling-rules/SKILL.md) | Error boundaries, Sentry, fallback UI, retry, toast | Error handling |

### 📦 Infrastructure

| Skill | Description | Scope |
|-------|-------------|-------|
| [package-management-rules](./package-management-rules/SKILL.md) | pnpm, lockfiles, versioning, auditing, updates | Dependency management |

---

## Sub-Skill Activation Guide

### Keywords → Skill

**Architecture and structure:**
- `structure`, `folders`, `folder`, `barrel`, `alias`, `path` → `project-structure`
- `compound component`, `render props`, `HOC`, `slots`, `composition`, `pattern` → `component-patterns`
- `design system`, `atom`, `molecule`, `organism`, `token`, `variant`, `storybook` → `design-system-build-components-rules`
- `monorepo`, `turborepo`, `workspace`, `shared config`, `multi-package` → `monorepo-and-tooling`

**React and rendering:**
- `hook`, `useEffect`, `useState`, `useMemo`, `useCallback`, `ref`, `key`, `react composition` → `react-best-practices`
- `state`, `zustand`, `jotai`, `signal`, `context`, `store`, `atom` → `state-management-rules`
- `SSR`, `SSG`, `ISR`, `streaming`, `server component`, `RSC`, `hydration`, `suspense` → `rendering-strategies`
- `next.js`, `app router`, `server action`, `next middleware`, `revalidate`, `next/image` → `nextjs-best-practices`
- `route`, `layout`, `guard`, `redirect`, `parallel route`, `intercepting` → `routing-rules`

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

---

## Cross-Cutting Principles

```typescript
// Every frontend skill MUST follow these principles:

// 1. TypeScript strict — ALWAYS
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}

// 2. Export types alongside the component
export interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

// 3. Components as named functions (not anonymous arrow exports)
export function Button({ variant, size, children, ...props }: ButtonProps) {
  return <button className={cn(variants[variant], sizes[size])} {...props}>{children}</button>;
}

// 4. NEVER:
// - any (use unknown + type guards)
// - index signatures without validation
// - useEffect to synchronize derived state
// - prop drilling > 2 levels (use composition or context)
// - inline CSS for complex dynamic styles (use Tailwind + cn())
```
