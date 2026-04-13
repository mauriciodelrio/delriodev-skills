---
name: frontend
description: >
  Usa esta skill cuando trabajes en frontend. Orquesta 22 sub-skills
  especializadas que cubren arquitectura, componentes, rendering, estilos,
  data fetching, testing, performance y seguridad.
  Stack: React 19+, Next.js 15+, TypeScript strict, Tailwind CSS, pnpm.
---

# Frontend Skills — Índice Maestro

## Flujo de trabajo del agente

1. Identificar la acción (crear componente, formulario, hook, estilos, data fetching).
2. Consultar el mapa de skills (sección 2) o la guía de activación por palabras clave (sección 3).
3. Leer la sub-skill específica.
4. Volver a este índice y consultar "Skills obligatorias por acción" (sección 4).
5. Leer y aplicar cada skill obligatoria según el tipo de acción.
6. Verificar cumplimiento de reglas universales de código (sección 5).
7. No marcar tarea como completada hasta cumplir todas las skills obligatorias.

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
| [project-structure](./project-structure/SKILL.md) | Estructura de carpetas, barrel files, path aliases | Organización base del proyecto |
| [component-patterns](./component-patterns/SKILL.md) | Patrones de composición: compound, render props, HOC, slots | Diseño de componentes genéricos |
| [design-system-build-components-rules](./design-system-build-components-rules/SKILL.md) | Atomic Design: átomos, moléculas, organismos, tokens, variants | Construcción de Design System |
| [monorepo-and-tooling](./monorepo-and-tooling/SKILL.md) | Turborepo, pnpm workspaces, shared configs | Arquitectura multi-paquete |

### React y Rendering

| Skill | Descripción | Alcance |
|-------|-------------|---------|
| [react-best-practices](./react-best-practices/SKILL.md) | Hooks, composición, memoización, refs, keys | Core de React |
| [state-management-rules](./state-management-rules/SKILL.md) | Zustand, Jotai, Signals, Context, selección de herramienta | Gestión de estado |
| [rendering-strategies](./rendering-strategies/SKILL.md) | SSR, SSG, ISR, Streaming, RSC, hydration | Estrategias de rendering |
| [nextjs-best-practices](./nextjs-best-practices/SKILL.md) | App Router, Server Actions, middleware, caching | Next.js específico |
| [routing-rules](./routing-rules/SKILL.md) | Layouts, guards, route groups, parallel/intercepting routes | Navegación y rutas |

### UI, Estilos y UX

| Skill | Descripción | Alcance |
|-------|-------------|---------|
| [css-rules](./css-rules/SKILL.md) | Tailwind, CSS Modules, custom properties, responsive, theming | Estilos y layout |
| [a11y-rules](./a11y-rules/SKILL.md) | WCAG 2.2 AA, ARIA, focus management, screen readers | Accesibilidad |
| [animations-and-transitions](./animations-and-transitions/SKILL.md) | Framer Motion, CSS transitions, View Transitions, skeletons | Animaciones y micro-interacciones |
| [i18n-rules](./i18n-rules/SKILL.md) | next-intl, formateo ICU, plurales, RTL, detección de locale | Internacionalización |
| [seo-rules](./seo-rules/SKILL.md) | Metadata API, structured data, OG tags, sitemap, robots | SEO técnico |

### Data y Formularios

| Skill | Descripción | Alcance |
|-------|-------------|---------|
| [fetching-rules](./fetching-rules/SKILL.md) | TanStack Query, SWR, cache, optimistic updates, prefetch | Data fetching |
| [forms-and-validation-rules](./forms-and-validation-rules/SKILL.md) | React Hook Form, Zod, multi-step, file upload, UX de validación | Formularios |

### Calidad y Seguridad

