---
name: compute
description: >
  Árbol de decisiones para elegir dónde ejecutar código. Cubre AWS Lambda,
  ECS Fargate, EC2, Vercel Functions/Edge, Cloud Run. Incluye criterios de
  selección por escala, latencia, costo, complejidad, y patrones de deploy.
  No asume tecnología — decide según contexto del proyecto.
---

# ⚡ Compute — Dónde Corre el Código

## Árbol de Decisión

```
¿Es frontend/SSR (Next.js)?
├── SÍ → Vercel (deploy integrado, edge network, zero-config)
│        Alternativa: AWS Amplify, self-hosted en ECS
│
¿Es una API/backend?
├── ¿Requests < 15s y stateless?
│   ├── SÍ → AWS Lambda (serverless)
│   │        Alternativa: Vercel Functions (si es parte del monorepo Next.js)
│   │
│   └── NO → ¿Necesita conexiones persistentes (WebSocket, DB pools)?
│            ├── SÍ → ECS Fargate (containers sin EC2)
│            │        Alternativa: EC2 si necesitas control total
│            └── NO → ¿Procesamiento > 15 min?
│                     ├── SÍ → AWS Step Functions + Lambda o ECS Tasks
│                     └── NO → Lambda con timeout extendido (hasta 15 min)
│
¿Es un worker/job/cron?
├── Ejecución < 15 min → Lambda + EventBridge Scheduler
├── Ejecución larga    → ECS Fargate Task (one-shot)
├── Cron simple        → EventBridge Scheduler → Lambda
└── Pipeline de pasos  → Step Functions
```

---

## Opciones de Compute

### AWS Lambda

```
Cuándo SÍ:
  ✅ APIs REST/GraphQL stateless
  ✅ Webhooks y event handlers
  ✅ Procesamiento de archivos (S3 triggers)
  ✅ Cron jobs < 15 min
  ✅ Tráfico variable con picos (autoescala a 0)
  ✅ Presupuesto mínimo/bajo (pagas solo por ejecución)

Cuándo NO:
  ❌ Necesitas WebSockets persistentes
  ❌ Cold starts inaceptables (< 100ms requerido constantemente)
  ❌ Procesamiento > 15 minutos
  ❌ Necesitas > 10 GB de RAM
  ❌ Aplicación con estado en memoria

Specs:
  - Timeout: hasta 15 min
  - RAM: 128 MB – 10,240 MB
  - Almacenamiento temporal: /tmp 512 MB – 10 GB
  - Concurrencia: 1,000 por defecto (ajustable)
  - Cold start: ~200ms–1s (depende de runtime y tamaño)

Costo estimado:
  - Free tier: 1M requests + 400,000 GB-s/mes
  - Después: ~$0.20 per 1M requests + $0.0000166667/GB-s
  - API con 100K req/mes → prácticamente gratis
  - API con 10M req/mes → ~$20–50/mes

Configuración de referencia (serverless.yml):
```

```yaml
# serverless.yml (Serverless Framework)
service: my-api

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  memorySize: 512
  timeout: 29  # API Gateway tiene límite de 30s
  environment:
    DATABASE_URL: ${ssm:/my-api/database-url}
    NODE_ENV: production
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - s3:GetObject
            - s3:PutObject
          Resource: arn:aws:s3:::my-bucket/*

functions:
  api:
    handler: dist/handler.main
    events:
      - httpApi:
          method: '*'
          path: '/{proxy+}'

  processUpload:
    handler: dist/workers/processUpload.handler
    timeout: 900  # 15 min para procesamiento pesado
    memorySize: 1024
    events:
      - s3:
          bucket: uploads
          event: s3:ObjectCreated:*

  dailyReport:
    handler: dist/crons/dailyReport.handler
    events:
      - schedule:
          rate: cron(0 8 * * ? *)  # 8:00 AM UTC diario
```

### ECS Fargate

```
Cuándo SÍ:
  ✅ APIs que necesitan conexiones persistentes (DB pools, WebSocket)
  ✅ Aplicaciones con estado en memoria (sessions, cache local)
  ✅ Tráfico constante y predecible
  ✅ Procesos de larga duración
  ✅ Necesitas control del contenedor (Docker)
  ✅ Múltiples servicios que se comunican internamente

Cuándo NO:
  ❌ Tráfico muy variable (pagas mínimo por el container corriendo)
  ❌ Presupuesto mínimo (Fargate tiene un piso de ~$30/mes por task)
  ❌ Equipo sin experiencia en Docker/containers

Costo estimado:
  - 0.25 vCPU + 0.5 GB: ~$9/mes (siempre encendido)
  - 0.5 vCPU + 1 GB: ~$18/mes
  - 1 vCPU + 2 GB: ~$36/mes
  - Con auto-scaling: escala de 1 a N tasks
```

