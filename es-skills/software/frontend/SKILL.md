---
name: frontend
description: >
  Skill índice maestro para desarrollo frontend. Orquesta y enruta hacia
  22 sub-skills especializadas que cubren desde arquitectura de proyecto y
  patrones de componentes hasta performance, seguridad y testing.
  Stack principal: React 19+, Next.js 15+, Vite, TypeScript strict,
  Tailwind CSS / Material UI, pnpm, Vitest/Jest/RTL.
---

# 🏗️ Frontend Skills — Índice Maestro

## Stack Tecnológico

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

---

## Mapa de Skills por Capa

### 🏛️ Arquitectura y Estructura

| Skill | Descripción | Alcance |
|-------|-------------|---------|
| [project-structure](./project-structure/SKILL.md) | Estructura de carpetas, barrel files, path aliases | Organización base del proyecto |
| [component-patterns](./component-patterns/SKILL.md) | Patrones de composición: compound, render props, HOC, slots | Diseño de componentes genéricos |
| [design-system-build-components-rules](./design-system-build-components-rules/SKILL.md) | Atomic Design: átomos, moléculas, organismos, tokens, variants | Construcción de Design System |
| [monorepo-and-tooling](./monorepo-and-tooling/SKILL.md) | Turborepo, pnpm workspaces, shared configs | Arquitectura multi-paquete |

### ⚛️ React y Rendering

| Skill | Descripción | Alcance |
|-------|-------------|---------|
| [react-best-practices](./react-best-practices/SKILL.md) | Hooks, composición, memoización, refs, keys | Core de React |
| [state-management-rules](./state-management-rules/SKILL.md) | Zustand, Jotai, Signals, Context, selección de herramienta | Gestión de estado |
| [rendering-strategies](./rendering-strategies/SKILL.md) | SSR, SSG, ISR, Streaming, RSC, hydration | Estrategias de rendering |
| [nextjs-best-practices](./nextjs-best-practices/SKILL.md) | App Router, Server Actions, middleware, caching | Next.js específico |
| [routing-rules](./routing-rules/SKILL.md) | Layouts, guards, route groups, parallel/intercepting routes | Navegación y rutas |

### 🎨 UI, Estilos y UX

| Skill | Descripción | Alcance |
|-------|-------------|---------|
| [css-rules](./css-rules/SKILL.md) | Tailwind, CSS Modules, custom properties, responsive, theming | Estilos y layout |
| [a11y-rules](./a11y-rules/SKILL.md) | WCAG 2.2 AA, ARIA, focus management, screen readers | Accesibilidad |
| [animations-and-transitions](./animations-and-transitions/SKILL.md) | Framer Motion, CSS transitions, View Transitions, skeletons | Animaciones y micro-interacciones |
| [i18n-rules](./i18n-rules/SKILL.md) | next-intl, formateo ICU, plurales, RTL, detección de locale | Internacionalización |
| [seo-rules](./seo-rules/SKILL.md) | Metadata API, structured data, OG tags, sitemap, robots | SEO técnico |

### 📡 Data y Formularios

| Skill | Descripción | Alcance |
|-------|-------------|---------|
| [fetching-rules](./fetching-rules/SKILL.md) | TanStack Query, SWR, cache, optimistic updates, prefetch | Data fetching |
| [forms-and-validation-rules](./forms-and-validation-rules/SKILL.md) | React Hook Form, Zod, multi-step, file upload, UX de validación | Formularios |

### ✅ Calidad y Seguridad

| Skill | Descripción | Alcance |
|-------|-------------|---------|
| [code-quality-rules](./code-quality-rules/SKILL.md) | ESLint, Prettier, Biome, naming conventions, imports | Calidad de código |
| [testing-rules](./testing-rules/SKILL.md) | Vitest/Jest, RTL, Playwright, coverage, test patterns | Testing |
| [performance-rules](./performance-rules/SKILL.md) | Core Web Vitals, lazy loading, bundle analysis, memoización | Rendimiento |
| [security-rules](./security-rules/SKILL.md) | XSS, CSP, sanitización, auth tokens, CORS | Seguridad frontend |
| [error-handling-rules](./error-handling-rules/SKILL.md) | Error boundaries, Sentry, fallback UI, retry, toast | Manejo de errores |

