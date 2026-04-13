---
name: compute
description: >
  Usa esta skill cuando necesites decidir dónde ejecutar código. Cubre
  AWS Lambda, ECS Fargate, EC2, Vercel Functions/Edge. Incluye árboles de
  decisión por escala, latencia, costo, complejidad, y patrones de deploy.
---

# Compute — Dónde Corre el Código

## Flujo de trabajo del agente

1. Identificar el tipo de carga (frontend/SSR, API, worker/cron).
2. Recorrer el árbol de decisión (sección 1) con el usuario.
3. Consultar criterios de selección y costos de la opción elegida (sección 2).
4. Verificar contra constraints del proyecto (presupuesto, equipo, compliance).
5. Si hay conflicto, proponer alternativas del mismo árbol.

## 1. Árbol de decisión

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

## 2. Opciones de compute

### AWS Lambda

**Cuándo usarlo:**
- APIs REST/GraphQL stateless
- Webhooks y event handlers
- Procesamiento de archivos (S3 triggers)
- Cron jobs < 15 min
- Tráfico variable con picos (autoescala a 0)
- Presupuesto mínimo/bajo (pagas solo por ejecución)

**Cuándo NO usarlo:**
- WebSockets persistentes requeridos
- Cold starts inaceptables (< 100ms constante)
- Procesamiento > 15 minutos
- Necesitas > 10 GB de RAM
- Aplicación con estado en memoria

| Spec | Valor |
|------|-------|
| Timeout | hasta 15 min |
| RAM | 128 MB – 10,240 MB |
| /tmp | 512 MB – 10 GB |
| Concurrencia | 1,000 por defecto (ajustable) |
| Cold start | ~200ms–1s (depende de runtime y tamaño) |

**Costo estimado:**
- Free tier: 1M requests + 400,000 GB-s/mes
- Después: ~$0.20 per 1M requests + $0.0000166667/GB-s
- API con 100K req/mes → prácticamente gratis
- API con 10M req/mes → ~$20–50/mes

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

**Cuándo usarlo:**
- APIs con conexiones persistentes (DB pools, WebSocket)
- Aplicaciones con estado en memoria (sessions, cache local)
- Tráfico constante y predecible
- Procesos de larga duración
- Control del contenedor (Docker)
- Múltiples servicios que se comunican internamente

**Cuándo NO usarlo:**
- Tráfico muy variable (pagas mínimo por el container corriendo)
- Presupuesto mínimo (piso de ~$30/mes por task)
- Equipo sin experiencia en Docker/containers

**Costo estimado:**
- 0.25 vCPU + 0.5 GB: ~$9/mes (siempre encendido)
- 0.5 vCPU + 1 GB: ~$18/mes
- 1 vCPU + 2 GB: ~$36/mes
- Con auto-scaling: escala de 1 a N tasks

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

**Cuándo usarlo:**
- Frontend Next.js (SSR, SSG, ISR) — integración nativa
- API Routes ligeras (parte del monorepo Next.js)
- Preview deployments automáticos por PR
- Edge Functions (geolocalización, A/B testing, redirects)
- Equipo pequeño que no quiere manejar infra

**Cuándo NO usarlo:**
- Backend pesado (mejor Lambda o ECS)
- Acceso a VPC privada de AWS requerido
- Funciones > 300s (Pro) / 60s (Hobby)
- Procesamiento CPU-intensivo

**Planes:**
- Hobby: gratis (uso personal)
- Pro: $20/dev/mes (comercial — plan para proyectos reales)
- Enterprise: custom pricing

### EC2

**Cuándo usarlo:**
- Control total del SO requerido
- Software que requiere GPU
- Aplicaciones legacy no containerizadas
- Compliance que requiere servidor dedicado

**Cuándo NO usarlo:**
- Casi siempre — preferir Lambda o Fargate
- Equipo sin experiencia en administración de servidores

EC2 es el último recurso, no el primer instinto.

## 3. Patrones de deploy

### Frontend (Next.js)

- **Vercel (recomendado):** git push → build → deploy automático. Preview por PR, rollback instantáneo.
- **AWS Amplify:** similar a Vercel dentro del ecosistema AWS. Útil si todo ya está en AWS.
- **Self-hosted en ECS:** Docker + Next.js standalone output. Solo si necesitas acceso a VPC privada.

### Backend (API)

- **Lambda:** GitHub Actions → build → deploy con Serverless Framework o SST. Referencia: skill `basic-workflows` para CI checks.
- **ECS Fargate:** GitHub Actions → build Docker image → push a ECR → update ECS service. Blue/green deployment con CodeDeploy.

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

## 4. Tabla comparativa

| Criterio | Lambda | ECS Fargate | Vercel | EC2 |
|----------|--------|-------------|--------|-----|
| Escala a 0 | Sí | No | Sí | No |
| Cold starts | ~200ms–1s | No hay | ~50ms (edge) | No hay |
| Timeout máx | 15 min | ∞ | 5 min (Pro) | ∞ |
| WebSockets | No (via API GW) | Sí | No | Sí |
| Costo mínimo | ~$0 | ~$30/mes | $0–$20/mes | ~$9/mes |
| Complejidad ops | Baja | Media | Mínima | Alta |
| Docker | No necesitas | Requerido | No necesitas | Opcional |

## 5. Gotchas

- Elegir EC2 por defecto "porque es lo que conozco" — evaluar Lambda o Fargate primero.
- Lambda para todo (WebSockets, procesos largos, apps stateful) — cada servicio tiene su caso de uso.
- ECS para APIs simples y stateless es overkill — usar Lambda.
- Vercel no es para backend pesado — usar Lambda o ECS.
- Lambda con VPC sin necesidad agrega cold start significativo (~1-5s extra).
- Un solo container sin auto-scaling ni health checks no es producción.
- Deploy manual vía SSH a EC2 no es aceptable — usar CI/CD.
