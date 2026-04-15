---
name: frontend
description: >
  Usa esta skill cuando trabajes en frontend. Orquesta sub-skills
  especializadas que cubren arquitectura, componentes, rendering, estilos,
  data fetching, testing, performance y seguridad.
  Stack: React 19+, Next.js 15+, Vite 6+, TypeScript strict, Tailwind CSS, pnpm.
---

# Frontend Skills — Índice Maestro

## Cross-references obligatorias

Antes de ejecutar cualquier tarea frontend, el agente **debe** consultar estas skills externas cuando apliquen:

| Skill externa | Cuándo consultar |
|---------------|-----------------|
| [`agent-workflow`](../agent-workflow/SKILL.md) | **Siempre** al iniciar un proyecto nuevo o retomar uno existente. Define el protocolo de clarificación, checkpoints, iteration-rules y documentación (`docs-structure`, `project-resumption`). |
| [`governance-risk-and-compliance`](../governance-risk-and-compliance/SKILL.md) | Cuando el frontend maneje datos personales (formularios, cookies, tokens), implemente consentimiento, opt-out, o cualquier flujo regulado. Activar sub-skills relevantes: `gdpr` (consentimiento, cookies), `owasp-top-10` (XSS, CSP, sanitización), `ccpa-cpra` (Do Not Sell, GPC). |

## Detección del tipo de proyecto

Antes de aplicar sub-skills, identificar el tipo de proyecto:

| Señal | Tipo | Implicación |
|-------|------|-------------|
| Existe `next.config.ts` o `next.config.js` | **Next.js App Router** | Usar secciones "Next.js" en cada sub-skill. Routing vía file-system, Server Components, Server Actions. |
| Existe `vite.config.ts` y NO hay `next.config.*` | **Vite + React SPA** | Usar secciones "Vite SPA" en cada sub-skill. Routing vía `react-router-dom`, todo client-side, tokens en memoria. |
| Algún otro framework (Remix, Astro, etc.) | **Otro** | Adaptar los principios generales de cada sub-skill al framework detectado. |

Si es un **proyecto nuevo**, preguntar al desarrollador qué tipo de proyecto es antes de proceder.

## Flujo de trabajo del agente

0. Si es proyecto nuevo o sin contexto → consultar `agent-workflow` → `project-resumption`.
1. Detectar tipo de proyecto (Next.js vs Vite SPA vs Otro) usando la tabla anterior.
2. Identificar la acción (crear componente, formulario, hook, estilos, data fetching).
3. Consultar el mapa de skills (sección 2) o la guía de activación por palabras clave (sección 3).
4. Leer la sub-skill específica — aplicar la sección correcta según tipo de proyecto.
5. Volver a este índice y consultar "Skills obligatorias por acción" (sección 4).
6. Leer y aplicar cada skill obligatoria según el tipo de acción.
7. Consultar `governance-risk-and-compliance` si la acción involucra datos personales, cookies o tokens.
8. Verificar cumplimiento de reglas universales de código (sección 5).
9. No marcar tarea como completada hasta cumplir todas las skills obligatorias.

## 1. Stack Tecnológico

| Capa | Tecnologías |
|------|-------------|
| **UI Library** | React 19+, Server Components, Suspense |
| **Meta-Framework** | Next.js 15+ (App Router), Vite 6+ |
| **Lenguaje** | TypeScript strict (`strict: true`, `noUncheckedIndexedAccess`) |
| **Estilos** | Tailwind CSS 4+, CSS Modules, Material UI 6+ |
| **Estado** | Zustand, Jotai, Signals (`@preact/signals-react`), React Context |
| **Data Fetching** | TanStack Query v5, SWR, Server Actions |
| **Forms** | React Hook Form + Zod |
| **Testing** | Vitest, Jest, React Testing Library, Playwright |
| **Package Manager** | pnpm 9+ |
| **Monorepo** | Turborepo, pnpm workspaces |
| **i18n** | next-intl, react-i18next, ICU MessageFormat |
| **Animaciones** | Framer Motion, View Transitions API |

## 2. Mapa de Skills por Capa

### Arquitectura y Estructura

