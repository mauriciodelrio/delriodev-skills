---
name: project-resumption
description: >
  Protocolo de onboarding y re-onboarding para cuando el agente llega a un
  proyecto sin contexto previo. Define qué leer, en qué orden, qué preguntar,
  y cómo reconstruir el estado mental del proyecto antes de hacer cualquier
  cosa. Aplica tanto para agentes nuevos como para retomar después de un
  período sin actividad.
---

# 🔄 Project Resumption — Retomar un Proyecto sin Contexto

## Principio

> **Nunca actuar sin entender primero.**
> Da igual cuánto tiempo pasó o cuán largo sea el proyecto —
> el agente SIEMPRE ejecuta este protocolo antes de implementar
> cualquier cosa en un proyecto que no tiene fresco en memoria.

---

## Cuándo Aplica

```
Este protocolo se ejecuta cuando:
  ✅ Es la primera vez que el agente trabaja en este proyecto
  ✅ El agente retoma después de un período sin actividad
  ✅ El contexto de conversación anterior se perdió
  ✅ El desarrollador dice "retomemos esto" o "dónde quedamos"
  ✅ El agente detecta que no tiene contexto suficiente

NO aplica cuando:
  ❌ El agente acaba de completar una tarea en la misma sesión
  ❌ El contexto está fresco y claro
```

---

## Protocolo de Resumption

```
FASE 1: RECONOCIMIENTO (leer, no actuar)
│
├── Paso 1: Verificar existencia de .docs/
│   ├── Existe → continuar con Paso 2
│   └── No existe → preguntar al dev:
│       "No encuentro carpeta .docs/ en el proyecto.
│        ¿Quieres que la cree con la estructura estándar?"
│
├── Paso 2: Leer .docs/memory/ (más reciente primero)
│   → Entender QUÉ se ha implementado históricamente
│   → Reconstruir timeline de features completados
│   → Notar decisiones técnicas tomadas anteriormente
│
├── Paso 3: Leer .docs/context/ (más reciente primero)
│   → Entender el ESTADO ACTUAL del proyecto
│   → ¿Hay trabajo en progreso?
│   → ¿Hay tareas pendientes de una iteración anterior?
│   → ¿Hay bloqueantes reportados?
│
├── Paso 4: Leer .docs/rules/
│   → Entender reglas de negocio y convenciones del proyecto
│   → Estas reglas aplican a TODO lo que implemente
│
└── Paso 5: Scan rápido del código
    → package.json (stack, dependencias clave)
    → Estructura de carpetas (entender la organización)
    → README.md del proyecto (si existe)
    → No leer todo el código — solo la estructura

FASE 2: SÍNTESIS
│
└── Presentar resumen al desarrollador:

    "He revisado la documentación del proyecto. Esto es lo que entiendo:

     📋 Proyecto: [nombre/descripción]
     🛠️ Stack: [tecnologías principales]
     
     📦 Features implementados:
       - [feature 1] (fecha)
       - [feature 2] (fecha)
       - ...
     
     📍 Estado actual:
       - [último trabajo realizado]
       - [tareas pendientes si las hay]
       - [bloqueantes si los hay]
     
     📏 Reglas del proyecto:
       - [reglas clave que noté]
     
     ¿Es correcto? ¿Hay algo que deba saber que no está documentado?"

FASE 3: RECIBIR TAREA
│
└── Con contexto confirmado, recibir la tarea del desarrollador
    y ejecutar el flujo normal (requirements-format → iteration-rules)
```

---

## Orden de Lectura (Importante)

```
El orden NO es arbitrario:

1. memory/   → Historia (qué pasó)
2. context/  → Presente (dónde estamos)
3. rules/    → Restricciones (qué no puedo hacer)
4. features/ → Futuro (qué hay que hacer)

¿Por qué este orden?
  - Memory da el panorama general de cómo llegamos aquí
  - Context da el estado actual y posibles tareas en progreso
  - Rules establece las restricciones antes de planificar
  - Features es lo que hay que hacer AHORA — se lee último
    para no saltar a implementar sin contexto
```

---

## Resumption con Trabajo en Progreso

