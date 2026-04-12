---
name: architecture
description: >
  Framework de decisiones arquitectónicas para proyectos de software. Esta skill
  es un orquestador: guía al agente a través de un ciclo de preguntas sobre el
  negocio, escala, presupuesto y equipo, y luego activa sub-skills de compute,
  databases, storage, networking, messaging, observability y costos para construir
  una propuesta de infraestructura completa. El agente NO asume tecnologías — todo
  es situacional. Al finalizar, presenta un resumen ejecutivo y pide confirmación.
---

# 🏛️ Architecture — Framework de Decisiones

## Principio Rector

> **No existe la "mejor" arquitectura — existe la correcta para este proyecto.**
> Cada decisión tiene un trade-off. El agente pregunta, propone con justificación,
> y no avanza sin confirmación del desarrollador.

---

## Flujo del Agente

```
FASE 1: DISCOVERY
  → Preguntas sobre negocio, escala, presupuesto, equipo, constraints
  → Recopilar todas las respuestas antes de proponer NADA

FASE 2: ANÁLISIS
  → Activar sub-skills relevantes según respuestas
  → Evaluar opciones con árboles de decisión de cada sub-skill
  → Considerar presupuesto como constraint transversal

FASE 3: PROPUESTA
  → Presentar resumen ejecutivo con TODAS las decisiones
  → Justificar cada elección (por qué X y no Y)
  → Estimar costo mensual aproximado
  → PEDIR CONFIRMACIÓN antes de continuar

FASE 4: IMPLEMENTACIÓN
  → Con confirmación, generar configuración/IaC
  → Guiar paso a paso la configuración de servicios
  → Referenciar skill basic-workflows para CI/CD de PRs
```

---

## FASE 1 — Preguntas de Discovery

El agente DEBE hacer estas preguntas antes de tomar cualquier decisión.
Agrupar en bloques — no abrumar con todas a la vez.

### Bloque 1: Negocio

```
1. ¿Qué tipo de proyecto es?
   (SaaS B2B, marketplace, e-commerce, app interna, landing/marketing,
    API pública, plataforma de contenido, otro)

2. ¿Cuál es el core del producto?
   (Qué hace, en una oración)

3. ¿Quiénes son los usuarios?
   (Consumidores finales, empresas, desarrolladores, equipo interno)

4. ¿En qué regiones geográficas operará?
   (Latam, US, EU, global)
```

### Bloque 2: Escala y Tráfico

```
5. ¿Cuántos usuarios simultáneos esperan en el primer año?
   Tiers:
   - Bajo:    < 100 concurrentes
   - Medio:   100 – 1,000 concurrentes
   - Alto:    1,000 – 10,000 concurrentes
   - Masivo:  > 10,000 concurrentes

6. ¿El tráfico es predecible o tiene picos?
   (Constante, picos por horario, eventos/campañas, estacional)

7. ¿Hay procesamiento pesado?
   (Imágenes/video, ML/AI, reportes batch, importar CSV grandes, real-time)

8. ¿Necesitan real-time?
   (Chat, notificaciones push, collaboration en vivo, dashboards live)
```

### Bloque 3: Datos

```
9. ¿Qué tipo de datos manejan?
   (Transaccionales/financieros, contenido/media, analíticos,
    datos personales sensibles, datos de salud)

10. ¿Volumen de datos estimado?
    (GBs, TBs, crecimiento mensual esperado)

11. ¿Necesitan búsqueda avanzada?
    (Full-text search, filtros complejos, geolocalización)

12. ¿Hay requisitos regulatorios?
    (GDPR, HIPAA, PCI DSS, SOC 2, residencia de datos)
    → Si sí: activar skills de governance-risk-and-compliance
```

### Bloque 4: Equipo y Presupuesto

```
13. ¿Tamaño del equipo técnico?
    - Solo:     1 developer
    - Pequeño:  2–5 developers
    - Mediano:  5–15 developers
    - Grande:   > 15 developers

14. ¿Experiencia del equipo con cloud/infra?
    (Ninguna, básica, intermedia, avanzada)

15. ¿Presupuesto mensual de infraestructura?
    Tiers:
    - Mínimo:   $0 – $50/mes (free tiers, hobby)
    - Bajo:     $50 – $300/mes (startup early stage)
    - Medio:    $300 – $1,500/mes (startup con tracción)
    - Alto:     $1,500 – $5,000/mes (empresa establecida)
    - Enterprise: > $5,000/mes

16. ¿Hay preferencia por managed services vs self-hosted?
    (Prefiero pagar más y operar menos / Prefiero control total)
```

### Bloque 5: Tech Stack Existente