| Skill | Descripción | Alcance |
|-------|-------------|---------|
| [nextjs-project-structure](../nextjs-project-structure/SKILL.md) | Estructura de carpetas App Router, route groups, barrel files, path aliases | Organización base Next.js |
| [vite-project-structure](../vite-project-structure/SKILL.md) | Estructura de carpetas Vite SPA, router centralizado, path aliases con vite-tsconfig-paths | Organización base Vite SPA |
| [component-patterns](../component-patterns/SKILL.md) | Patrones de composición: compound, render props, HOC, slots | Diseño de componentes genéricos |
| [design-system-build-components-rules](../design-system-build-components-rules/SKILL.md) | Atomic Design: átomos, moléculas, organismos, tokens, variants | Construcción de Design System |
| [storybook](../storybook/SKILL.md) | CSF3, controls, play functions, addon-a11y, decorators de providers, tokens | Stories y testing visual del DS |
| [monorepo-and-tooling](../monorepo-and-tooling/SKILL.md) | Turborepo, pnpm workspaces, shared configs | Arquitectura multi-paquete |

### React y Rendering

| Skill | Descripción | Alcance |
|-------|-------------|---------|
| [react-best-practices](../react-best-practices/SKILL.md) | Hooks, composición, memoización, refs, keys | Core de React |
| [state-management-rules](../state-management-rules/SKILL.md) | Zustand, Jotai, Signals, Context, selección de herramienta | Gestión de estado |
| [rendering-strategies](../rendering-strategies/SKILL.md) | SSR, SSG, ISR, Streaming, RSC, hydration | Estrategias de rendering |
| [nextjs-best-practices](../nextjs-best-practices/SKILL.md) | App Router, Server Actions, middleware, caching | Next.js específico |
| [nextjs-routing-rules](../nextjs-routing-rules/SKILL.md) | Layouts, route groups, parallel/intercepting routes, guards en layout | Routing Next.js App Router |
| [vite-routing-rules](../vite-routing-rules/SKILL.md) | createBrowserRouter, Outlet layouts, protected routes, lazy loading | Routing Vite SPA (React Router v6) |

### UI, Estilos y UX

| Skill | Descripción | Alcance |
|-------|-------------|---------|
| [css-rules](../css-rules/SKILL.md) | Tailwind, CSS Modules, custom properties, responsive, theming | Estilos y layout |
| [a11y-rules](../a11y-rules/SKILL.md) | WCAG 2.2 AA, ARIA, focus management, screen readers | Accesibilidad |
| [animations-and-transitions](../animations-and-transitions/SKILL.md) | Framer Motion, CSS transitions, View Transitions, skeletons | Animaciones y micro-interacciones |
| [i18n-react-rules](../i18n-react-rules/SKILL.md) | react-i18next, i18next, Intl API, plurales, RTL, detección de locale | i18n Vite SPA |
| [i18n-nextjs-rules](../i18n-nextjs-rules/SKILL.md) | next-intl, useTranslations, useFormatter, ICU, middleware locale | i18n Next.js |
| [seo-rules](../seo-rules/SKILL.md) | Metadata API, structured data, OG tags, sitemap, robots | SEO técnico |

### Data y Formularios

| Skill | Descripción | Alcance |
|-------|-------------|---------|
| [fetching-rules](../fetching-rules/SKILL.md) | TanStack Query, SWR, cache, optimistic updates, prefetch | Data fetching |
| [forms-and-validation-rules](../forms-and-validation-rules/SKILL.md) | React Hook Form, Zod, multi-step, file upload, UX de validación | Formularios |

### Calidad y Seguridad

| Skill | Descripción | Alcance |
|-------|-------------|---------|
| [code-quality-rules](../code-quality-rules/SKILL.md) | ESLint, Prettier, Biome, naming conventions, imports | Calidad de código |
| [testing-rules](../testing-rules/SKILL.md) | Vitest/Jest, RTL, Playwright, coverage, test patterns | Testing |
| [performance-rules](../performance-rules/SKILL.md) | Core Web Vitals, lazy loading, bundle analysis, memoización | Rendimiento |
| [security-rules](../security-rules/SKILL.md) | XSS, CSP, sanitización, auth tokens, CORS | Seguridad frontend |
| [error-handling-rules](../error-handling-rules/SKILL.md) | Error boundaries, Sentry, fallback UI, retry, toast | Manejo de errores |

