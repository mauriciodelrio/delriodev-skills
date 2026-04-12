---
name: requirements-format
description: >
  Define cómo el desarrollador escribe features/User Stories y cómo el agente las
  interpreta. Cubre el formato de feature.md (overview, goals, A/C, tech notes),
  el flujo desde brainstorming hasta feature listo, y el protocolo de clarificación
  que el agente ejecuta antes de implementar. Si algo no está claro, el agente
  SIEMPRE pregunta — nunca infiere contexto de negocio.
---

# 📝 Requirements Format — Cómo se Escriben y Leen Features

## Principio

> **Un feature bien escrito es el 80% del trabajo.**
> El desarrollador escribe el QUÉ y el POR QUÉ.
> El agente ejecuta el CÓMO. Si el QUÉ no está claro, el agente pregunta.

---

## Formato de Feature (`feature.md`)

Cada feature vive en `.docs/features/{nombre-feature}/feature.md` y tiene
4 secciones obligatorias:

```markdown
# {Nombre del Feature}

## Overview
[Descripción general del feature en 2-5 oraciones.
Qué es, para quién es, y por qué existe.
Debe dar contexto suficiente para que alguien que no conoce el proyecto
entienda la intención.]

## Goals
[Lista de objetivos que este feature debe cumplir.
Son los resultados esperados a alto nivel, no detalles de implementación.]

- Goal 1: ...
- Goal 2: ...
- Goal 3: ...

## Acceptance Criteria
[Lista específica y verificable de condiciones que deben cumplirse
para considerar el feature COMPLETO. Cada A/C debe ser testeable.]

- [ ] AC-1: ...
- [ ] AC-2: ...
- [ ] AC-3: ...

## Tech Notes
[Notas técnicas opcionales del desarrollador. Pueden incluir:
preferencias de implementación, restricciones, referencias a código
existente, APIs externas a usar, o decisiones ya tomadas.
Si está vacío, el agente tiene libertad técnica total.]

- ...
```

---

## Sección por Sección

### Overview

```
Responde a:
  - ¿Qué es este feature?
  - ¿Para quién es? (usuario final, admin, sistema interno)
  - ¿Por qué existe? (problema que resuelve, oportunidad que captura)
  - ¿Cómo encaja en el producto general?

Bueno:
  "Sistema de autenticación que permite a los usuarios registrarse
   e iniciar sesión con email y password. Es el foundation para todo
   el sistema de permisos. Los usuarios actuales solo pueden ver la
   landing page — esto les permite acceder al dashboard."

Malo:
  "Login."
  "Hacer el auth."
  "Como el de la otra app pero diferente."
```

### Goals

```
Responde a:
  - ¿Qué resultados debe tener este feature?
  - ¿Qué cambia para el usuario cuando esté implementado?

Bueno:
  - Los usuarios pueden crear una cuenta con email y password
  - Los usuarios pueden iniciar sesión y mantener la sesión activa
  - Los usuarios no autenticados son redirigidos al login
  - Las contraseñas se almacenan de forma segura (hash + salt)

Malo:
  - Hacer el login
  - Que funcione
  - Auth completo
```

### Acceptance Criteria (A/C)

```
REGLA DE ORO: Si no se puede testear, no es un criterio de aceptación.

Formato: checkbox para que el agente pueda trackear progreso.
Cada A/C es una condición binaria: se cumple o no se cumple.

Bueno:
  - [ ] El formulario de registro pide: nombre, email, password, confirmar password
  - [ ] Email se valida con formato válido y unicidad en DB
  - [ ] Password requiere mínimo 8 caracteres, 1 mayúscula, 1 número
  - [ ] Al registrarse, el usuario recibe email de verificación
  - [ ] Al hacer login correcto, redirige a /dashboard
  - [ ] Al hacer login incorrecto, muestra error genérico (no revelar si email existe)
  - [ ] Después de 5 intentos fallidos, bloquear cuenta por 15 minutos
  - [ ] Las rutas protegidas (/dashboard, /settings) redirigen a /login si no hay sesión
  - [ ] El token de sesión expira en 15 minutos con refresh automático

Malo:
  - [ ] El login funciona
  - [ ] Se ve bien
  - [ ] Es seguro
  - [ ] Los errores se manejan

Patrón recomendado para cada A/C:
  "Dado [contexto], cuando [acción], entonces [resultado esperado]"

  Ejemplo:
  - [ ] Dado un usuario con 5 intentos fallidos, cuando intenta login
        de nuevo, entonces ve mensaje "Cuenta bloqueada, intente en 15 min"
```

### Tech Notes