| Skill | Descripción | Alcance |
|-------|-------------|---------|
| [code-quality-rules](./code-quality-rules/SKILL.md) | ESLint, Prettier, Biome, naming conventions, imports | Calidad de código |
| [testing-rules](./testing-rules/SKILL.md) | Vitest/Jest, RTL, Playwright, coverage, test patterns | Testing |
| [performance-rules](./performance-rules/SKILL.md) | Core Web Vitals, lazy loading, bundle analysis, memoización | Rendimiento |
| [security-rules](./security-rules/SKILL.md) | XSS, CSP, sanitización, auth tokens, CORS | Seguridad frontend |
| [error-handling-rules](./error-handling-rules/SKILL.md) | Error boundaries, Sentry, fallback UI, retry, toast | Manejo de errores |

### Infraestructura

| Skill | Descripción | Alcance |
|-------|-------------|---------|
| [package-management-rules](./package-management-rules/SKILL.md) | pnpm, lockfiles, versioning, auditoría, actualización | Gestión de dependencias |

## 3. Guía de Activación por Palabras Clave

### Palabras Clave → Skill

**Arquitectura y estructura:**
- `estructura`, `carpetas`, `folder`, `barrel`, `alias`, `path` → `project-structure`
- `compound component`, `render props`, `HOC`, `slots`, `composición`, `patrón` → `component-patterns`
- `design system`, `átomo`, `molécula`, `organismo`, `token`, `variant`, `storybook` → `design-system-build-components-rules`
- `monorepo`, `turborepo`, `workspace`, `shared config`, `multi-paquete` → `monorepo-and-tooling`

**React y rendering:**
- `hook`, `useEffect`, `useState`, `useMemo`, `useCallback`, `ref`, `key`, `composición react` → `react-best-practices`
- `estado`, `state`, `zustand`, `jotai`, `signal`, `context`, `store`, `atom` → `state-management-rules`
- `SSR`, `SSG`, `ISR`, `streaming`, `server component`, `RSC`, `hydration`, `suspense` → `rendering-strategies`
- `next.js`, `app router`, `server action`, `middleware next`, `revalidate`, `next/image` → `nextjs-best-practices`
- `ruta`, `route`, `layout`, `guard`, `redirect`, `parallel route`, `intercepting` → `routing-rules`

**UI, estilos y UX:**
- `tailwind`, `css module`, `responsive`, `dark mode`, `theme`, `custom property`, `material ui` → `css-rules`
- `accesibilidad`, `a11y`, `WCAG`, `ARIA`, `screen reader`, `focus`, `tab`, `landmark` → `a11y-rules`
- `animación`, `transition`, `framer motion`, `skeleton`, `loading`, `view transition` → `animations-and-transitions`
- `i18n`, `internacionalización`, `traducción`, `locale`, `pluralización`, `RTL`, `next-intl` → `i18n-rules`
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
- `pnpm`, `dependencia`, `lockfile`, `versión`, `audit`, `actualizar paquete` → `package-management-rules`

## 4. Skills Obligatorias por Acción

Al crear/modificar un **componente**:
- `testing-rules` — tests Vitest + RTL (coverage ≥ 80%)
- `a11y-rules` — WCAG 2.2 AA, roles, aria-labels, focus
- `clean-code-principles` — JSDoc en props/interfaces, named exports
- `i18n-rules` — strings no hardcodeadas (si el proyecto usa i18n)
- `error-handling-rules` — error boundaries, fallback UI

Al crear/modificar un **formulario** (todos los anteriores más):
- `forms-and-validation-rules` — React Hook Form + Zod
- `security-rules` — sanitización de inputs, XSS prevention
- `a11y-rules` — labels asociados, mensajes de error accesibles

Al crear/modificar un **hook o store**:
- `testing-rules` — tests unitarios del hook/store
- `state-management-rules` — selectores, evitar re-renders

Al crear/modificar **estilos**:
- `css-rules` — Tailwind, responsive, dark mode
- `a11y-rules` — contraste, focus visible, reduced motion

Al crear/modificar **data fetching**:
- `fetching-rules` — TanStack Query, cache, error states
- `error-handling-rules` — loading/error/empty estados
- `security-rules` — no exponer tokens, sanitizar respuestas

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
