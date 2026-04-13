---
name: compute
description: >
  Use this skill when you need to decide where to run code. Covers
  AWS Lambda, ECS Fargate, EC2, Vercel Functions/Edge. Includes decision
  trees by scale, latency, cost, complexity, and deploy patterns.
---

# Compute — Where the Code Runs

## Agent workflow

1. Identify the workload type (frontend/SSR, API, worker/cron).
2. Walk through the decision tree (section 1) with the user.
3. Review selection criteria and costs for the chosen option (section 2).
4. Verify against project constraints (budget, team, compliance).
5. If there is a conflict, propose alternatives from the same tree.

## 1. Decision tree

```
Is it frontend/SSR (Next.js)?
├── YES → Vercel (integrated deploy, edge network, zero-config)
│         Alternative: AWS Amplify, self-hosted on ECS
│
Is it an API/backend?
├── Requests < 15s and stateless?
│   ├── YES → AWS Lambda (serverless)
│   │         Alternative: Vercel Functions (if part of the Next.js monorepo)
│   │
│   └── NO → Needs persistent connections (WebSocket, DB pools)?
│            ├── YES → ECS Fargate (containers without EC2)
│            │         Alternative: EC2 if you need full control
│            └── NO → Processing > 15 min?
│                     ├── YES → AWS Step Functions + Lambda or ECS Tasks
│                     └── NO → Lambda with extended timeout (up to 15 min)
│
Is it a worker/job/cron?
├── Execution < 15 min → Lambda + EventBridge Scheduler
├── Long execution     → ECS Fargate Task (one-shot)
├── Simple cron        → EventBridge Scheduler → Lambda
└── Step pipeline      → Step Functions
```

## 2. Compute options

### AWS Lambda

**When to use:**
- Stateless REST/GraphQL APIs
- Webhooks and event handlers
- File processing (S3 triggers)
- Cron jobs < 15 min
- Variable traffic with spikes (auto-scales to 0)
- Minimal/low budget (pay only per execution)

**When NOT to use:**
- Persistent WebSockets required
- Unacceptable cold starts (< 100ms required constantly)
- Processing > 15 minutes
- Need > 10 GB of RAM
- Application with in-memory state

| Spec | Value |
|------|-------|
| Timeout | up to 15 min |
| RAM | 128 MB – 10,240 MB |
| /tmp | 512 MB – 10 GB |
| Concurrency | 1,000 by default (adjustable) |
| Cold start | ~200ms–1s (depends on runtime and size) |

**Estimated cost:**
- Free tier: 1M requests + 400,000 GB-s/month
- After: ~$0.20 per 1M requests + $0.0000166667/GB-s
- API with 100K req/month → practically free
- API with 10M req/month → ~$20–50/month

```yaml
# serverless.yml (Serverless Framework)
service: my-api

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  memorySize: 512
  timeout: 29  # API Gateway has a 30s limit
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
    timeout: 900  # 15 min for heavy processing
    memorySize: 1024
    events:
      - s3:
          bucket: uploads
          event: s3:ObjectCreated:*

  dailyReport:
    handler: dist/crons/dailyReport.handler
    events:
      - schedule:
          rate: cron(0 8 * * ? *)  # 8:00 AM UTC daily
```

### ECS Fargate

**When to use:**
- APIs needing persistent connections (DB pools, WebSocket)
- Applications with in-memory state (sessions, local cache)
- Constant and predictable traffic
- Long-running processes
- Container control needed (Docker)
- Multiple services communicating internally

**When NOT to use:**
- Highly variable traffic (you pay minimum for the running container)
- Minimal budget (floor of ~$30/month per task)
- Team without Docker/container experience

**Estimated cost:**
- 0.25 vCPU + 0.5 GB: ~$9/month (always on)
- 0.5 vCPU + 1 GB: ~$18/month
- 1 vCPU + 2 GB: ~$36/month
- With auto-scaling: scales from 1 to N tasks

```yaml
# Simplified Terraform example
resource "aws_ecs_service" "api" {
  name            = "api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2  # Minimum 2 for high availability
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

**When to use:**
- Next.js frontend (SSR, SSG, ISR) — native integration
- Lightweight API Routes (part of the Next.js monorepo)
- Automatic preview deployments per PR
- Edge Functions (geolocation, A/B testing, redirects)
- Small team that doesn't want to manage infra

**When NOT to use:**
- Heavy backend (better Lambda or ECS)
- AWS private VPC access required
- Functions > 300s (Pro) / 60s (Hobby)
- CPU-intensive processing

**Plans:**
- Hobby: free (personal use)
- Pro: $20/dev/month (commercial — plan for real projects)
- Enterprise: custom pricing

### EC2

**When to use:**
- Full OS control required
- Software that requires GPU
- Legacy applications not containerized
- Compliance that requires a dedicated server

**When NOT to use:**
- Almost always — prefer Lambda or Fargate
- Team without server administration experience

EC2 is the last resort, not the first instinct.

## 3. Deploy patterns

### Frontend (Next.js)

- **Vercel (recommended):** git push → build → automatic deploy. Preview per PR, instant rollback.
- **AWS Amplify:** similar to Vercel within the AWS ecosystem. Useful if everything is already on AWS.
- **Self-hosted on ECS:** Docker + Next.js standalone output. Only if you need private VPC access.

### Backend (API)

- **Lambda:** GitHub Actions → build → deploy with Serverless Framework or SST. Reference: `basic-workflows` skill for CI checks.
- **ECS Fargate:** GitHub Actions → build Docker image → push to ECR → update ECS service. Blue/green deployment with CodeDeploy.

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

## 4. Comparison table

| Criterion | Lambda | ECS Fargate | Vercel | EC2 |
|-----------|--------|-------------|--------|-----|
| Scale to 0 | Yes | No | Yes | No |
| Cold starts | ~200ms–1s | None | ~50ms (edge) | None |
| Max timeout | 15 min | ∞ | 5 min (Pro) | ∞ |
| WebSockets | No (via API GW) | Yes | No | Yes |
| Minimum cost | ~$0 | ~$30/month | $0–$20/month | ~$9/month |
| Ops complexity | Low | Medium | Minimal | High |
| Docker | Not needed | Required | Not needed | Optional |

## 5. Gotchas

- Choosing EC2 by default "because it’s what I know" — evaluate Lambda or Fargate first.
- Lambda for everything (WebSockets, long processes, stateful apps) — each service has its use case.
- ECS for simple stateless APIs is overkill — use Lambda.
- Vercel is not for heavy backend — use Lambda or ECS.
- Lambda with VPC when not needed adds significant cold start (~1-5s extra).
- A single container without auto-scaling or health checks is not production.
- Manual deploy via SSH to EC2 is not acceptable — use CI/CD.
