---
name: docs-structure
description: >
  Convención de la carpeta .docs/ dentro de cada proyecto. Define qué sub-carpetas
  existen, qué va en cada una, reglas de naming, y cuándo crear o actualizar archivos.
  Esta carpeta es el centro nervioso de la comunicación entre desarrollador y agente.
---

# 📁 Docs Structure — Convención de la Carpeta `.docs/`

## Principio

> **`.docs/` es el contrato entre el desarrollador y el agente.**
> Todo lo que el agente necesita saber sobre el proyecto está aquí.
> Todo lo que el agente produce como documentación va aquí.

---

## Estructura

```
.docs/
├── features/                    ← User Stories / Features a implementar
│   ├── auth-login/
│   │   └── feature.md
│   ├── user-profile/
│   │   └── feature.md
│   └── payment-checkout/
│       └── feature.md
│
├── brainstorming/               ← Ideas en exploración (pre-feature)
│   ├── gamification-ideas.md
│   └── notification-system.md
│
├── rules/                       ← Reglas específicas del proyecto
│   ├── business-rules.md
│   ├── api-conventions.md
│   └── naming-conventions.md
│
├── context/                     ← Bitácora de iteración actual
│   ├── iteration-2026-04-11.md
│   └── iteration-2026-04-08.md
│
└── memory/                      ← Historial de lo implementado
    ├── 2026-04.md
    └── 2026-03.md
```

---

## Carpeta: `features/`

```
Quién escribe:  El desarrollador
Quién consume:  El agente
Cuándo se crea: Cuando hay un feature definido listo para implementar

Estructura interna: ver sub-skill requirements-format

Naming de carpetas:
  ✅ kebab-case descriptivo: auth-login, user-profile, payment-checkout
  ❌ IDs crípticos: US-001, feat-23
  ❌ Nombres vagos: update, changes, new-stuff

Cada feature tiene su propia carpeta con un archivo feature.md.
Opcionalmente puede incluir archivos adicionales:
  - wireframes/ (imágenes de referencia)
  - api-spec.md (contratos de API específicos del feature)
  - data-model.md (schema o modelo de datos)
```

---

## Carpeta: `brainstorming/`

```
Quién escribe:  El desarrollador (inicio) + El agente (colaboración)
Quién consume:  Ambos
Cuándo se crea: Cuando hay una idea que necesita exploración antes de ser feature

Formato: libre, pero con estructura sugerida:

  # [Nombre de la idea]

  ## Contexto
  [Por qué estamos explorando esto]

  ## Ideas iniciales
  - Idea A: ...
  - Idea B: ...

  ## Preguntas abiertas
  - ¿...?
  - ¿...?

  ## Q&A con agente
  **Dev:** [pregunta o escenario]
  **Agente:** [respuesta, análisis, propuesta]

  ## Conclusiones
  [Lo que se decidió]

  ## → Feature derivado
  [Link al feature en .docs/features/ cuando se gradúe]

Regla: cuando un brainstorming madura lo suficiente para tener
overview + goals + A/C claros → se gradúa a feature.
El brainstorming original se mantiene como referencia histórica.
```

---

## Carpeta: `rules/`

```
Quién escribe:  El desarrollador
Quién consume:  El agente
Cuándo se crea: Cuando hay reglas específicas del proyecto

Contenido típico:
  - Reglas de negocio de alto nivel
  - Convenciones de API del proyecto (naming, versionado, response format)
  - Restricciones técnicas ("no usar librería X", "máximo N dependencias")
  - Decisiones arquitectónicas ya tomadas y su justificación
  - Glosario de dominio (términos del negocio y su significado)

Formato:
  Un archivo por dominio de reglas. Bullet points concisos.
  El agente consulta esta carpeta ANTES de tomar decisiones técnicas.

Ejemplo — business-rules.md:

  # Reglas de Negocio

  ## Usuarios
  - Un usuario puede tener máximo 3 workspaces activos
  - El plan free tiene límite de 5 miembros por workspace
  - Los emails son case-insensitive y se normalizan a lowercase

  ## Pagos
  - Los precios siempre se almacenan en centavos (integer)
  - Las suscripciones se cobran al inicio del período
  - No hay reembolsos automáticos — requieren aprobación manual
```

---

## Carpeta: `context/`

