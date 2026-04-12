---
name: deploy-pipelines
description: >
  Deployment pipelines for Node.js/TypeScript applications. Covers
  deploy to Vercel and AWS (CDK/SST), preview environments, blue/green
  and canary strategies, rollback, environment management (dev/staging/prod),
  GitHub Actions as CI/CD, and secrets management in pipelines.
  Complements basic-workflows (dev workflow) and architecture (infrastructure).
---

# 🚀 Deploy Pipelines — Deployment and Environments

## Principle

> **If the deploy isn't automatic, it isn't reliable.**
> Every push to main must be able to reach production without manual
> intervention. Safe deploys are automated, repeatable, and reversible deploys.

---

## Scope

```
✅ This skill covers:
  - GitHub Actions for CI/CD
  - Deploy to Vercel (frontend + serverless)
  - Deploy to AWS (CDK/SST)
  - Preview environments
  - Blue/green, canary, rollback
  - Environment and secrets management
  - Pipeline stages (lint → test → build → deploy)

❌ Does NOT cover:
  - Detailed AWS infrastructure → architecture/*
  - Docker builds → docker
  - Git workflow (branching) → git-usage
  - Tests (what to test) → backend/testing, frontend testing skills
```

---

## Pipeline Stages — Required Order

```
Every pipeline follows this flow:

  1. INSTALL     → pnpm install --frozen-lockfile
  2. LINT        → eslint + prettier check
  3. TYPE CHECK  → tsc --noEmit
  4. TEST        → vitest run
  5. BUILD       → pnpm build
  6. DEPLOY      → to the corresponding environment

RULES:
  - If a stage fails, abort. Don't deploy broken code.
  - Each stage must be independent and cacheable.
  - Build artifacts are passed between stages, not rebuilt.
```

---

## GitHub Actions — Base CI Pipeline

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
  cancel-in-progress: true  # Cancel previous runs for the same PR

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

## Deploy to Vercel

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
    needs: [ci]  # Only if CI passes

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          # Production only on push to main
          vercel-args: ${{ github.event_name == 'push' && '--prod' || '' }}
```

```
VERCEL — TYPICAL FLOW:
  PR opened      → Preview deployment (unique URL per PR)
  PR merged      → Production deployment
  
CONFIGURATION:
  vercel.json for overrides
  Environment variables in Vercel dashboard (per-environment)
  
WHEN TO USE VERCEL:
  ✅ Next.js / frontend
  ✅ Serverless API routes
  ✅ Projects with limited infra budget
  
WHEN NOT TO:
  ❌ Backend with long-running processes
  ❌ Persistent WebSockets
  ❌ Complex workers / cron jobs
  → Use AWS
```

---

## Deploy to AWS with SST

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
      id-token: write   # For OIDC
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

      # AWS credentials via OIDC (NOT access keys)
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
SST/CDK — TYPICAL FLOW:
  push to develop → Deploy to staging
  push to main    → Deploy to production
  
AWS AUTH IN CI:
  ✅ OIDC (OpenID Connect) → no static secrets
  ❌ Access keys in secrets → they rotate, they leak
  
  Configure in AWS IAM:
    1. Identity Provider → GitHub Actions
    2. Role with trust policy for your repo
    3. Minimum necessary permissions
```

---

## Preview Environments

```yaml
# PR Preview — Ephemeral environment per PR
name: Preview Environment

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Option 1: Vercel (automatic with GitHub integration)
      # No config needed — Vercel creates preview by default
      
      # Option 2: SST with per-PR stage
      - name: Deploy preview
        run: npx sst deploy --stage pr-${{ github.event.pull_request.number }}
      
      # Option 3: Docker + preview service
      - name: Deploy to preview
        run: |
          docker build -t app:pr-${{ github.event.pull_request.number }} .
          # Push to ECR and deploy to ECS with specific task

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
  ✅ Each PR has its own URL
  ✅ QA can test before merge
  ✅ Stakeholders can see changes
  
  CLEANUP:
    Destroy preview when PR is closed/merged
    on: pull_request: types: [closed]
    → npx sst remove --stage pr-${{ PR_NUMBER }}
```

---

## Environment Management