### Infraestructura

| Skill | Descripción | Alcance |
|-------|-------------|---------|
| [install-dependencies-rules](../../install-dependencies-rules/SKILL.md) | pnpm obligatorio, pin exact, pnpm view, audit, osv-scanner, Dependabot | Gestión de dependencias |

## 3. Guía de Activación por Palabras Clave

### Palabras Clave → Skill

**Arquitectura y estructura:**
- `estructura`, `carpetas`, `folder`, `barrel`, `alias`, `path` → `nextjs-project-structure` / `vite-project-structure` (según tipo de proyecto)
- `compound component`, `render props`, `HOC`, `slots`, `composición`, `patrón` → `component-patterns`
- `design system`, `átomo`, `molécula`, `organismo`, `token`, `variant` → `design-system-build-components-rules`
- `storybook`, `story`, `stories`, `addon`, `play function`, `controls`, `argTypes`, `autodocs` → `storybook`
- `monorepo`, `turborepo`, `workspace`, `shared config`, `multi-paquete` → `monorepo-and-tooling`

**React y rendering:**
- `hook`, `useEffect`, `useState`, `useMemo`, `useCallback`, `ref`, `key`, `composición react` → `react-best-practices`
- `estado`, `state`, `zustand`, `jotai`, `signal`, `context`, `store`, `atom` → `state-management-rules`
- `SSR`, `SSG`, `ISR`, `streaming`, `server component`, `RSC`, `hydration`, `suspense` → `rendering-strategies`
- `next.js`, `app router`, `server action`, `middleware next`, `revalidate`, `next/image` → `nextjs-best-practices`
- `ruta`, `route`, `layout`, `guard`, `redirect`, `parallel route`, `intercepting` → `nextjs-routing-rules` / `vite-routing-rules` (según tipo de proyecto)

**UI, estilos y UX:**
- `tailwind`, `css module`, `responsive`, `dark mode`, `theme`, `custom property`, `material ui` → `css-rules`
- `accesibilidad`, `a11y`, `WCAG`, `ARIA`, `screen reader`, `focus`, `tab`, `landmark` → `a11y-rules`
- `animación`, `transition`, `framer motion`, `skeleton`, `loading`, `view transition` → `animations-and-transitions`
- `i18n`, `internacionalización`, `traducción`, `locale`, `pluralización`, `RTL`, `react-i18next` → `i18n-react-rules` (Vite SPA)
- `i18n`, `next-intl`, `traducción`, `locale`, `pluralización`, `RTL`, `getTranslations` → `i18n-nextjs-rules` (Next.js)
- `SEO`, `metadata`, `og tag`, `structured data`, `sitemap`, `robots`, `canonical` → `seo-rules`

**Data y formularios:**
- `fetch`, `query`, `tanstack`, `SWR`, `cache`, `optimistic`, `prefetch`, `stale` → `fetching-rules`
- `formulario`, `form`, `validación`, `zod`, `react hook form`, `multi-step`, `file upload` → `forms-and-validation-rules`

**Calidad y seguridad:**
- `eslint`, `prettier`, `biome`, `lint`, `naming`, `import order`, `code review` → `code-quality-rules`
- `test`, `vitest`, `jest`, `RTL`, `playwright`, `coverage`, `mock`, `snapshot` → `testing-rules`
- `performance`, `web vitals`, `LCP`, `CLS`, `INP`, `lazy`, `bundle`, `code splitting` → `performance-rules`
- `XSS`, `CSP`, `sanitizar`, `CORS`, `token`, `cookie`, `seguridad frontend` → `security-rules`
- `error boundary`, `sentry`, `fallback`, `retry`, `toast`, `notificación error` → `error-handling-rules`

**Infraestructura:**
- `pnpm`, `dependencia`, `lockfile`, `versión`, `audit`, `actualizar paquete`, `instalar paquete`, `supply chain` → `install-dependencies-rules`

## 4. Skills Obligatorias por Acción

