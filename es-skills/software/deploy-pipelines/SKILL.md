---
name: deploy-pipelines
description: >
  Usa esta skill cuando generes pipelines de CI/CD, configures deploy a Vercel
  o AWS (CDK/SST), implementes preview environments, estrategias blue/green o
  canary, rollback, gestión de entornos (dev/staging/prod) o secrets en
  pipelines. Aplica para cualquier proyecto Node.js/TypeScript con GitHub Actions.
---

# Deploy Pipelines

## Flujo de trabajo del agente

1. Usar los templates YAML de esta skill como base para pipelines
2. Seguir el orden obligatorio de stages: install → lint → type check → test → build → deploy
3. Siempre configurar OIDC para AWS (nunca access keys estáticos)
4. Incluir preview environments en todo proyecto con PRs
5. Validar contra la sección Gotchas antes de entregar configuración de CI/CD

---

## Pipeline Stages — Orden Obligatorio

```
Todo pipeline sigue este flujo:

  1. INSTALL     → pnpm install --frozen-lockfile
  2. LINT        → eslint + prettier check
  3. TYPE CHECK  → tsc --noEmit
  4. TEST        → vitest run
  5. BUILD       → pnpm build
  6. DEPLOY      → al entorno correspondiente

REGLAS:
  - Si un stage falla, abortar. No deployar código roto.
  - Cada stage debe ser independiente y cacheable.
  - Build artifacts se pasan entre stages, no se rebuilda.
```

---

## GitHub Actions — CI Pipeline Base

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true  # Cancelar runs anteriores del mismo PR

jobs:
  ci:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm tsc --noEmit

      - name: Test
        run: pnpm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db

      - name: Build
        run: pnpm build
```

---

## Deploy a Vercel

```yaml
# .github/workflows/deploy-vercel.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: [ci]  # Solo si CI pasa

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          # Production solo en push a main
          vercel-args: ${{ github.event_name == 'push' && '--prod' || '' }}
```

```
VERCEL — FLUJO TÍPICO:
  PR abierto     → Preview deployment (URL única por PR)
  PR mergeado    → Production deployment
  
CONFIGURACIÓN:
  vercel.json para overrides
  Environment variables en Vercel dashboard (per-environment)
  
CUÁNDO USAR VERCEL:
  ✅ Next.js / frontend
  ✅ API routes serverless
  ✅ Proyectos con budget limitado para infra
  
CUÁNDO NO:
  ❌ Backend con long-running processes
  ❌ WebSockets persistentes
  ❌ Workers / cron jobs complejos
  → Usar AWS
```

---

## Deploy a AWS con SST

```yaml
# .github/workflows/deploy-aws.yml
name: Deploy to AWS

