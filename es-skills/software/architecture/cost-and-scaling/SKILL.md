---
name: cost-and-scaling
description: >
  Usa esta skill cuando necesites estimar costos, optimizar gasto o definir
  estrategias de escalado. Cubre estimación por tier, Reserved Instances,
  Savings Plans, auto-scaling, AWS Budgets y alertas de gasto. El presupuesto
  es un constraint de diseño transversal.
---

# Cost & Scaling — Optimización de Costos y Escalado

## Flujo de trabajo del agente

1. Identificar el tier de presupuesto del proyecto (sección 1).
2. Seleccionar stack según tier y fase del producto.
3. Aplicar estrategias de ahorro correspondientes (sección 2).
4. Configurar auto-scaling según compute elegido (sección 3).
5. Configurar budgets, alertas y validar con el checklist (sección 4).

> El presupuesto no es una sugerencia — es un constraint de diseño.
> Toda decisión arquitectónica pasa por el filtro del costo.

## 1. Estimación de costos por tier

### Tier: Mínimo ($0–$50/mes)

```
Ideal para: MVP, hobby, side project, prototipo

Stack típico:
  ├── Frontend: Vercel Hobby (gratis)
  ├── Backend: Lambda free tier (1M req/mes)
  ├── DB: Neon free tier o Supabase free o DynamoDB free tier
  ├── Storage: S3 (5 GB free tier)
  ├── CDN: CloudFront (1 TB free tier)
  ├── Cache: Upstash Redis free tier
  ├── Monitoring: CloudWatch (incluido) + Sentry free
  └── CI/CD: GitHub Actions (2,000 min/mes free)

Costo total: $0–$20/mes
Limitaciones:
  - No custom domain con SSL en algunos free tiers
  - Throughput limitado
  - Sin HA (single AZ, no failover)
  - Sin soporte
```

### Tier: Bajo ($50–$300/mes)

```
Ideal para: Startup early stage, app con primeros usuarios

Stack típico:
  ├── Frontend: Vercel Pro ($20/dev/mes)              = $20–60
  ├── Backend: Lambda (beyond free tier)               = $5–20
  ├── DB: Neon Pro ($19) o RDS t4g.micro ($13)        = $13–25
  ├── Storage: S3 (< 50 GB)                           = $2–5
  ├── CDN: CloudFront (< 100 GB transfer)             = $5–10
  ├── Cache: Upstash Pro ($10) si necesario            = $0–10
  ├── Monitoring: CloudWatch + Sentry Team ($26)       = $26–30
  ├── CI/CD: GitHub Actions (free o Team $4/user)      = $0–20
  └── DNS: Route53 ($0.50/zone + queries)              = $1–3

Costo total: $70–180/mes
Beneficios vs Mínimo:
  + Custom domains
  + Más throughput
  + DB backups automáticos
  + Error tracking profesional
```

### Tier: Medio ($300–$1,500/mes)

```
Ideal para: Startup con tracción, SaaS con clientes pagando

Stack típico:
  ├── Frontend: Vercel Pro ($20/dev × 3)               = $60
  ├── Backend: Lambda o ECS Fargate (1-2 tasks)        = $50–100
  ├── DB: RDS t4g.small Multi-AZ ($52)                 = $52–105
  ├── Cache: ElastiCache t4g.micro ($12)               = $12–24
  ├── Storage: S3 (100–500 GB) + CloudFront             = $20–60
  ├── Networking: NAT Gateway (si VPC)                  = $32
  ├── Monitoring: CloudWatch + Sentry Pro + X-Ray       = $50–100
  ├── Security: WAF ($6 + rules)                        = $10–30
  ├── CI/CD: GitHub Team + Actions                      = $20–40
  └── DNS + Certificates                                = $5

Costo total: $300–600/mes
Beneficios vs Bajo:
  + Alta disponibilidad (Multi-AZ)
  + Cache para performance
  + WAF para seguridad
  + Tracing distribuido
```

### Tier: Alto ($1,500–$5,000/mes)