```yaml
# Ejemplo Terraform simplificado
resource "aws_ecs_service" "api" {
  name            = "api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2  # Mínimo 2 para alta disponibilidad
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnets
    security_groups  = [aws_security_group.api.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }
}
```

### Vercel

```
Cuándo SÍ:
  ✅ Frontend Next.js (SSR, SSG, ISR) — integración nativa
  ✅ API Routes ligeras (parte del monorepo Next.js)
  ✅ Preview deployments automáticos por PR
  ✅ Edge Functions (geolocalización, A/B testing, redirects)
  ✅ Equipo pequeño que no quiere manejar infra
  ✅ Presupuesto bajo-medio para frontend

Cuándo NO:
  ❌ Backend pesado (mejor Lambda o ECS)
  ❌ Necesitas acceso a VPC privada de AWS
  ❌ Funciones > 300s (Pro) / 60s (Hobby)
  ❌ Procesamiento CPU-intensivo

Planes:
  - Hobby: gratis (uso personal)
  - Pro: $20/dev/mes (comercial — este es el plan para proyectos reales)
  - Enterprise: custom pricing
```

### EC2

```
Cuándo SÍ:
  ✅ Necesitas control total del SO
  ✅ Software que requiere GPU
  ✅ Aplicaciones legacy que no se containerizaron
  ✅ Compliance que requiere servidor dedicado

Cuándo NO:
  ❌ Casi siempre — preferir Lambda o Fargate
  ❌ Equipo sin experiencia en administración de servidores
  ❌ No quieren manejar patching, security updates, etc.

Regla: EC2 es el último recurso, no el primer instinto.
```

---

## Patrones de Deploy

### Frontend (Next.js)

```
Opción A: Vercel (recomendado)
  git push → Vercel detecta → build → deploy automático
  Preview por PR, rollback instantáneo

Opción B: AWS Amplify
  Similar a Vercel pero dentro del ecosistema AWS
  Útil si todo lo demás ya está en AWS

Opción C: Self-hosted en ECS
  Docker + Next.js standalone output
  Solo si necesitas acceso a VPC privada
```

### Backend (API)

```
Lambda:
  GitHub Actions → build → deploy con Serverless Framework o SST
  → Referencia: skill basic-workflows para CI checks

ECS Fargate:
  GitHub Actions → build Docker image → push a ECR → update ECS service
  Blue/green deployment con CodeDeploy

Pipeline ejemplo (GitHub Actions → Lambda):
```

```yaml
# .github/workflows/deploy-api.yml
name: Deploy API

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-arn: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: us-east-1

      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm exec serverless deploy --stage production
```

---

## Tabla Comparativa Rápida

| Criterio | Lambda | ECS Fargate | Vercel | EC2 |
|----------|--------|-------------|--------|-----|
| Escala a 0 | ✅ | ❌ | ✅ | ❌ |
| Cold starts | ~200ms–1s | ❌ No hay | ~50ms (edge) | ❌ No hay |
| Timeout máx | 15 min | ∞ | 5 min (Pro) | ∞ |
| WebSockets | ❌ (via API GW) | ✅ | ❌ | ✅ |
| Costo mínimo | ~$0 | ~$30/mes | $0–$20/mes | ~$9/mes |
| Complejidad ops | Baja | Media | Mínima | Alta |
| Docker | No necesitas | ✅ Requerido | No necesitas | Opcional |

---

## Anti-patrones

```
❌ Elegir EC2 por defecto "porque es lo que conozco"
❌ Lambda para TODO (WebSockets, procesos largos, apps stateful)
❌ ECS para APIs simples y stateless (Overkill — usar Lambda)
❌ Vercel para backend pesado (no es su propósito)
❌ No considerar cold starts en Lambda para APIs time-sensitive
❌ Lambda con VPC sin necesidad (agrega cold start significativo)
❌ Un solo container sin auto-scaling ni health checks
❌ Deploy manual vía SSH a EC2
```
