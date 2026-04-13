---
name: docs-structure
description: >
  Usa este skill cuando el usuario quiera organizar la documentación de un proyecto,
  crear o mantener la carpeta .docs/, o definir dónde van features, reglas de negocio,
  bitácoras de iteración o historial de implementación. Aplica también cuando el agente
  necesite saber dónde leer contexto del proyecto o dónde registrar decisiones y trabajo
  completado, incluso si el usuario no menciona ".docs/" explícitamente.
---

# Docs Structure — Convención de la Carpeta `.docs/`

> `.docs/` es el contrato entre el desarrollador y el agente.
> Todo lo que el agente necesita saber está aquí. Todo lo que produce como documentación va aquí.

## Flujo de trabajo del agente

1. **Al iniciar trabajo** → leer `rules/` y el `memory/` del mes actual para contexto
2. **Al recibir un feature** → leer `.docs/features/<nombre>/feature.md` y verificar que tenga A/C
3. **Durante implementación** → crear o actualizar `context/iteration-YYYY-MM-DD.md` con progreso
4. **Al completar un feature** → agregar entry en `memory/YYYY-MM.md` con el template obligatorio
5. **Si `.docs/` no existe** → preguntar al desarrollador si debe crearla con la estructura estándar

## Estructura

```
.docs/
├── features/          ← Features a implementar (solo el developer escribe)
├── brainstorming/     ← Ideas en exploración (el agente colabora si se le pide)
├── rules/             ← Reglas del proyecto (consultar ANTES de decidir)
├── context/           ← Bitácora de iteración (el agente escribe aquí)
└── memory/            ← Historial permanente (el agente escribe aquí)
```

---

## Carpeta: `features/`

**Escribe:** el desarrollador. **Consume:** el agente. El agente NUNCA edita features/, pero puede proponer cambios como sugerencias.

Cada feature tiene su propia carpeta con un archivo `feature.md`. Estructura interna: ver sub-skill `requirements-format`.

Naming: kebab-case descriptivo (`auth-login`, `user-profile`). Evitar IDs crípticos (`US-001`) o nombres vagos (`update`, `changes`).

Archivos opcionales por feature:
- `wireframes/` — imágenes de referencia
- `api-spec.md` — contratos de API del feature
- `data-model.md` — schema o modelo de datos

---

## Carpeta: `brainstorming/`

**Escribe:** el desarrollador inicia, el agente colabora cuando se le pide. **Consume:** ambos.

Se crea cuando una idea necesita exploración antes de ser feature. Formato libre, con esta estructura sugerida:

```markdown
# [Nombre de la idea]

## Contexto
[Por qué estamos explorando esto]

## Ideas iniciales
- Idea A: ...
- Idea B: ...

## Preguntas abiertas
- ¿...?

## Q&A con agente
**Dev:** [pregunta o escenario]
**Agente:** [respuesta, análisis, propuesta]

## Conclusiones
[Lo que se decidió]

## → Feature derivado
[Link al feature en .docs/features/ cuando se gradúe]
```

Cuando un brainstorming tiene overview + goals + A/C claros → se gradúa a `features/`. El original se mantiene como referencia histórica.

---

## Carpeta: `rules/`

**Escribe:** el desarrollador. **Consume:** el agente. Consultar SIEMPRE antes de tomar decisiones técnicas o de negocio.

Un archivo por dominio de reglas con bullet points concisos. Contenido típico:
- Reglas de negocio de alto nivel
- Convenciones de API (naming, versionado, response format)
- Restricciones técnicas ("no usar librería X")
- Decisiones arquitectónicas y su justificación
- Glosario de dominio

Ejemplo — `business-rules.md`:

```markdown
# Reglas de Negocio

## Usuarios
- Un usuario puede tener máximo 3 workspaces activos
- El plan free tiene límite de 5 miembros por workspace
- Los emails son case-insensitive y se normalizan a lowercase

## Pagos
- Precios siempre en centavos (integer)
- Suscripciones se cobran al inicio del período
- No hay reembolsos automáticos — requieren aprobación manual
```

---

## Carpeta: `context/`

**Escribe:** el agente. **Consume:** el agente (al retomar), el desarrollador (para supervisar).

Bitácora de la iteración actual. Se crea al inicio de cada sesión de trabajo significativa. Naming: `iteration-YYYY-MM-DD.md` (uno por día o sesión).

**REGLA CRÍTICA:** actualizar context/ DURANTE el trabajo, no solo al final. Si el agente se desconecta a mitad de tarea, context/ debe reflejar exactamente dónde quedó.

Template:

```markdown
# Iteración — YYYY-MM-DD

## Objetivo
[Feature o tarea en implementación]

## Estado
🟢 Completado | 🟡 En progreso | 🔴 Bloqueado

## Trabajo realizado
- [x] Tarea completada
- [ ] Tarea pendiente

## Decisiones tomadas
- [Decisión y justificación]

## Bloqueantes / Preguntas pendientes
- [Pregunta para el desarrollador]

## Próximos pasos
- [Lo que sigue]
```

---

## Carpeta: `memory/`

**Escribe:** el agente. **Consume:** el agente (al retomar proyecto). Append-only: las entries pasadas NO se editan.

Historial PERMANENTE de lo implementado. Solo hechos consumados — nunca planes ni TODOs.

Naming: `YYYY-MM.md` (un archivo por mes).

Template obligatorio:

```markdown
# Memory — YYYY-MM

## YYYY-MM-DD — [nombre-del-feature]
- **Feature:** [Descripción breve]
- **Implementado:**
  - [Lista de lo construido]
- **Decisiones:**
  - [Por qué X y no Y]
- **Archivos principales:**
  - [Rutas de archivos clave]
```

Reglas de memory:
- Solo registrar lo efectivamente implementado
- Incluir decisiones técnicas relevantes
- Listar archivos principales creados/modificados
- Fecha exacta en cada entry

---

## Gotchas

- El agente tiende a crear un solo `context.md` global — debe ser un archivo por iteración/día: `iteration-YYYY-MM-DD.md`
- El agente puede querer editar `features/` directamente — eso es exclusivo del desarrollador; solo proponer cambios como sugerencias
- Memory NO es para TODOs ni próximos pasos — solo hechos consumados con fecha exacta
- No implementar features sin criterios de aceptación (A/C) definidos
- Rules vacías o genéricas ("ser consistente") no aportan valor — mejor no tener rules
- Si un brainstorming tiene overview + goals + A/C → debe graduarse a `features/`, no quedarse indefinidamente
- NUNCA borrar archivos de `.docs/` sin confirmación explícita del desarrollador
- Memory sin fechas hace imposible reconstruir la timeline del proyecto