```
17. ¿Ya hay código o es greenfield?
    (Greenfield, migración, extensión de sistema existente)

18. ¿Hay tecnologías ya decididas?
    (Framework frontend/backend, lenguaje, servicios cloud ya comprometidos)

19. ¿Cómo es el flujo de deploy actual?
    (Manual, CI/CD parcial, CI/CD completo, no existe aún)
```

---

## FASE 2 — Routing a Sub-Skills

Una vez recopiladas las respuestas, el agente consulta las sub-skills:

| Decisión | Sub-Skill | Activa cuando... |
|----------|-----------|-------------------|
| Dónde corre el código | `compute` | Siempre |
| Dónde se almacenan datos | `databases` | Siempre |
| Archivos, media, assets | `storage-and-cdn` | Hay uploads, imágenes, o assets estáticos |
| Redes, seguridad, accesos | `networking-and-security` | Siempre |
| Comunicación entre servicios | `messaging-and-events` | Microservicios, procesamiento async, real-time |
| Logs, monitoreo, alertas | `observability` | Siempre |
| Optimización de costos | `cost-and-scaling` | Siempre (evalúa contra presupuesto) |

---

## FASE 3 — Resumen Ejecutivo

Al terminar el análisis, presentar este formato:

```markdown
## 📋 Propuesta de Arquitectura — [Nombre del Proyecto]

### Contexto
- Tipo: [SaaS B2B / marketplace / ...]
- Escala: [tier de usuarios] — [tipo de tráfico]
- Presupuesto: [tier] ($X–$Y/mes)
- Equipo: [size] — experiencia cloud [nivel]
- Regulaciones: [GDPR / PCI / ninguna]

### Stack Propuesto

| Capa | Tecnología | Justificación | Costo est./mes |
|------|-----------|---------------|----------------|
| Frontend hosting | ... | ... | ... |
| Backend/API | ... | ... | ... |
| Base de datos | ... | ... | ... |
| Cache | ... | ... | ... |
| Storage | ... | ... | ... |
| CDN | ... | ... | ... |
| Auth | ... | ... | ... |
| Mensajería | ... | ... | ... |
| Monitoring | ... | ... | ... |
| CI/CD | ... | ... | ... |

### Costo Total Estimado: $X/mes

### Alternativas Consideradas
- [Opción B]: descartada porque [razón]
- [Opción C]: descartada porque [razón]

### Diagrama de Arquitectura
[Diagrama en Mermaid o ASCII]

### Riesgos y Trade-offs
- ...

---
⚠️ ¿Confirmas esta propuesta para proceder con la implementación?
```

---

## FASE 4 — Implementación

Con confirmación del desarrollador:

1. **IaC / Configuración** — Generar Terraform, CDK, serverless.yml, o guía manual según experiencia del equipo
2. **CI/CD de Deploy** — Pipeline de deploy (staging → production)
   - Para checks de PR (lint, test, build): referenciar skill `basic-workflows`
   - Para deploy a cloud: configurar en esta skill
3. **Guías de setup** — Paso a paso para cada servicio propuesto
4. **Variables de entorno** — Qué secrets/configs necesita cada servicio

---

## Reglas Transversales

```
1. PRESUPUESTO ES UN CONSTRAINT, NO UNA SUGERENCIA
   → Toda propuesta debe respetar el tier de presupuesto del usuario.
   → Si la solución "ideal" excede el presupuesto, proponer alternativas.

2. COMPLEJIDAD PROPORCIONAL AL EQUIPO
   → Equipo de 1-2: managed services, mínima infra custom.
   → Equipo de 15+: puede manejar Kubernetes, multi-service, etc.

3. NO SOBRE-ARQUITECTURAR
   → MVP no necesita microservicios.
   → < 1,000 usuarios probablemente no necesita cache distribuido.
   → Empezar simple, escalar cuando los datos lo justifiquen.

4. SEGURIDAD NO ES OPCIONAL
   → HTTPS everywhere, secrets en vault, IAM least privilege.
   → Si hay regulaciones, activar skills de GRC como prerequisito.

5. OBSERVABILITY DESDE EL DÍA 1
   → No es algo que "agregas después". Logging y monitoring van
     en la configuración inicial.
```

---

## Sub-Skills Disponibles

- `architecture/compute` — Lambda, ECS, EC2, Vercel, Cloud Run
- `architecture/databases` — RDS, DynamoDB, MongoDB, Redis, ElastiCache
- `architecture/storage-and-cdn` — S3, CloudFront, media processing
- `architecture/networking-and-security` — VPC, WAF, IAM, API Gateway, secrets
- `architecture/messaging-and-events` — SQS, SNS, EventBridge, WebSockets
- `architecture/observability` — CloudWatch, Datadog, Sentry, tracing
- `architecture/cost-and-scaling` — Ahorro, auto-scaling, reserved instances
