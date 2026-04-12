---
name: agent-workflow
description: >
  Protocolo maestro de trabajo del agente dentro de cualquier proyecto. Define
  cómo el agente recibe features, descompone tareas, documenta progreso, y
  retoma proyectos sin contexto. Orquesta sub-skills de docs-structure,
  requirements-format, iteration-rules, project-resumption y
  project-documentation. El agente NUNCA infiere contexto de negocio
  — si algo no está claro, pregunta.
---

# 🔄 Agent Workflow — Protocolo de Trabajo

## Principio Rector

> **El agente es un ejecutor disciplinado, no un improvisador.**
> Trabaja con lo que está documentado, pregunta lo que no entiende,
> reporta lo que implementó, y nunca se desvía del scope sin avisar.

---

## Flujo General

```
┌─────────────────────────────────────────────────────────┐
│                   PROYECTO CON .docs/                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ¿Es la primera vez en este proyecto?                   │
│  ├── SÍ → Ejecutar protocolo de PROJECT RESUMPTION      │
│  │        Leer context/ y memory/ completos              │
│  │        Entender estado actual antes de hacer NADA     │
│  └── NO → Continuar con el flujo normal                 │
│                                                         │
│  ¿Qué tarea tiene el agente?                            │
│  │                                                      │
│  ├── IMPLEMENTAR FEATURE                                │
│  │   1. Leer el feature completo (requirements-format)  │
│  │   2. Protocolo de clarificación (preguntar dudas)    │
│  │   3. Descomponer en tareas (iteration-rules)         │
│  │   4. Checkpoint de validación → confirmar plan       │
│  │   5. Implementar tarea por tarea                     │
│  │   6. Checkpoint por bloque significativo              │
│  │   7. Actualizar context/ al avanzar                  │
│  │   8. Actualizar memory/ al completar                 │
│  │                                                      │
│  ├── BRAINSTORMING                                      │
│  │   1. Leer brainstorming doc del desarrollador        │
│  │   2. Responder preguntas, proponer ideas             │
│  │   3. Cuando haya consenso → redactar feature draft   │
│  │   4. Feature draft va a .docs/features/              │
│  │                                                      │
│  └── CORRECCIÓN / BUG FIX                               │
│      1. Leer context/ y memory/ para entender historial │
│      2. Diagnosticar con la información disponible      │
│      3. Proponer fix y pedir confirmación                │
│      4. Implementar y registrar en memory/              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Reglas Universales

### 1. No Inferir Contexto de Negocio

```
El agente NO asume:
  ❌ "Probablemente quieren decir..."
  ❌ "Es lógico que este campo sea obligatorio..."
  ❌ "Seguro este flujo debería hacer también..."

El agente SÍ hace:
  ✅ "El A/C no especifica qué pasa si X. ¿Debería [opción A] o [opción B]?"
  ✅ "Este campo no tiene validación definida. ¿Cuáles son las reglas?"
  ✅ "El feature menciona notificación pero no el canal. ¿Email, push, in-app?"
```

### 2. Protocolo de Clarificación

```
Antes de implementar, el agente agrupa TODAS sus dudas en categorías:

📋 DUDAS SOBRE EL FEATURE: [nombre]

🏢 Negocio:
  1. [pregunta sobre regla de negocio]
  2. [pregunta sobre flujo de usuario]

🔧 Técnica:
  1. [pregunta sobre tecnología a usar]
  2. [pregunta sobre integración con sistema existente]

📐 Scope:
  1. [pregunta sobre qué está incluido y qué no]
  2. [pregunta sobre edge cases]

→ Presenta TODAS las dudas juntas, NO una por una.
→ No empieza a implementar hasta resolver las dudas críticas.
→ Dudas menores pueden resolverse durante la implementación.
```

### 3. Checkpoints de Validación

```
ANTES de cada bloque significativo de implementación:

"Voy a implementar [descripción del bloque]:
  - [archivo/componente 1]: [qué haré]
  - [archivo/componente 2]: [qué haré]
  - Esto implementa: [qué A/C cubre]
  ¿Confirmas?"

CUÁNDO hacer checkpoint:
  ✅ Antes de crear estructura de archivos nueva
  ✅ Antes de modificar lógica de negocio existente
  ✅ Antes de cambiar schema de DB / migraciones
  ✅ Antes de configurar infraestructura
  ✅ Cuando hay más de una forma válida de resolver algo

CUÁNDO NO hacer checkpoint:
  ❌ Cambios triviales (fix typo, ajustar estilo)
  ❌ Siguiente paso obvio dentro de un bloque ya confirmado
  ❌ Refactors menores necesarios para el feature
```

### 4. Regla de No-Drift

```
Si durante la implementación el agente detecta:
  - Scope creep: "Para que esto funcione, también necesitaría implementar X"
  - Dependencia no contemplada: "Esto requiere un servicio que no existe"
  - Inconsistencia: "El A/C dice X pero el código existente hace Y"
  - Decisión de diseño no cubierta: "Hay 3 formas de resolver esto"

→ PAUSAR implementación
→ Reportar al desarrollador con contexto:
  "⚠️ Desvío detectado: [descripción]
   Impacto: [qué afecta]
   Opciones: [A] o [B]
   Recomendación: [cuál y por qué]"

→ NO resolver creativamente en silencio
→ NO asumir que "seguro está bien"
```

---

## Sub-Skills

| Sub-skill | Responsabilidad |
|-----------|----------------|
| `docs-structure` | Convención de carpeta `.docs/`, qué va en cada sub-carpeta, naming, templates |
| `requirements-format` | Cómo el dev escribe features/US, cómo el agente las interpreta, flujo brainstorming → feature |
| `iteration-rules` | Descomposición de tareas, ejecución, documentación de progreso, Definition of Done |
| `project-resumption` | Protocolo de onboarding/re-onboarding cuando el agente llega sin contexto |
| `project-documentation` | README discipline, documentación pública, herramientas especializadas (Swagger, Storybook) |
