---
name: iteration-rules
description: >
  Define cómo el agente descompone features en tareas, las ejecuta secuencialmente,
  documenta progreso en context/, actualiza memory/ al completar, y aplica
  checkpoints de validación entre bloques significativos. Incluye Definition of Done,
  regla de no-drift, y protocolo de granularidad de tareas.
---

# ⚙️ Iteration Rules — Ejecución y Documentación de Tareas

## Principio

> **Implementar es un proceso controlado, no un sprint descontrolado.**
> Cada feature se descompone, se confirma, se ejecuta por bloques,
> se documenta al avanzar, y se registra al completar.

---

## Flujo de Iteración

```
FEATURE RECIBIDO (ya pasó por requirements-format)
│
├── 1. DESCOMPOSICIÓN
│   → Dividir feature en tareas atómicas
│   → Ordenar por dependencia
│   → Estimar complejidad relativa
│
├── 2. CHECKPOINT — PLAN
│   → Presentar lista de tareas al desarrollador
│   → Pedir confirmación del plan
│
├── 3. EJECUCIÓN (por cada tarea)
│   ├── Marcar tarea como en progreso
│   ├── Implementar
│   ├── ¿Bloque significativo? → Checkpoint de validación
│   ├── ¿Desvío detectado? → Pausar, reportar (no-drift)
│   ├── Actualizar .docs/context/ al avanzar
│   └── Marcar tarea como completada
│
├── 4. VERIFICACIÓN
│   → ¿Todos los A/C se cumplen?
│   → ¿Tests pasan?
│   → ¿No hay regresiones?
│
└── 5. CIERRE
    → Actualizar .docs/memory/ con lo implementado
    → Marcar feature como completado en context/
```

---

## 1. Descomposición de Tareas

### Granularidad

```
Cada tarea debe ser:
  ✅ Completable en un bloque de trabajo continuo
  ✅ Verificable (tiene output claro)
  ✅ Independiente o con dependencia explícita
  ✅ Describible en una oración

Ejemplo — Feature: auth-login

  Tareas:
  1. Crear schema de DB para tabla users (migraciones)
  2. Implementar endpoint POST /api/auth/register
  3. Implementar endpoint POST /api/auth/login
  4. Implementar middleware de autenticación (JWT verify)
  5. Crear componente RegisterForm con validación
  6. Crear componente LoginForm con validación
  7. Implementar protección de rutas (/dashboard → redirect si no auth)
  8. Implementar bloqueo por intentos fallidos
  9. Tests unitarios (endpoints + middleware)
  10. Tests de integración (flujo completo register → login → dashboard)
```

### Orden por Dependencia

```
Las tareas se ordenan bottom-up:
  1. Data layer (schema, migraciones)
  2. Backend (endpoints, lógica de negocio)
  3. Middleware / infraestructura
  4. Frontend (componentes, páginas)
  5. Integración (conectar frontend con backend)
  6. Tests
  7. Cleanup y documentación

Nunca empezar por la UI si el backend no existe.
Nunca implementar tests antes del código que testean.
```

---

## 2. Checkpoint — Plan

Antes de tocar código, el agente presenta:

```markdown
## Plan de Implementación — auth-login

**Feature:** Login con email y password
**A/C a cubrir:** 9 criterios

### Tareas (10)

| # | Tarea | Depende de | Complejidad |
|---|-------|------------|-------------|
| 1 | Schema users + migración | — | baja |
| 2 | POST /api/auth/register | 1 | media |
| 3 | POST /api/auth/login | 1 | media |
| 4 | Middleware JWT | 3 | media |
| 5 | RegisterForm + validación | — | media |
| 6 | LoginForm + validación | — | media |
| 7 | Protección de rutas | 4 | baja |
| 8 | Bloqueo por intentos fallidos | 3 | media |
| 9 | Tests unitarios | 1-8 | media |
| 10 | Tests de integración | 1-8 | alta |

### Decisiones técnicas propuestas
- bcrypt para hashing de passwords (estándar, bien soportado)
- JWT en httpOnly cookie (más seguro que localStorage)
- Zod para validación de formularios (consistente con el proyecto)

**¿Confirmas este plan o hay ajustes?**
```

