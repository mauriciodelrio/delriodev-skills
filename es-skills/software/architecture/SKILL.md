---
name: architecture
description: >
  Usa esta skill cuando necesites diseñar la arquitectura de un proyecto.
  Orquesta sub-skills de compute, databases, storage, networking, messaging,
  observability y costos. Guía al agente a través de discovery, análisis,
  propuesta e implementación. El agente NO asume tecnologías — todo es
  situacional.
---

# Architecture — Framework de Decisiones

## Flujo de trabajo del agente

1. **Discovery:** preguntar sobre negocio, escala, presupuesto, equipo y constraints. Recopilar todas las respuestas antes de proponer nada.
2. **Análisis:** activar sub-skills relevantes según respuestas, evaluar opciones con árboles de decisión, considerar presupuesto como constraint.
3. **Propuesta:** presentar resumen ejecutivo con todas las decisiones, justificar cada elección, estimar costo mensual, pedir confirmación.
4. **Implementación:** con confirmación, generar IaC/configuración, guiar paso a paso, referenciar basic-workflows para CI/CD de PRs.

> No existe la "mejor" arquitectura — existe la correcta para este proyecto.
> Cada decisión tiene un trade-off. El agente pregunta, propone con
> justificación, y no avanza sin confirmación del desarrollador.

## 1. Preguntas de Discovery

El agente DEBE hacer estas preguntas antes de tomar cualquier decisión. Agrupar en bloques — no abrumar con todas a la vez.

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

## 2. Routing a sub-skills

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

## 3. Resumen ejecutivo

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

## 4. Implementación

Con confirmación del desarrollador:

1. **IaC / Configuración** — Generar Terraform, CDK, serverless.yml, o guía manual según experiencia del equipo
2. **CI/CD de Deploy** — Pipeline de deploy (staging → production)
   - Para checks de PR (lint, test, build): referenciar skill `basic-workflows`
   - Para deploy a cloud: configurar en esta skill
3. **Guías de setup** — Paso a paso para cada servicio propuesto
4. **Variables de entorno** — Qué secrets/configs necesita cada servicio

## 5. Reglas transversales

**Presupuesto es un constraint, no una sugerencia.** Toda propuesta respeta el tier del usuario. Si la solución ideal excede el presupuesto, proponer alternativas.

**Complejidad proporcional al equipo.** Equipo de 1–2: managed services, mínima infra custom. Equipo de 15+: puede manejar Kubernetes, multi-service.

**No sobre-arquitecturar.** MVP no necesita microservicios. <1,000 usuarios probablemente no necesita cache distribuido. Empezar simple, escalar cuando los datos lo justifiquen.

**Seguridad no es opcional.** HTTPS everywhere, secrets en vault, IAM least privilege. Si hay regulaciones, activar skills de GRC como prerequisito.

**Observability desde el día 1.** No es algo que "agregas después". Logging y monitoring van en la configuración inicial.

## 6. Sub-skills disponibles

- `architecture/compute` — Lambda, ECS, EC2, Vercel, Cloud Run
- `architecture/databases` — RDS, DynamoDB, MongoDB, Redis, ElastiCache
- `architecture/storage-and-cdn` — S3, CloudFront, media processing
- `architecture/networking-and-security` — VPC, WAF, IAM, API Gateway, secrets
- `architecture/messaging-and-events` — SQS, SNS, EventBridge, WebSockets
- `architecture/observability` — CloudWatch, Datadog, Sentry, tracing
- `architecture/cost-and-scaling` — Ahorro, auto-scaling, reserved instances