```
Ideal para: Empresa establecida, SaaS con escala real

Stack típico:
  ├── Frontend: Vercel Pro ($20/dev × 5-10)             = $100–200
  ├── Backend: ECS Fargate (2-4 tasks auto-scaling)     = $150–400
  ├── DB: RDS r6g.large Multi-AZ + Read Replica         = $350–500
  ├── Cache: ElastiCache t4g.small cluster               = $50–100
  ├── Storage: S3 (1 TB+) + CloudFront global            = $50–150
  ├── Search: OpenSearch (si necesario)                  = $100–300
  ├── Messaging: SQS + EventBridge                       = $10–30
  ├── Networking: NAT Gateway × 2 AZ                     = $64
  ├── Monitoring: Datadog ($15/host × N)                 = $100–300
  ├── Security: WAF + Shield                             = $30–50
  └── CI/CD: GitHub Enterprise + Actions                 = $50–100

Total cost: $1,500–$3,000/month
```

## 2. Estrategias de ahorro

### 1. Serverless First (Ahorro: 50-80% vs always-on)

```
Lambda + API Gateway + DynamoDB + S3

Beneficio: pagas SOLO por lo que usas.
Si tienes 0 requests a las 3 AM → pagas $0.

Umbral de decisión:
  - < 3M requests/mes → Lambda es más barato que Fargate
  - > 3M requests/mes → evaluar Fargate (puede ser más eficiente)
  - Tráfico constante alto → Fargate con Savings Plans
```

### 2. Reserved Instances / Savings Plans

```
Para cargas CONSTANTES que no van a cambiar en 1-3 años:

RDS Reserved Instances:
  - 1 año, no upfront: ~30% ahorro
  - 1 año, all upfront: ~40% ahorro
  - 3 años, all upfront: ~60% ahorro

Compute Savings Plans:
  - Cubre: Lambda, Fargate, EC2
  - 1 año: ~30% ahorro
  - 3 años: ~50% ahorro

Cuándo comprar:
  ✅ Después de 3+ meses de uso estable (datos reales de consumo)
  ❌ NUNCA al inicio — primero entender tus patrones de uso
  ❌ NUNCA para workloads que podrían desaparecer
```

### 3. Right-sizing

```
Regla: revisar sizing cada 3 meses.

DB:
  - CPU promedio < 20% → bajar de tier
  - CPU promedio > 70% → subir de tier
  - Memoria libre > 50% → posiblemente over-provisioned

ECS Tasks:
  - CPU utilization < 30% promedio → reduce vCPU/Memory
  - Usar Fargate Spot para tareas no-críticas (70% ahorro)

Lambda:
  - Usar Power Tuning para encontrar el sweet spot de memoria
    (más memoria = más CPU = ejecución más rápida = puede ser más barato)
  - AWS Lambda Power Tuning: herramienta oficial para esto
```

### 4. Storage lifecycle

Configurar lifecycle policies en S3 (referencia: storage-and-cdn skill): Standard → Standard-IA a los 30–90 días. Standard-IA → Glacier a los 365 días. Eliminar archivos temporales automáticamente. **Ahorro potencial: 40–90% en archivos antiguos.**

### 5. NAT Gateway Optimization

```
NAT Gateway = $32/mes + $0.045/GB procesado
Es uno de los gastos más sneaky en AWS.

Opciones para reducir:
  1. Single NAT Gateway (en vez de uno por AZ): $32 vs $64
     Riesgo: si la AZ del NAT cae, las private subnets pierden internet
  2. VPC Endpoints para S3/DynamoDB: tráfico no pasa por NAT ($0)
  3. NAT Instance: EC2 t4g.nano (~$3/mes) — pero tú lo administras
  4. Sin VPC: si puedes evitarlo (Lambda + DynamoDB sin VPC)
```

## 3. Auto-Scaling

### Lambda

Auto-scaling nativo — escala de 0 a 1,000 concurrentes automáticamente sin configurar nada.

- **Reserved Concurrency:** garantiza capacidad para funciones críticas.
- **Provisioned Concurrency:** pre-calentado para evitar cold starts (pagas por capacidad reservada incluso sin uso).

**Cuándo activar Provisioned Concurrency:** solo para APIs time-sensitive donde cold starts son inaceptables. Para lo demás, un cold start de 200ms es aceptable.

### ECS Fargate

```yaml
# Terraform — Auto-scaling ECS
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = 10
  min_capacity       = 2  # Mínimo 2 para HA
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 70  # Scale when CPU > 70%
    scale_in_cooldown  = 300
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}
```

### RDS