Al crear/modificar un **componente**:
- [`testing-rules`](../testing-rules/SKILL.md) — tests Vitest + RTL (coverage ≥ 80%)
- [`a11y-rules`](../a11y-rules/SKILL.md) — WCAG 2.2 AA, roles, aria-labels, focus
- [`clean-code-principles`](../clean-code-principles/SKILL.md) — JSDoc en props/interfaces, named exports
- [`code-quality-rules`](../code-quality-rules/SKILL.md) — ESLint, naming conventions, imports organizados
- [`i18n-react-rules`](../i18n-react-rules/SKILL.md) / [`i18n-nextjs-rules`](../i18n-nextjs-rules/SKILL.md) — strings no hardcodeadas (según tipo de proyecto)
- [`error-handling-rules`](../error-handling-rules/SKILL.md) — error boundaries, fallback UI

Al crear/modificar un **formulario** (todos los anteriores más):
- [`forms-and-validation-rules`](../forms-and-validation-rules/SKILL.md) — React Hook Form + Zod
- [`security-rules`](../security-rules/SKILL.md) — sanitización de inputs, XSS prevention
- [`a11y-rules`](../a11y-rules/SKILL.md) — labels asociados, mensajes de error accesibles
- [`governance-risk-and-compliance`](../governance-risk-and-compliance/SKILL.md) → [`gdpr`](../gdpr/SKILL.md) si captura datos personales, [`owasp-top-10`](../owasp-top-10/SKILL.md) para XSS

Al crear/modificar un **hook o store**:
- [`testing-rules`](../testing-rules/SKILL.md) — tests unitarios del hook/store
- [`state-management-rules`](../state-management-rules/SKILL.md) — selectores, evitar re-renders
- [`code-quality-rules`](../code-quality-rules/SKILL.md) — naming, imports

Al crear/modificar **estilos**:
- [`css-rules`](../css-rules/SKILL.md) — Tailwind, responsive, dark mode
- [`a11y-rules`](../a11y-rules/SKILL.md) — contraste, focus visible, reduced motion

Al crear/modificar **data fetching**:
- [`fetching-rules`](../fetching-rules/SKILL.md) — TanStack Query, cache, error states
- [`error-handling-rules`](../error-handling-rules/SKILL.md) — loading/error/empty estados
- [`security-rules`](../security-rules/SKILL.md) — no exponer tokens, sanitizar respuestas
- [`code-quality-rules`](../code-quality-rules/SKILL.md) — naming de query keys, organización de hooks

Al implementar **autenticación o manejo de tokens**:
- [`security-rules`](../security-rules/SKILL.md) — almacenamiento seguro de tokens según tipo de proyecto
- [`governance-risk-and-compliance`](../governance-risk-and-compliance/SKILL.md) → [`owasp-top-10`](../owasp-top-10/SKILL.md) (A07: Authentication Failures)
- [`governance-risk-and-compliance`](../governance-risk-and-compliance/SKILL.md) → [`gdpr`](../gdpr/SKILL.md) si el login involucra datos personales

Al implementar **cookies o consentimiento**:
- [`governance-risk-and-compliance`](../governance-risk-and-compliance/SKILL.md) → [`gdpr`](../gdpr/SKILL.md) (cookie banner, consentimiento granular)
- [`governance-risk-and-compliance`](../governance-risk-and-compliance/SKILL.md) → [`ccpa-cpra`](../ccpa-cpra/SKILL.md) (Do Not Sell, GPC signal detection)

Al crear/modificar **layouts o navegación**:
- [`a11y-rules`](../a11y-rules/SKILL.md) — landmarks (`<nav>`, `<main>`, `<aside>`), `aria-current="page"`, skip links
- [`css-rules`](../css-rules/SKILL.md) — responsive sidebar/header, Tailwind breakpoints
- [`error-handling-rules`](../error-handling-rules/SKILL.md) — Not Found page, catch-all routes

## 5. Reglas Universales de Código

```typescript
// TypeScript strict siempre
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}

// Exportar tipos junto al componente
export interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

// Componentes como funciones con nombre
export function Button({ variant, size, children, ...props }: ButtonProps) {
  return <button className={cn(variants[variant], sizes[size])} {...props}>{children}</button>;
}
```