```
Quién escribe:  El agente (principalmente)
Quién consume:  El agente (al retomar), el desarrollador (para supervisar)
Cuándo se crea: Al inicio de cada sesión de trabajo significativa
Cuándo se actualiza: Durante la implementación, al terminar bloques

Propósito: bitácora de la iteración ACTUAL. Qué se está haciendo,
qué decisiones se tomaron, qué queda pendiente.

Naming: iteration-YYYY-MM-DD.md (una por día o sesión)

Formato:

  # Iteración — 2026-04-11

  ## Objetivo
  Implementar feature: auth-login

  ## Estado
  🟢 Completado | 🟡 En progreso | 🔴 Bloqueado

  ## Trabajo realizado
  - [x] Crear componente LoginForm
  - [x] Implementar endpoint POST /auth/login
  - [ ] Agregar validación de 2FA
  - [ ] Tests de integración

  ## Decisiones tomadas
  - Se usó bcrypt en vez de argon2 por compatibilidad con hosting
  - El token JWT expira en 15 min con refresh token de 7 días

  ## Bloqueantes / Preguntas pendientes
  - ¿El 2FA es obligatorio o opcional por usuario?

  ## Próximos pasos
  - Resolver pregunta de 2FA
  - Completar tests

REGLA: el agente actualiza context/ DURANTE el trabajo, no solo al final.
Si el agente se desconecta a mitad de tarea, context/ debe reflejar
exactamente dónde quedó.
```

---

## Carpeta: `memory/`

```
Quién escribe:  El agente
Quién consume:  El agente (al retomar proyecto)
Cuándo se crea: Al completar un feature o bloque de trabajo
Cuándo se actualiza: Append-only — nunca editar entries anteriores

Propósito: historial PERMANENTE de lo implementado. No tiene próximos
pasos ni pendientes — solo hechos consumados.

Naming: YYYY-MM.md (un archivo por mes)

Formato (template obligatorio):

  # Memory — 2026-04

  ## 2026-04-11 — auth-login
  - **Feature:** Login con email y password
  - **Implementado:**
    - Componente LoginForm con validación Zod
    - Endpoint POST /api/auth/login
    - JWT con refresh token (15min / 7d)
    - Middleware de autenticación
    - Tests unitarios y de integración
  - **Decisiones:**
    - bcrypt sobre argon2 (compatibilidad)
    - Token en httpOnly cookie (no localStorage)
  - **Archivos principales:**
    - src/components/auth/LoginForm.tsx
    - src/app/api/auth/login/route.ts
    - src/middleware.ts

  ## 2026-04-08 — project-setup
  - **Feature:** Setup inicial del proyecto
  - **Implementado:**
    - Next.js 15 + TypeScript + Tailwind
    - Estructura de carpetas base
    - ESLint + Prettier + Husky
    - CI workflow (lint + test + build)
  - **Decisiones:**
    - App Router (no Pages)
    - pnpm como package manager
  - **Archivos principales:**
    - package.json, tsconfig.json, .eslintrc.js

REGLAS:
  - Solo registrar lo que efectivamente se implementó
  - NO incluir planes futuros ni TODOs
  - Incluir decisiones técnicas relevantes (por qué X y no Y)
  - Listar archivos principales creados/modificados
  - Fecha exacta de cada entry
  - Append-only: las entries pasadas NO se editan
```

---

## Gitignore

```
La inclusión de .docs/ en el repositorio es DECISIÓN del desarrollador.

Si se incluye en git (default recomendado):
  ✅ El equipo comparte contexto de features y reglas
  ✅ El historial de decisiones queda versionado
  ✅ Nuevos miembros del equipo tienen onboarding

Si se excluye del git:
  ✅ Documentación personal del dev
  ✅ Brainstorming privados
  ⚠️ Se pierde si no hay backup

Opción mixta (recomendada para equipos):
  # .gitignore
  .docs/brainstorming/     # Ideas personales
  .docs/context/           # Bitácora de sesión local
  # NO ignorar:
  # .docs/features/        # Compartido
  # .docs/rules/           # Compartido
  # .docs/memory/          # Compartido
```

---

## Reglas del Agente sobre `.docs/`

```
1. NUNCA borrar archivos de .docs/ sin confirmación explícita
2. NUNCA editar features/ — eso lo escribe el desarrollador
3. SÍ puede proponer cambios a features/ con sugerencias
4. SÍ escribe en context/ y memory/ como parte de su flujo
5. SÍ colabora en brainstorming/ cuando se le pide
6. SIEMPRE consultar rules/ antes de decisiones técnicas/negocio
7. Si .docs/ no existe, preguntar si debe crearla con la estructura estándar
```

---

## Anti-patrones

```
❌ Features sin A/C → el agente no debe implementar sin criterios de aceptación
❌ Memory con TODOs o next steps → memory es solo hechos consumados
❌ Context desactualizado → el agente debe actualizar context/ DURANTE el trabajo
❌ Brainstorming que nunca se gradúa → si tiene overview + goals + A/C → mover a features/
❌ Rules vacías o genéricas → mejor no tener rules que tener "ser consistente"
❌ Un solo archivo context.md gigante → un archivo por iteración/día
❌ Memory sin fechas → imposible reconstruir timeline
❌ El agente editando features del desarrollador sin pedirlo
```
