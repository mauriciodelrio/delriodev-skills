---
name: requirements-format
description: >
  Usa este skill cuando el agente reciba un feature para implementar, necesite
  interpretar un feature.md, o participe en un brainstorming que pueda graduarse
  a feature. También aplica cuando el agente detecta que un feature está incompleto
  (sin overview, sin A/C, A/C vagos) y necesita pedir clarificación antes de
  implementar. Si algo de negocio no está claro, el agente pregunta — nunca infiere.
---

# Requirements Format — Cómo se Escriben y Leen Features

El desarrollador escribe el QUÉ y el POR QUÉ. El agente ejecuta el CÓMO. Si el QUÉ no está claro, el agente pregunta.

## Formato de feature (`feature.md`)

Cada feature vive en `.docs/features/{nombre-feature}/feature.md` con 4 secciones obligatorias:

```markdown
# {Nombre del Feature}

## Overview
[Descripción general en 2-5 oraciones: qué es, para quién, por qué existe.
Contexto suficiente para alguien que no conoce el proyecto.]

## Goals
[Resultados esperados a alto nivel, no detalles de implementación.]

- Goal 1: ...
- Goal 2: ...

## Acceptance Criteria
[Condiciones específicas y verificables. Cada A/C debe ser testeable.
Patrón recomendado: "Dado [contexto], cuando [acción], entonces [resultado]".]

- [ ] AC-1: ...
- [ ] AC-2: ...

## Tech Notes
[Opcional. Preferencias de implementación, restricciones, referencias a código
existente, APIs externas, decisiones ya tomadas. Si está vacío, el agente
tiene libertad técnica pero muestra su plan en el checkpoint.]

- ...
```

## Cómo interpreta el agente cada sección

**Overview** — Si solo dice "Login" o "Hacer el auth" sin contexto, el agente pide que se expanda antes de planificar. Un buen overview explica qué es, para quién, por qué existe y cómo encaja en el producto.

**Goals** — Son resultados de negocio, no tareas técnicas. Si un goal dice "hacer el login" en vez de "los usuarios pueden iniciar sesión y mantener sesión activa", pedir reformulación.

**Acceptance Criteria** — Regla de oro: si no se puede testear, no es un A/C. Si encuentra A/C vagos como "funciona bien" o "se ve bonito", el agente pide que se hagan específicos y verificables antes de implementar.

**Tech Notes** — El agente las respeta como directivas. Si están vacías, tiene libertad técnica pero justifica decisiones en el checkpoint. Si contradicen `.docs/rules/`, alertar al desarrollador.

---

## Flujo: Brainstorming → Feature

1. **Brainstorming** — El dev crea un archivo en `.docs/brainstorming/` con estructura libre. El agente ayuda a identificar scope, evaluar viabilidad, proponer alternativas y hacer preguntas que el dev no consideró.
2. **Maduración** — Cuando el brainstorming tiene respuestas claras a: qué es (overview), para qué (goals), cómo se verifica (A/C), está listo para graduarse.
3. **Graduación** — El desarrollador (no el agente) crea la carpeta en `.docs/features/` y escribe el `feature.md`. El agente puede sugerir: "Este brainstorming parece listo para convertirse en feature. ¿Quieres que te ayude a redactar el draft?"
4. **Implementación** — Con el `feature.md` completo, ejecutar `iteration-rules`.

---

## Protocolo de clarificación

Cuando el agente recibe un feature para implementar:

1. **Lectura completa** — Leer `feature.md`, `.docs/rules/`, `.docs/context/` y código relevante existente. No empezar a implementar mientras lee.
2. **Clasificar dudas** — Negocio (bloqueantes: reglas de negocio, flujos, permisos, edge cases), Técnica (resolver o proponer en el checkpoint), Scope (qué está incluido y qué no).
3. **Presentar dudas agrupadas** — Todas las dudas juntas en un solo mensaje, categorizadas. Las de negocio son bloqueantes; las técnicas y de scope pueden resolverse en paralelo.
4. **Esperar respuestas de negocio → planificar** — Con las respuestas, descomponer en tareas (`iteration-rules`), presentar checkpoint de validación, esperar confirmación.

---

## Features derivados

Si durante la implementación aparecen necesidades fuera del scope del feature, el agente no las implementa como "bonus". Las documenta y pregunta: "Durante [feature] detecté que se necesita [X]. ¿Lo agrego como feature separado en `.docs/features/`?" Cada feature se implementa con su scope tal cual está definido.

---

## Gotchas

- Feature sin Overview deja al agente sin contexto — pedir que se complete antes de planificar
- Feature sin A/C deja al agente sin saber cuándo terminó — exigir A/C verificables
- El agente tiende a asumir respuestas a preguntas de negocio — siempre preguntar con opciones concretas
- El agente no debe implementar sin leer `rules/` primero
- Preguntar dudas de una en una alarga el ciclo — agrupar y presentar juntas
- El agente no edita el `feature.md` del desarrollador
- Brainstorming que salta directo a código sin graduar a feature genera scope indefinido
- Tech Notes que contradicen `rules/` → alertar al desarrollador, no resolver en silencio