### 📦 Infraestructura

| Skill | Descripción | Alcance |
|-------|-------------|---------|
| [package-management-rules](./package-management-rules/SKILL.md) | pnpm, lockfiles, versioning, auditoría, actualización | Gestión de dependencias |

---

## Guía de Activación de Sub-Skills

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

---

## Principios Transversales

> **Estas reglas aplican SIEMPRE que se crea o modifica código frontend.**
> Cada sub-skill individual debe consultar esta sección para saber qué
> otras skills son obligatorias en paralelo.

### Skills Obligatorias por Acción

```
AL CREAR/MODIFICAR UN COMPONENTE:
  1. ☐ testing-rules        → Tests unitarios con Vitest + RTL (coverage ≥ 80%)
  2. ☐ a11y-rules           → WCAG 2.2 AA, roles, aria-labels, focus management
  3. ☐ clean-code-principles → JSDoc en props/interfaces, named exports, SRP
  4. ☐ i18n-rules           → Strings de UI NO hardcodeadas (si el proyecto usa i18n)
  5. ☐ error-handling-rules  → Error boundaries, fallback UI

AL CREAR/MODIFICAR UN FORMULARIO:
  1. ☐ Todos los anteriores +
  2. ☐ forms-and-validation-rules → React Hook Form + Zod, UX de validación
  3. ☐ security-rules             → Sanitización de inputs, XSS prevention
  4. ☐ a11y-rules                 → Labels asociados, error messages accesibles

AL CREAR/MODIFICAR UN HOOK O STORE:
  1. ☐ testing-rules              → Tests unitarios del hook/store
  2. ☐ clean-code-principles      → JSDoc, funciones puras, naming expresivo
  3. ☐ state-management-rules     → Selectors, evitar re-renders

AL CREAR/MODIFICAR ESTILOS:
  1. ☐ css-rules                  → Tailwind, responsive, dark mode
  2. ☐ a11y-rules                 → Contraste, focus visible, reduced motion

AL CREAR/MODIFICAR DATA FETCHING:
  1. ☐ fetching-rules             → TanStack Query, cache, error states
  2. ☐ error-handling-rules       → Loading/error/empty estados
  3. ☐ security-rules             → No exponer tokens, sanitizar respuestas
```

### Cadena de Consulta

```
Cuando una sub-skill se activa, el agente DEBE:

  1. Leer la sub-skill solicitada (ej: component-patterns)
  2. Volver a ESTE índice (frontend/SKILL.md)
  3. Consultar "Skills Obligatorias por Acción" según lo que está haciendo
  4. Leer y aplicar cada skill obligatoria marcada con ☐
  5. Verificar que el código cumple TODAS antes de marcar como completado

El agente NO marca una tarea como completada si falta alguna skill
obligatoria de esta lista.
```

### Reglas Universales de Código

```typescript
// Toda skill frontend DEBE cumplir estos principios:

// 1. TypeScript strict — SIEMPRE
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}

// 2. Exportar tipos junto al componente
export interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

// 3. Componentes como funciones con nombre (no arrow exports anónimas)
export function Button({ variant, size, children, ...props }: ButtonProps) {
  return <button className={cn(variants[variant], sizes[size])} {...props}>{children}</button>;
}

// 4. NUNCA:
// - any (usar unknown + type guards)
// - index signatures sin validar
// - useEffect para sincronizar estado derivado
// - prop drilling > 2 niveles (usar composición o context)
// - CSS inline para estilos dinámicos complejos (usar Tailwind + cn())
```
