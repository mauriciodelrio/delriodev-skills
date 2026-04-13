---
name: project-resumption
description: >
  Usa este skill cuando el agente llega a un proyecto sin contexto previo,
  retoma trabajo después de inactividad, o el desarrollador dice "retomemos"
  / "dónde quedamos". Ejecuta el protocolo completo antes de implementar
  cualquier cosa. No aplica si el agente acaba de completar una tarea en
  la misma sesión y el contexto está fresco.
---

# Project Resumption — Retomar un Proyecto sin Contexto

Nunca actuar sin entender primero. El agente ejecuta este protocolo antes de implementar cualquier cosa en un proyecto que no tiene fresco en memoria.

## Protocolo de resumption

### Fase 1: Reconocimiento (leer, no actuar)

1. **Verificar `.docs/`** — Si no existe, preguntar al dev: "No encuentro `.docs/` en el proyecto. ¿Quieres que la cree con la estructura estándar?"
2. **Leer `.docs/memory/`** (más reciente primero) — Reconstruir timeline de features completados y decisiones técnicas.
3. **Leer `.docs/context/`** (más reciente primero) — Entender estado actual: trabajo en progreso, tareas pendientes, bloqueantes.
4. **Leer `.docs/rules/`** — Entender reglas de negocio y convenciones. Aplican a todo lo que se implemente.
5. **Scan rápido del código** — `package.json` (stack), estructura de carpetas, `README.md`. No leer todo el código, solo la estructura.

El orden importa: memory (historia) → context (presente) → rules (restricciones) → features (futuro). Features se lee último para no saltar a implementar sin contexto.

### Fase 2: Síntesis

Presentar resumen al desarrollador con: nombre del proyecto, stack, features implementados, estado actual, tareas pendientes/bloqueantes, y reglas clave detectadas. Cerrar con: "¿Es correcto? ¿Hay algo que deba saber que no está documentado?"

### Fase 3: Recibir tarea

Con contexto confirmado, recibir la tarea y ejecutar el flujo normal (requirements-format → iteration-rules).

---

## Trabajo en progreso

Si `.docs/context/` muestra trabajo incompleto, presentar al dev qué iteración estaba en progreso, qué tareas se completaron y cuáles están pendientes. Preguntar: "¿Retomamos desde [tarea pendiente] o hay cambios de prioridad?"

- **Si retoma**: leer el feature original en `.docs/features/`, revisar código implementado, continuar desde donde quedó.
- **Si cambia de tarea**: actualizar `context/` marcando la iteración como pausada e iniciar nueva tarea con flujo normal.

---

## Sin `.docs/`

Si el proyecto no tiene `.docs/`:

1. Preguntar si quiere crear la estructura
2. Si acepta, crear `.docs/` con sub-carpetas vacías
3. Hacer onboarding leyendo: `package.json`, `tsconfig.json`, estructura de carpetas, `README.md`, `.env.example`, tests existentes
4. Crear primera entrada en `memory/` con el estado observado (stack, dependencias, cantidad de archivos, tests, CI)

---

## Proyectos largos (> 6 meses)

No leer todo el historial línea por línea. Estrategia:

1. Leer el último mes completo en detalle
2. Leer títulos de meses anteriores
3. Si algo del pasado es relevante para la tarea actual, leer esa entrada
4. Preguntar al dev si hay contexto histórico clave

---

## Preguntas de orientación

Si la documentación es insuficiente, el agente puede preguntar:

- **Proyecto**: estado general, algo roto/urgente, deadlines
- **Stack**: servicios externos, credenciales necesarias, cómo levantar localmente
- **Tarea**: qué feature abordar, si hay feature.md o hay que hablar primero

---

## Gotchas

- El agente tiende a empezar a codear sin leer `.docs/` — ejecutar siempre el protocolo completo
- Leer solo `features/` sin `memory/` y `context/` deja al agente sin saber el estado real
- No confiar en memoria de sesiones anteriores — si no está en `.docs/` o en el código, no pasó
- Leer TODO el código antes de preguntar es ineficiente — scan rápido y preguntar
- No presentar resumen de lo entendido deja al dev sin saber si el agente entendió bien
- Ignorar `.docs/rules/` lleva a contradecir convenciones del proyecto
- En proyectos largos, leer `memory/` desde el inicio es innecesario — reciente primero
- No actualizar `context/` al retomar rompe el siguiente resumption
- En entornos multi-agente, `.docs/` es la única fuente de verdad — nunca asumir que "el otro agente seguro hizo X"
