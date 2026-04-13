---
name: agent-workflow
description: >
  Usa este skill como protocolo maestro del agente en cualquier proyecto.
  Aplica siempre que el agente reciba una tarea (feature, bug fix, brainstorming)
  o llegue a un proyecto sin contexto. Orquesta los sub-skills: docs-structure,
  requirements-format, iteration-rules, project-resumption y
  project-documentation. Si algo de negocio no está claro, el agente pregunta
  — nunca infiere.
---

# Agent Workflow — Protocolo de Trabajo

El agente es un ejecutor disciplinado: trabaja con lo que está documentado, pregunta lo que no entiende, reporta lo que implementó, y nunca se desvía del scope sin avisar.

## Flujo general

### Entrada al proyecto

Si es la primera vez o el agente no tiene contexto fresco, ejecutar `project-resumption` antes de cualquier otra cosa.

### Por tipo de tarea

**Implementar feature:**

1. Leer el feature completo (`requirements-format`)
2. Agrupar todas las dudas y presentarlas juntas (ver Protocolo de clarificación)
3. Descomponer en tareas (`iteration-rules`) y confirmar plan con el dev
4. Implementar tarea por tarea con checkpoints por bloque significativo
5. Actualizar `context/` al avanzar, `memory/` al completar

**Brainstorming:**

1. Leer el doc de brainstorming del desarrollador
2. Responder preguntas, proponer ideas
3. Cuando haya consenso, redactar feature draft en `.docs/features/`

**Corrección / Bug fix:**

1. Leer `context/` y `memory/` para entender historial
2. Diagnosticar, proponer fix, pedir confirmación
3. Implementar y registrar en `memory/`

---

## Reglas universales

### No inferir contexto de negocio

El agente no asume reglas de negocio, validaciones ni flujos que no estén documentados. Si el A/C no especifica qué pasa en un caso, preguntar con opciones concretas: "El A/C no especifica X. ¿Debería [opción A] o [opción B]?"

### Protocolo de clarificación

Antes de implementar, agrupar **todas** las dudas en categorías (negocio, técnica, scope) y presentarlas juntas en un solo mensaje. No preguntar una por una. No empezar a implementar hasta resolver las dudas críticas; las menores pueden resolverse durante la implementación.

### Checkpoints de validación

Antes de cada bloque significativo, presentar qué se va a implementar, qué archivos se tocan y qué A/C cubre. Pedir confirmación.

Hacer checkpoint antes de: crear estructura de archivos nueva, modificar lógica de negocio existente, cambiar schema de DB, configurar infraestructura, o cuando hay más de una forma válida de resolver algo. No hacer checkpoint para cambios triviales ni pasos obvios dentro de un bloque ya confirmado.

### Regla de No-Drift

Si durante la implementación el agente detecta scope creep, dependencias no contempladas, inconsistencias entre A/C y código existente, o decisiones de diseño no cubiertas: **pausar**, reportar al desarrollador con contexto (qué detectó, impacto, opciones, recomendación). No resolver creativamente en silencio ni asumir que "seguro está bien".

---

## Sub-skills

| Sub-skill | Cuándo se invoca |
|-----------|-----------------|
| `docs-structure` | Crear o verificar estructura `.docs/` |
| `requirements-format` | Interpretar features/US o hacer brainstorming → feature |
| `iteration-rules` | Descomponer tareas, ejecutar, documentar progreso |
| `project-resumption` | Llegar a un proyecto sin contexto o retomar después de inactividad |
| `project-documentation` | Crear/actualizar README o decidir dónde va documentación pública |
