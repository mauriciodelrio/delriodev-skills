---
name: iteration-rules
description: >
  Usa este skill cuando el agente vaya a implementar un feature o bloque de trabajo.
  Define el ciclo completo: descomponer en tareas, presentar plan, ejecutar con
  checkpoints, manejar desvíos (no-drift), verificar A/C, y cerrar con context/ y
  memory/. Aplica siempre que haya código que implementar, incluso si el usuario no
  menciona "iteración" o "plan" explícitamente.
---

# Iteration Rules — Ejecución de Tareas

## Flujo de Iteración

1. **Descomposición** → dividir feature en tareas atómicas, ordenar por dependencia
2. **Plan** → presentar lista de tareas al desarrollador y pedir confirmación — NO implementar sin confirmación
3. **Ejecución** → por cada tarea: implementar, hacer tests, checkpoint cada bloque significativo, actualizar `context/`
4. **Verificación** → verificar cada A/C individualmente, tests pasan, sin regresiones
5. **Cierre** → actualizar `memory/` con lo implementado, marcar feature como completado en `context/`

Si se detecta un desvío durante la ejecución → aplicar regla de no-drift (ver sección abajo).

---

## 1. Descomposición de Tareas

Cada tarea debe ser: completable en un bloque continuo, verificable (output claro), independiente o con dependencia explícita, y describible en una oración.

Ordenar bottom-up: data layer → backend → middleware → frontend → integración → tests. No empezar por UI si el backend no existe.

---

## 2. Plan

Antes de tocar código, presentar el plan al desarrollador:

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

Al iniciar cada tarea, anunciar qué se va a hacer. Al completar, confirmar qué se hizo. Si hubo cambios respecto al plan, explicar por qué.

**Checkpoints de bloque:** después de completar un grupo lógico de tareas (ej: todo el backend), hacer checkpoint con resumen de lo hecho, A/C cubiertos, y próximo bloque. Preguntar si hay ajustes.

**Actualización de context:** actualizar `.docs/context/iteration-YYYY-MM-DD.md` al menos cada 2-3 tareas. NO esperar a finalizar todo. Formato: ver skill `docs-structure`.

---

## 4. Verificación y Cierre

### Checklist Pre-Cierre

Antes de declarar un feature como completado:

- [ ] Cada A/C verificado individualmente
- [ ] Tests pasan (unit + integration si aplica)
- [ ] No hay regresiones en funcionalidad existente
- [ ] Lint y type-check pasan sin errores
- [ ] No hay TODOs ni código comentado dejado atrás
- [ ] Rutas/endpoints nuevos protegidos si corresponde
- [ ] Errores manejados (no catch vacíos ni errores silenciosos)

### Cierre

Al completar: actualizar `memory/` con lo implementado (formato: ver skill `docs-structure`) y marcar feature como completado en `context/` con estado 🟢.

---

## Regla de No-Drift

Durante la implementación, si el agente detecta un desvío, DEBE pausar y reportar antes de continuar.

**Tipos de drift:**

- **Scope creep** — la tarea requiere implementar algo fuera del feature → proponer lo mínimo para el A/C, o crear feature derivado
- **Dependencia faltante** — se necesita algo que no está configurado → reportar la dependencia, proponer como tarea adicional o marcar A/C como bloqueado
- **Inconsistencia** — un A/C contradice el código existente → preguntar cuál es correcto, NO asumir que el código existente tiene razón
- **Decisión de diseño** — múltiples opciones válidas sin definición en rules/ → presentar opciones con trade-offs, dejar que el desarrollador decida

**Formato de reporte:**

```
⚠️ DRIFT DETECTADO — Tipo: [scope/dependencia/inconsistencia/diseño]

Contexto: [qué estaba haciendo]
Problema: [qué encontré]
Impacto: [qué afecta si continúo o no]

Opciones:
A) [opción] — [trade-off]
B) [opción] — [trade-off]

Recomendación: [cuál y por qué]
```

---

## Concerns Transversales

Después de implementar cada bloque significativo de código, recorrer esta checklist. Para cada ítem que aplique, consultar la skill correspondiente y aplicar sus reglas al código recién creado. Solo marcar la tarea como completada cuando todos los ítems aplicables se cumplan.

- [ ] **Tests** — consultar `frontend/testing-rules` o `backend/testing`. Coverage mínimo: 80%
- [ ] **Clean code** — consultar `clean-code-principles`. JSDoc en interfaces públicas, named exports, funciones atómicas
- [ ] **Documentación** — consultar `agent-workflow/project-documentation`. README se actualiza si: nuevo script, nueva env var, cambio de estructura
- [ ] **Accesibilidad** (frontend) — consultar `frontend/a11y-rules`. WCAG 2.2 AA
- [ ] **i18n** (texto visible al usuario) — consultar `frontend/i18n-rules`. NO hardcodear strings de UI
- [ ] **Seguridad** — consultar `frontend/security-rules` o `backend/security` + `governance/owasp-top-10`. Validar inputs, sanitizar outputs
- [ ] **Error handling** — consultar `frontend/error-handling-rules` o `backend/error-handling`. No catch vacíos, errores tipados
- [ ] **Logging** (backend) — consultar `backend/logging`. Structured logging, no PII, correlation IDs

### Definition of Done

Un feature está DONE cuando:

1. Todos los A/C se cumplen
2. Tests pasan (coverage ≥ 80%)
3. Código sigue `clean-code-principles` y `.docs/rules/`
4. Checklist de concerns transversales cumplido
5. No hay desvíos no reportados del plan
6. Context actualizado con estado final
7. Memory actualizado con lo implementado
8. README actualizado si aplica

---

## Manejo de Features Grandes

Si un feature tiene > 15 tareas o > 15 A/C → proponer dividir en sub-features, cada uno con su propio `feature.md` en `.docs/features/`. Si el desarrollador prefiere mantenerlo como uno, agrupar tareas en fases con checkpoints más frecuentes.

---

## Gotchas

- El agente tiende a empezar a codear sin presentar el plan — siempre pedir confirmación antes
- El agente puede resolver un desvío en silencio — todo drift debe reportarse al desarrollador
- Tests vacíos o con asserts triviales (`expect(true).toBe(true)`) no cuentan como tests
- Código comentado como "placeholder" no es implementación válida — implementar completo o no implementar
- No esperar a terminar todo para actualizar `context/` — hacerlo cada 2-3 tareas
- Tareas demasiado grandes ("implementar el backend") no son atómicas — descomponer más
- Tareas demasiado pequeñas ("crear el archivo X") generan overhead innecesario
- Declarar done sin verificar cada A/C individualmente es un error frecuente
- Memory es solo hechos consumados — nunca incluir TODOs ni planes futuros