```
STANDARD ENVIRONMENTS:
  local       → docker compose up (no pipeline)
  preview     → ephemeral per PR
  staging     → push to develop (production replica)
  production  → push to main (or manual approval)

ENVIRONMENT VARIABLES PER STAGE:
  .env.local        → git-ignored, per developer
  .env.example      → committed, template
  
  CI/CD secrets:
    GitHub Secrets → per environment
    Settings → Environments → staging/production
    Each environment has its own secrets
    Production can require manual approval

RULES:
  1. NEVER secrets in code or committed .env
  2. Different variables per environment (DB URLs, API keys)
  3. Staging must be as similar to production as possible
  4. Preview uses staging DB (read-only) or ephemeral DB
  5. Production uses reviewers required for approval
```

```yaml
# Environments with approval in GitHub Actions
jobs:
  deploy-staging:
    environment: staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - run: npx sst deploy --stage staging

  deploy-production:
    environment: production  # Requires manual approval configured in GitHub
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: [deploy-staging]  # Only after staging
    steps:
      - run: npx sst deploy --stage prod
```

---

## Deploy Strategies

```
ROLLING (default in most PaaS):
  Replaces instances gradually.
  ✅ Simple, default in Vercel/ECS
  ❌ Brief period with mixed versions

BLUE/GREEN:
  Two identical environments. Deploy to the inactive one, then switch.
  ✅ Instant rollback (switch back)
  ❌ Double infra cost during deploy
  Implemented with:
    - ALB target groups (AWS)
    - Weighted routing (Route53)

CANARY:
  Send X% of traffic to the new version.
  ✅ Detect problems with low impact
  ❌ More complex to configure
  Implemented with:
    - ALB weighted target groups
    - Lambda aliases with weighted routing
    - CloudFront functions
```

---

## Rollback

```
RULE: Every deploy must be rollbackeable in < 5 minutes.

VERCEL:
  Dashboard → Deployments → Promote previous to production
  Or: vercel rollback (CLI)

AWS / SST:
  1. Re-deploy previous commit:
     git revert HEAD && git push
     Pipeline re-deploys automatically
  
  2. Manual SST rollback:
     npx sst deploy --stage prod  (from previous commit)

DOCKER / ECS:
  Use image tags with commit SHA:
    app:abc1234 (current) → app:def5678 (rollback)
  ECS: Update service with previous task definition

DATABASE ROLLBACK:
  ⚠️ DB migrations are forward-only
  If the deploy includes a migration:
    - The new column must be nullable/with default
    - The previous code must work with the new schema
    - Backward compatible migrations ALWAYS
```

---

## Secrets in Pipelines

```
SECRETS HIERARCHY:
  1. GitHub Secrets (per-environment) → CI/CD vars
  2. AWS Secrets Manager / SSM → Runtime secrets
  3. Vercel Environment Variables → PaaS runtime

RULES:
  ✅ Different secrets per environment
  ✅ Rotate secrets periodically
  ✅ Audit log for secret access
  ✅ Least privilege: each service only accesses its own secrets
  
  ❌ NEVER secrets in logs (mask them)
  ❌ NEVER secrets in Docker image layers
  ❌ NEVER the same secret in staging and production
  ❌ NEVER static access keys → use OIDC for AWS
```

```yaml
# GitHub Secrets — secure access
steps:
  - name: Deploy
    run: npx sst deploy --stage prod
    env:
      # Secrets injected as env vars
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      JWT_SECRET: ${{ secrets.JWT_SECRET }}
      # GitHub masks these values in logs automatically
```

---

## Monorepo — Selective Deploy

```yaml
# Only deploy if files in the service changed
name: Deploy API

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'packages/shared/**'  # Shared dependency

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm --filter api deploy
```

```
MONOREPO TIPS:
  paths filter: only triggers if the relevant directory changes
  pnpm --filter: run commands per package
  Turborepo: turbo run deploy --filter=api
  
  DON'T deploy everything on every push → slow and expensive
```

---

## Anti-patterns

```
❌ Manual deploy (SSH + git pull) → automate with CI/CD
❌ Deploy without tests → at least lint + type check + unit tests
❌ Same branch for staging and prod → separate branches with promotion
❌ Hardcoded secrets → GitHub Secrets + environment separation
❌ No preview environments → reviewers can't test
❌ Rollback that takes > 5 min → always have a fast strategy
❌ Destructive migrations in deploy → backward compatible always
❌ Static access keys in CI → OIDC for AWS
❌ Deploy without concurrency control → cancel previous deploys
❌ No timeout on jobs → a hung job blocks the pipeline
❌ Deploy to prod without going through staging → always staging first
```