**Storage auto-scaling:** configurar `max_allocated_storage` — se expande automáticamente cuando storage > 90%.

**Read Replicas para escalar lectura:** usar cuando hay read-heavy workload (analytics, búsquedas). La app enruta queries de lectura a la replica. Costo: mismo que la instancia primaria.

## 4. AWS Budgets y alertas

```hcl
# Terraform — Budget con alertas
resource "aws_budgets_budget" "monthly" {
  name         = "monthly-budget"
  budget_type  = "COST"
  limit_amount = "300"  # $300/mes
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80  # Alerta al 80% del budget
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["team@company.com"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100  # Alerta al 100% del budget
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["team@company.com"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100  # Alerta si FORECAST excede budget
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["team@company.com"]
  }
}
```

### Checklist de cost control

- [ ] AWS Budgets configurado con alertas al 80% y 100%
- [ ] Cost Explorer habilitado (revisar semanalmente)
- [ ] Tags en todos los recursos (Environment, Service, Owner)
- [ ] Lifecycle policies en S3
- [ ] Log retention configurado (no indefinido)
- [ ] Dev/Staging apagado fuera de horario (o con instancias más pequeñas)
- [ ] Reserved Instances evaluados después de 3 meses estables
- [ ] Right-sizing review trimestral
- [ ] Unused resources limpiados (AMIs, snapshots, EIPs no asociados)
- [ ] NAT Gateway justificado (o eliminado si no es necesario)

## 5. Herramienta de IaC — Decisión

```
El agente recomienda IaC basándose en el equipo y proyecto:

¿Experiencia del equipo con IaC?
│
├── Ninguna + proyecto serverless
│   ├── SST (Serverless Stack) → Developer experience superior para
│   │   serverless en AWS. TypeScript nativo. Live Lambda development.
│   └── Serverless Framework → Más maduro, más docs, más plugins
│
├── Básica/Intermedia + proyecto mixto (serverless + containers + DB)
│   └── Terraform → Estándar de la industria, multi-cloud ready
│       Con módulos oficiales de AWS (VPC, ECS, RDS...)
│       HCL es más simple que CloudFormation YAML
│
├── Avanzada + TypeScript team
│   └── AWS CDK → Infrastructure as actual TypeScript code
│       Type-safe, composable constructs
│       Compila a CloudFormation
│
└── Ya tienen algo
    └── Mantener lo que tienen. Migrar IaC tiene costo alto.

REGLA: el agente propone la herramienta y justifica. No asume.
```

## 6. Escalado por fase del producto

**Fase 1 — MVP (0–100 usuarios):** Serverless puro (Lambda + DynamoDB/Neon + S3 + Vercel). $0–50/mes. Foco en velocidad de desarrollo.

**Fase 2 — Product-Market Fit (100–1,000 usuarios):** Serverless con más servicios (Redis, SQS, Sentry). Considerar RDS si necesitas SQL. $50–300/mes. Foco en reliability y monitoring.

**Fase 3 — Growth (1,000–10,000 usuarios):** Evaluar Fargate si Lambda tiene limits. Multi-AZ para HA. CDN global, cache agresivo. $300–1,500/mes. Foco en performance y escalabilidad.

**Fase 4 — Scale (10,000+ usuarios):** Auto-scaling en todo. Read replicas, cache distribuido. Posibles microservicios para dominios clave. Reserved Instances/Savings Plans. $1,500+/mes. Foco en optimización de costo y resilience.

## 7. Gotchas

- Over-provisioning "por si acaso" — right-size basado en datos reales.
- Reserved Instances al día 1 — esperar 3+ meses de datos.
- NAT Gateway sin necesidad — $384/año mínimo por nada.
- RDS Multi-AZ en dev/staging — $0 beneficio, doble costo.
- Logs sin retención — crece indefinidamente.
- ECS tasks con más CPU/RAM de lo necesario — revisar métricas.
- Lambda con Provisioned Concurrency para APIs no time-sensitive.
- Un solo ambiente (prod) sin staging — cambios no testeados.
- No usar tags — no puedes saber qué servicio gasta qué.
- Free tier mentality en producción — limits causan outages.
- Kubernetes para 2 servicios — complejidad brutal sin beneficio.
- Microservicios para un MVP — overhead organizacional y técnico.
- Ignorar el storage de snapshots/backups antiguos.