on:
  push:
    branches: [main, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    needs: [ci]

    permissions:
      id-token: write   # Para OIDC
      contents: read

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      # AWS credentials via OIDC (NO access keys)
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Deploy
        run: npx sst deploy --stage ${{ github.ref == 'refs/heads/main' && 'prod' || 'staging' }}
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

```
SST/CDK — FLUJO TÍPICO:
  push a develop  → Deploy a staging
  push a main     → Deploy a production
  
AWS AUTH EN CI:
  ✅ OIDC (OpenID Connect) → sin secrets estáticos
  ❌ Access keys en secrets → rotan, se filtran
  
  Configurar en AWS IAM:
    1. Identity Provider → GitHub Actions
    2. Role con trust policy para tu repo
    3. Permissions mínimas necesarias
```

---

## Preview Environments

```yaml
# PR Preview — Entorno efímero por cada PR
name: Preview Environment

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Opción 1: Vercel (automático con integración de GitHub)
      # No necesita config — Vercel crea preview por defecto
      
      # Opción 2: SST con stage por PR
      - name: Deploy preview
        run: npx sst deploy --stage pr-${{ github.event.pull_request.number }}
      
      # Opción 3: Docker + servicio de preview
      - name: Deploy to preview
        run: |
          docker build -t app:pr-${{ github.event.pull_request.number }} .
          # Push a ECR y deploy a ECS con task específica

      - name: Comment PR with URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview: https://pr-${{ github.event.pull_request.number }}.preview.example.com'
            })
```

```
PREVIEW ENVIRONMENTS:
  ✅ Cada PR tiene su propia URL
  ✅ QA puede probar antes de merge
  ✅ Stakeholders pueden ver cambios
  
  CLEANUP:
    Destruir preview cuando PR se cierra/mergea
    on: pull_request: types: [closed]
    → npx sst remove --stage pr-${{ PR_NUMBER }}
```

---

## Gestión de Entornos

```
ENTORNOS ESTÁNDAR:
  local       → docker compose up (sin pipeline)
  preview     → efímero por PR
  staging     → push a develop (réplica de prod)
  production  → push a main (o manual approval)

VARIABLES DE ENTORNO POR STAGE:
  .env.local        → git-ignored, cada dev
  .env.example      → committed, template
  
  CI/CD secrets:
    GitHub Secrets → por environment
    Settings → Environments → staging/production
    Cada environment tiene sus propios secrets
    Production puede requerir manual approval

REGLAS:
  1. NUNCA secrets en código o .env committed
  2. Variables diferentes por entorno (DB URLs, API keys)
  3. Staging debe ser lo más parecido posible a production
  4. Preview usa staging DB (read-only) o DB efímera
  5. Production usa reviewers required para approval
```

```yaml
# Environments con approval en GitHub Actions
jobs:
  deploy-staging:
    environment: staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - run: npx sst deploy --stage staging

  deploy-production:
    environment: production  # Requiere approval manual configurado en GitHub
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: [deploy-staging]  # Solo después de staging
    steps:
      - run: npx sst deploy --stage prod
```

---

## Estrategias de Deploy

```
ROLLING (default en la mayoría de PaaS):
  Reemplaza instancias gradualmente.
  ✅ Simple, default en Vercel/ECS
  ❌ Breve periodo con versiones mixtas

BLUE/GREEN:
  Dos entornos idénticos. Deploy al inactivo, luego switch.
  ✅ Rollback instantáneo (switch back)
  ❌ Doble costo de infra durante deploy
  Se implementa con:
    - ALB target groups (AWS)
    - Weighted routing (Route53)

CANARY:
  Enviar X% del tráfico a la nueva versión.
  ✅ Detectar problemas con bajo impacto
  ❌ Más complejo de configurar
  Se implementa con:
    - ALB weighted target groups
    - Lambda aliases con weighted routing
    - CloudFront functions
```

---

## Rollback

```
REGLA: Todo deploy debe ser rollbackeable en < 5 minutos.

VERCEL:
  Dashboard → Deployments → Promote anterior a production
  O: vercel rollback (CLI)

AWS / SST:
  1. Re-deploy commit anterior:
     git revert HEAD && git push
     Pipeline re-deploya automáticamente
  
  2. SST rollback manual:
     npx sst deploy --stage prod  (desde commit anterior)

DOCKER / ECS:
  Usar image tags con commit SHA:
    app:abc1234 (current) → app:def5678 (rollback)
  ECS: Update service con task definition anterior

DATABASE ROLLBACK:
  ⚠️ Las migraciones de DB son forward-only
  Si el deploy incluye migración:
    - La nueva columna debe ser nullable/con default
    - El código anterior debe funcionar con el schema nuevo
    - Backward compatible migrations SIEMPRE
```

---

## Secrets en Pipelines

```
JERARQUÍA DE SECRETS:
  1. GitHub Secrets (per-environment) → CI/CD vars
  2. AWS Secrets Manager / SSM → Runtime secrets
  3. Vercel Environment Variables → PaaS runtime

REGLAS:
  ✅ Secrets diferentes por environment
  ✅ Rotar secrets periódicamente
  ✅ Audit log de acceso a secrets
  ✅ Least privilege: cada service solo accede a sus secrets
  
  ❌ NUNCA secrets en logs (enmascarar)
  ❌ NUNCA secrets en Docker image layers
  ❌ NUNCA el mismo secret en staging y production
  ❌ NUNCA access keys estáticos → usar OIDC para AWS
```

```yaml
# GitHub Secrets — acceso seguro
steps:
  - name: Deploy
    run: npx sst deploy --stage prod
    env:
      # Secrets inyectados como env vars
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      JWT_SECRET: ${{ secrets.JWT_SECRET }}
      # GitHub enmascara estos valores en logs automáticamente
```

---

## Monorepo — Deploy Selectivo

```yaml
# Solo deploy si cambiaron archivos del servicio
name: Deploy API

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'packages/shared/**'  # Dependencia compartida

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm --filter api deploy
```

```
MONOREPO TIPS:
  paths filter: solo triggerea si cambia el directorio relevante
  pnpm --filter: ejecutar comandos por paquete
  Turborepo: turbo run deploy --filter=api
  
  NO deployar todo en cada push → lentos y costoso
```

---

## Gotchas

- Nunca deploy manual (SSH + git pull). Todo deploy pasa por CI/CD con el pipeline completo.
- Todo pipeline necesita al menos lint + type check + unit tests antes de deploy. Sin tests = sin deploy.
- Staging y production deben usar branches separadas con promotion, nunca el mismo branch.
- Secrets nunca hardcodeados en código ni en `.env` committed. Usar GitHub Secrets por environment.
- Siempre incluir preview environments — sin ellos los reviewers no pueden probar cambios.
- Rollback debe tomar < 5 minutos. Si no tienes estrategia de rollback rápido, no estás listo para producción.
- Las migraciones de DB son forward-only. Toda migración debe ser backward compatible (columnas nullable/con default).
- AWS en CI usa OIDC exclusivamente. Access keys estáticos rotan y se filtran.
- Siempre configurar `concurrency` con `cancel-in-progress: true` y `timeout-minutes` en cada job.
- Nunca deploy directo a producción sin pasar por staging primero.