El agente **NO empieza a implementar** sin confirmación del plan.

---

## 3. Ejecución

### Por Cada Tarea

```
Al iniciar tarea:
  → Anunciar: "Implementando tarea N: [descripción]"

Durante la tarea:
  → Implementar el código
  → Si hay decisión técnica relevante → mencionarla
  → Si hay duda → preguntar ANTES de asumir

Al completar tarea:
  → Confirmar: "✅ Tarea N completada: [qué se hizo]"
  → Si hubo cambios vs el plan → explicar por qué
```

### Checkpoints de Bloque

```
Después de completar un grupo lógico de tareas, hacer checkpoint:

"He completado el bloque de backend (tareas 1-4):
  - Schema de users creado con campos: id, name, email, password_hash, ...
  - Register endpoint validando email único, hash con bcrypt
  - Login endpoint con verificación, JWT con 15min expiry
  - Middleware verificando token en rutas protegidas
  
  A/C cubiertos: AC-1, AC-2, AC-3, AC-5, AC-9
  
  Siguiente bloque: Frontend (tareas 5-7).
  ¿Algún ajuste antes de continuar?"
```

### Actualización de Context

```
Al completar cada bloque, actualizar .docs/context/iteration-YYYY-MM-DD.md:

  ## Trabajo realizado
  - [x] Tarea 1: Schema users
  - [x] Tarea 2: Register endpoint
  - [x] Tarea 3: Login endpoint
  - [x] Tarea 4: Middleware JWT
  - [ ] Tarea 5: RegisterForm     ← siguiente
  - [ ] Tarea 6: LoginForm
  ...

  ## Decisiones tomadas
  - bcrypt para hashing (propuesto en plan, confirmado)
  - JWT en httpOnly cookie (propuesto en plan, confirmado)

Frecuencia: al menos cada 2-3 tareas completadas.
NO esperar a finalizar todo para actualizar context.
```

---

## 4. Verificación

### Checklist Pre-Cierre

```
Antes de declarar un feature como completado:

☐ Cada A/C verificado individualmente
☐ Tests pasan (unit + integration si aplica)
☐ No hay regresiones en funcionalidad existente
☐ Lint y type-check pasan sin errores
☐ No hay TODOs ni código comentado dejado atrás
☐ Las rutas/endpoints nuevos están protegidos si corresponde
☐ Los errores se manejan (no hay catch vacíos ni errores silenciosos)
```

### Definition of Done

```
Un feature está DONE cuando:
  1. ✅ Todos los A/C se cumplen
  2. ✅ Tests pasan
  3. ✅ El código sigue las reglas de .docs/rules/
  4. ✅ No hay desvíos no reportados del plan
  5. ✅ Context actualizado con estado final
  6. ✅ Memory actualizado con lo implementado
```

---

## 5. Cierre

### Actualizar Memory

```
Al completar el feature, agregar entry a .docs/memory/YYYY-MM.md:

  ## 2026-04-11 — auth-login
  - **Feature:** Login con email y password
  - **Implementado:**
    - Schema de users con migración
    - POST /api/auth/register con validación
    - POST /api/auth/login con JWT
    - Middleware de autenticación
    - LoginForm y RegisterForm con Zod
    - Protección de rutas
    - Bloqueo por 5 intentos fallidos (por email, 15 min)
    - Tests unitarios y de integración
  - **Decisiones:**
    - bcrypt sobre argon2 (disponibilidad en edge)
    - JWT httpOnly cookie (seguridad sobre localStorage)
    - Bloqueo por email (no por IP, para evitar falsos positivos en VPN)
  - **Archivos principales:**
    - src/db/schema/users.ts
    - src/app/api/auth/register/route.ts
    - src/app/api/auth/login/route.ts
    - src/middleware.ts
    - src/components/auth/LoginForm.tsx
    - src/components/auth/RegisterForm.tsx

Formato: ver template en docs-structure
```