```
Sección OPCIONAL del desarrollador. El agente la respeta como directiva.

Puede contener:
  - Preferencia de librería: "Usar Resend para envío de emails"
  - Restricción: "No usar ORM, queries SQL directas con Drizzle"
  - Referencia: "El componente base está en src/components/ui/Form.tsx"
  - API externa: "Documentación de la API de pagos: [link]"
  - Schema: "La tabla users ya tiene los campos name y email"
  - Decisión tomada: "JWT en httpOnly cookie, no localStorage"

Si Tech Notes está vacío:
  → El agente tiene libertad de elegir la implementación técnica
  → Pero SIEMPRE muestra su plan en el checkpoint de validación
  → Y justifica decisiones técnicas relevantes
```

---

## Flujo: Brainstorming → Feature

```
ETAPA 1: BRAINSTORMING (.docs/brainstorming/)
  El desarrollador tiene una idea sin forma definida.
  Crea un archivo con estructura libre.
  Interactúa con el agente en sección Q&A.
  El agente ayuda a:
    - Identificar scope
    - Evaluar viabilidad técnica
    - Proponer alternativas
    - Hacer preguntas que el dev no consideró

ETAPA 2: MADURACIÓN
  Cuando el brainstorming tiene respuestas claras a:
    ✅ ¿Qué es? (overview)
    ✅ ¿Para qué? (goals)
    ✅ ¿Cómo se verifica? (A/C)
  → Está listo para graduarse a feature.

ETAPA 3: GRADUACIÓN
  El desarrollador (no el agente) crea la carpeta en .docs/features/
  y escribe el feature.md formal.
  El agente puede sugerir: "Este brainstorming parece listo para
  convertirse en feature. ¿Quieres que te ayude a redactar el draft?"

ETAPA 4: IMPLEMENTACIÓN
  Con el feature.md completo, el agente ejecuta el protocolo
  de iteration-rules.
```

---

## Protocolo de Clarificación del Agente

Cuando el agente recibe un feature para implementar:

### Paso 1: Lectura Completa

```
Leer el feature.md completo. NO empezar a implementar mientras lee.
Leer también:
  - .docs/rules/ → reglas de negocio que apliquen
  - .docs/context/ → último estado del proyecto
  - Código relevante existente → entender qué ya hay
```

### Paso 2: Clasificar Dudas

```
Categorizar todo lo que no está claro:

🏢 NEGOCIO (bloqueantes — no implementar sin respuesta):
  Dudas sobre reglas de negocio, flujos de usuario, permisos,
  comportamiento esperado en edge cases.

🔧 TÉCNICA (resolver o proponer):
  Dudas sobre qué tecnología usar, cómo integrar con lo existente,
  patrones de implementación. El agente puede proponer y pedir
  confirmación en el checkpoint.

📐 SCOPE (clarificar):
  ¿Esto incluye X? ¿Y el caso de Y? ¿El error Z se maneja aquí
  o en otro feature?
```

### Paso 3: Presentar Dudas Agrupadas

```
📋 DUDAS — Feature: {nombre}

🏢 Negocio:
  1. El A/C dice "bloquear después de 5 intentos" — ¿aplica por IP,
     por email, o ambos?
  2. ¿El email de verificación es obligatorio para usar la app o
     puede verificar después?

🔧 Técnica:
  1. No hay Tech Notes sobre envío de email. ¿Hay preferencia
     de servicio (Resend, SES, SendGrid)?

📐 Scope:
  1. ¿El "forgot password" es parte de este feature o será otro?
  2. ¿Login con Google/GitHub se implementa aquí o después?

→ Las dudas de Negocio son BLOQUEANTES.
→ Las de Técnica y Scope pueden resolverse en paralelo.
```

### Paso 4: Esperar Respuestas (negocio) → Planificar (técnica)

```
Con las respuestas de negocio, el agente:
  1. Actualiza su comprensión del feature
  2. Descompone en tareas (ver iteration-rules)
  3. Presenta checkpoint de validación con el plan
  4. Espera confirmación antes de implementar
```

---

## Features Derivados

```
A veces durante la implementación aparecen necesidades que no
están en el feature original.

El agente NO las implementa como "bonus":
  ❌ "Ya que estaba, también hice el forgot password"

El agente las documenta como feature derivado:
  ✅ "Durante auth-login detecté que se necesita forgot-password.
      ¿Lo agrego como feature separado en .docs/features/?"

Regla: cada feature se implementa con su scope tal cual está
definido. Si aparece algo nuevo → feature nuevo.
```

---

## Anti-patrones

```
❌ Feature sin Overview → el agente no sabe el contexto
❌ Feature sin A/C → el agente no sabe cuándo terminó
❌ A/C vagos ("funciona bien", "se ve bonito") → no son testeables
❌ El agente asumiendo respuestas a preguntas de negocio
❌ El agente implementando sin leer rules/ primero
❌ Preguntas de una en una → agrupar y presentar juntas
❌ El agente editando feature.md del desarrollador
❌ Brainstorming que salta directo a código sin graduar a feature
❌ Feature con scope infinito (sin bordes claros)
❌ Tech Notes que contradicen rules/ → alertar al desarrollador
```