```
Si .docs/context/ muestra trabajo incompleto:

  "Veo que hay una iteración en progreso del [fecha]:
   Feature: [nombre]
   
   Completado:
   - [x] Tarea 1
   - [x] Tarea 2
   
   Pendiente:
   - [ ] Tarea 3
   - [ ] Tarea 4
   
   ¿Retomamos desde la Tarea 3 o hay cambios de prioridad?"

Si el desarrollador quiere retomar:
  → El agente lee el feature original en .docs/features/
  → Revisa el código implementado hasta ahora
  → Continúa desde donde quedó

Si el desarrollador quiere cambiar de tarea:
  → Actualizar context/ marcando la iteración como pausada
  → Iniciar nueva tarea con flujo normal
```

---

## Resumption sin `.docs/`

```
Si el proyecto no tiene .docs/:

  1. Preguntar si quiere crear la estructura
  2. Si SÍ: crear .docs/ con sub-carpetas vacías
  3. Hacer onboarding leyendo el código:
     - package.json, tsconfig.json → stack
     - Estructura de carpetas → arquitectura
     - README.md → propósito
     - .env.example → servicios externos
     - Tests existentes → coverage y patrones
  
  4. Crear primera entry en memory/ con el estado observado:
     
     ## [fecha] — project-onboarding
     - **Feature:** Reconocimiento inicial del proyecto
     - **Observado:**
       - Stack: Next.js 15, TypeScript, Tailwind, Prisma
       - DB: PostgreSQL (Neon)
       - Auth: NextAuth.js
       - 47 archivos en src/
       - Tests: 12 test files (Vitest)
       - CI: GitHub Actions (lint + test + build)
     - **Estado:** Proyecto funcional, sin documentación .docs/
```

---

## Proyectos Largos (> 6 meses de history)

```
Si memory/ tiene muchos meses de historial:

  NO leer TODO línea por línea de 6+ meses.
  
  Estrategia:
  1. Leer el último mes completo en detalle
  2. Leer headers/títulos de meses anteriores (lista de features)
  3. Si algo del pasado es relevante para la tarea actual → leer ese entry
  4. Preguntar al dev si hay contexto histórico clave que debe conocer

  "El proyecto tiene historial desde [fecha]. He leído en detalle
   el último mes y los títulos del resto. ¿Hay decisiones o features
   antiguos que deba tener en cuenta para la tarea actual?"
```

---

## Múltiples Agentes / Sesiones

```
Si el proyecto es trabajado por múltiples agentes
(diferentes sesiones, diferentes herramientas):

  → .docs/ es el ÚNICO punto de verdad
  → Cada agente lee antes de actuar
  → Cada agente escribe context/ y memory/ al terminar
  → Nunca confiar en "el otro agente seguro hizo X"
    — verificar en memory/ y en el código

  Regla: si no está en .docs/ ni en el código, no pasó.
```

---

## Preguntas de Resumption (Checklist)

```
Si la documentación es insuficiente o ambigua, el agente puede
hacer estas preguntas de orientación:

Sobre el proyecto:
  □ ¿Cuál es el estado general? (activo, en pausa, mantenimiento)
  □ ¿Hay algo roto o urgente que resolver?
  □ ¿Hay deadline o prioridad especial?

Sobre el stack:
  □ ¿Hay servicios externos que necesito conocer? (APIs, DBs, providers)
  □ ¿Hay credenciales o accesos que necesite para probar?
  □ ¿El proyecto corre localmente? ¿Cómo se levanta?

Sobre la tarea:
  □ ¿Qué feature o tarea quieres que aborde?
  □ ¿Hay feature.md ya escrito o hablamos primero?
```

---

## Anti-patrones

```
❌ Empezar a codear sin leer .docs/ → contexto cero, errores seguro
❌ Leer solo features/ sin leer memory/ y context/ → no sabe el estado
❌ Asumir que recuerda de una sesión anterior → no confiar en memoria
❌ Leer TODO el código antes de preguntar → ineficiente, preguntar primero
❌ No presentar resumen de lo entendido → el dev no sabe si entendió bien
❌ Ignorar reglas de .docs/rules/ → va a contradecir convenciones
❌ Leer memory/ desde el inicio en proyectos largos → leer reciente primero
❌ No actualizar context/ al retomar → el siguiente resumption no sabrá
```