### Actualizar Context (Final)

```
Marcar la iteración como completada:

  ## Estado
  🟢 Completado

  ## Trabajo realizado
  - [x] Tarea 1: Schema users
  - [x] Tarea 2: Register endpoint
  ...todas marcadas...

  ## Feature completado: ✅
  → Registrado en memory/2026-04.md
```

---

## Regla de No-Drift (Detallada)

```
DURANTE la implementación, si el agente detecta:

TIPO 1 — SCOPE CREEP:
  "Para completar el A/C de bloqueo por intentos, necesitaría
   implementar un sistema de rate limiting general."
  → PAUSAR. Esto excede el feature.
  → Proponer: implementar solo lo mínimo para el A/C,
    o crear feature derivado para rate limiting completo.

TIPO 2 — DEPENDENCIA FALTANTE:
  "El login necesita enviar email de verificación pero no hay
   servicio de email configurado."
  → PAUSAR. Reportar la dependencia.
  → Proponer: configurar servicio de email como tarea adicional,
    o marcar A/C como bloqueado y continuar con el resto.

TIPO 3 — INCONSISTENCIA:
  "El A/C dice redirigir a /dashboard pero el código existente
   usa /app como ruta principal."
  → PAUSAR. Preguntar cuál es correcto.
  → NO asumir que el código existente es el correcto.

TIPO 4 — DECISIÓN DE DISEÑO:
  "Puedo implementar el bloqueo con Redis (más preciso)
   o con DB (más simple). Esto no está en Tech Notes."
  → Presentar opciones con trade-offs.
  → Dejar que el desarrollador decida.
  → Si el desarrollador dice "decide tú", documentar la decisión.

FORMATO DE REPORTE:
  "⚠️ DRIFT DETECTADO — Tipo: [scope/dependencia/inconsistencia/diseño]
   
   Contexto: [qué estaba haciendo]
   Problema: [qué encontré]
   Impacto: [qué afecta si continúo o no]
   
   Opciones:
   A) [opción A] — [trade-off]
   B) [opción B] — [trade-off]
   
   Recomendación: [cuál y por qué, si tiene opinión]"
```

---

## Manejo de Features Grandes

```
Si un feature tiene > 15 tareas o > 15 A/C:

  → Proponer dividir en sub-features:
    "Este feature es grande. Propongo dividirlo en:
     1. auth-login-basic: registro + login + sesión
     2. auth-login-security: bloqueo + 2FA + rate limit
     3. auth-login-social: Google + GitHub OAuth
     
     Cada uno con su propio feature.md en .docs/features/.
     ¿Prefieres implementarlo como uno o dividirlo?"

  → Si el desarrollador quiere mantenerlo como uno:
    Agrupar tareas en fases con checkpoints más frecuentes.
```

---

## Anti-patrones

```
❌ Implementar todo de un tirón sin checkpoints → el dev pierde visibilidad
❌ Tareas demasiado grandes ("implementar el backend") → no son atómicas
❌ Tareas demasiado pequeñas ("crear el archivo X") → overhead de tracking
❌ No actualizar context durante el trabajo → si se desconecta, se pierde estado
❌ Memory con TODOs → memory es solo hechos consumados
❌ Declarar done sin verificar cada A/C individualmente
❌ Resolver drift en silencio → el dev debe saber que hubo desvío
❌ Código comentado como "placeholder" → implementar completo o no implementar
❌ Tests que no testean realmente (tests vacíos, asserts triviales)
❌ Saltarse el plan y empezar a codear → disciplina antes que velocidad
```
