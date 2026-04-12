---
name: cost-and-scaling
description: >
  Decision framework for cost optimization and scaling strategies.
  Covers cost estimation by tier, savings with Reserved Instances and Savings Plans,
  auto-scaling, AWS Budgets, spend alerts, and cost anti-patterns. Budget
  is a cross-cutting constraint — this skill validates that the proposed architecture
  is viable within the project's budget.
---

# 💰 Cost & Scaling — Cost Optimization and Scaling

## Principle

> **Budget is not a suggestion — it is a design constraint.**
> Every architectural decision goes through the cost filter. There is no
> "best" architecture if it doesn't fit within the budget.

---

## Cost Estimation by Tier

### Tier: Minimal ($0–$50/month)

```
Ideal for: MVP, hobby, side project, prototype

Typical stack:
  ├── Frontend: Vercel Hobby (free)
  ├── Backend: Lambda free tier (1M req/month)
  ├── DB: Neon free tier or Supabase free or DynamoDB free tier
  ├── Storage: S3 (5 GB free tier)
  ├── CDN: CloudFront (1 TB free tier)
  ├── Cache: Upstash Redis free tier
  ├── Monitoring: CloudWatch (included) + Sentry free
  └── CI/CD: GitHub Actions (2,000 min/month free)

Total cost: $0–$20/month
Limitations:
  - No custom domain with SSL on some free tiers
  - Limited throughput
  - No HA (single AZ, no failover)
  - No support
```

### Tier: Low ($50–$300/month)

```
Ideal for: Early stage startup, app with first users

Typical stack:
  ├── Frontend: Vercel Pro ($20/dev/month)              = $20–60
  ├── Backend: Lambda (beyond free tier)                 = $5–20
  ├── DB: Neon Pro ($19) or RDS t4g.micro ($13)         = $13–25
  ├── Storage: S3 (< 50 GB)                             = $2–5
  ├── CDN: CloudFront (< 100 GB transfer)               = $5–10
  ├── Cache: Upstash Pro ($10) if needed                 = $0–10
  ├── Monitoring: CloudWatch + Sentry Team ($26)         = $26–30
  ├── CI/CD: GitHub Actions (free or Team $4/user)       = $0–20
  └── DNS: Route53 ($0.50/zone + queries)                = $1–3

Total cost: $70–180/month
Benefits vs Minimal:
  + Custom domains
  + More throughput
  + Automatic DB backups
  + Professional error tracking
```

### Tier: Medium ($300–$1,500/month)

```
Ideal for: Startup with traction, SaaS with paying customers

Typical stack:
  ├── Frontend: Vercel Pro ($20/dev × 3)                 = $60
  ├── Backend: Lambda or ECS Fargate (1-2 tasks)         = $50–100
  ├── DB: RDS t4g.small Multi-AZ ($52)                   = $52–105
  ├── Cache: ElastiCache t4g.micro ($12)                 = $12–24
  ├── Storage: S3 (100–500 GB) + CloudFront              = $20–60
  ├── Networking: NAT Gateway (if VPC)                   = $32
  ├── Monitoring: CloudWatch + Sentry Pro + X-Ray        = $50–100
  ├── Security: WAF ($6 + rules)                         = $10–30
  ├── CI/CD: GitHub Team + Actions                       = $20–40
  └── DNS + Certificates                                 = $5

Total cost: $300–600/month
Benefits vs Low:
  + High availability (Multi-AZ)
  + Cache for performance
  + WAF for security
  + Distributed tracing
```

### Tier: High ($1,500–$5,000/month)

```
Ideal for: Established company, SaaS with real scale

Typical stack:
  ├── Frontend: Vercel Pro ($20/dev × 5-10)              = $100–200
  ├── Backend: ECS Fargate (2-4 tasks auto-scaling)      = $150–400
  ├── DB: RDS r6g.large Multi-AZ + Read Replica          = $350–500
  ├── Cache: ElastiCache t4g.small cluster               = $50–100
  ├── Storage: S3 (1 TB+) + global CloudFront            = $50–150
  ├── Search: OpenSearch (if needed)                     = $100–300
  ├── Messaging: SQS + EventBridge                       = $10–30
  ├── Networking: NAT Gateway × 2 AZ                     = $64
  ├── Monitoring: Datadog ($15/host × N)                 = $100–300
  ├── Security: WAF + Shield                             = $30–50
  └── CI/CD: GitHub Enterprise + Actions                 = $50–100

Total cost: $1,500–3,000/month
```

---

## Savings Strategies

### 1. Serverless First (Savings: 50-80% vs always-on)

```
Lambda + API Gateway + DynamoDB + S3

Benefit: you ONLY pay for what you use.
If you have 0 requests at 3 AM → you pay $0.

Decision threshold:
  - < 3M requests/month → Lambda is cheaper than Fargate
  - > 3M requests/month → evaluate Fargate (can be more efficient)
  - Constant high traffic → Fargate with Savings Plans
```

### 2. Reserved Instances / Savings Plans

```
For CONSTANT workloads that won't change in 1-3 years:

RDS Reserved Instances:
  - 1 year, no upfront: ~30% savings
  - 1 year, all upfront: ~40% savings
  - 3 years, all upfront: ~60% savings

Compute Savings Plans:
  - Covers: Lambda, Fargate, EC2
  - 1 year: ~30% savings
  - 3 years: ~50% savings

When to buy:
  ✅ After 3+ months of stable usage (real consumption data)
  ❌ NEVER at the start — first understand your usage patterns
  ❌ NEVER for workloads that might disappear
```

### 3. Right-sizing

```
Rule: review sizing every 3 months.

DB:
  - Average CPU < 20% → downgrade tier
  - Average CPU > 70% → upgrade tier
  - Free memory > 50% → possibly over-provisioned

ECS Tasks:
  - CPU utilization < 30% average → reduce vCPU/Memory
  - Use Fargate Spot for non-critical tasks (70% savings)

Lambda:
  - Use Power Tuning to find the memory sweet spot
    (more memory = more CPU = faster execution = can be cheaper)
  - AWS Lambda Power Tuning: official tool for this
```

### 4. Storage Lifecycle

```
Configure lifecycle policies on S3 (reference: storage-and-cdn skill):
  - Standard → Standard-IA at 30-90 days
  - Standard-IA → Glacier at 365 days
  - Delete temporary files automatically

Potential savings: 40-90% on old files
```

### 5. NAT Gateway Optimization

```
NAT Gateway = $32/month + $0.045/GB processed
It's one of the sneakiest expenses in AWS.

Options to reduce:
  1. Single NAT Gateway (instead of one per AZ): $32 vs $64
     Risk: if the NAT's AZ goes down, private subnets lose internet
  2. VPC Endpoints for S3/DynamoDB: traffic doesn't go through NAT ($0)
  3. NAT Instance: EC2 t4g.nano (~$3/month) — but you manage it
  4. No VPC: if you can avoid it (Lambda + DynamoDB without VPC)
```

---

## Auto-Scaling

### Lambda

```
Native auto-scaling — you don't need to configure anything.
Scales from 0 to 1,000 (default) concurrent automatically.

Configurations:
  - Reserved Concurrency: guarantees capacity for critical functions
  - Provisioned Concurrency: pre-warmed to avoid cold starts
    ($$$: you pay for reserved capacity even without usage)

When to enable Provisioned Concurrency:
  ✅ Time-sensitive API where cold starts are unacceptable
  ❌ Everything else (200ms cold start is acceptable for most)
```

### ECS Fargate

```yaml
# Terraform — ECS Auto-scaling
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = 10
  min_capacity       = 2  # Minimum 2 for HA
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

```
Storage auto-scaling:
  - Configure max_allocated_storage
  - Expands automatically when storage > 90%

Read Replicas to scale reads:
  - When: read-heavy workload (analytics, searches)
  - How: app routing read queries to replica
  - Cost: same as the primary instance
```

---

## AWS Budgets and Alerts

```hcl
# Terraform — Budget with alerts
resource "aws_budgets_budget" "monthly" {
  name         = "monthly-budget"
  budget_type  = "COST"
  limit_amount = "300"  # $300/month
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80  # Alert at 80% of budget
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["team@company.com"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100  # Alert at 100% of budget
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["team@company.com"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100  # Alert if FORECAST exceeds budget
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["team@company.com"]
  }
}
```

### Cost Control Checklist

```
☐ AWS Budgets configured with alerts at 80% and 100%
☐ Cost Explorer enabled (review weekly)
☐ Tags on all resources (Environment, Service, Owner)
☐ Lifecycle policies on S3
☐ Log retention configured (not indefinite)
☐ Dev/Staging shut down outside working hours (or with smaller instances)
☐ Reserved Instances evaluated after 3 stable months
☐ Right-sizing review quarterly
☐ Unused resources cleaned up (AMIs, snapshots, unassociated EIPs)
☐ NAT Gateway justified (or removed if not necessary)
```

---

## IaC Tool — Decision

```
The agent recommends IaC based on the team and project:

Team's IaC experience?
│
├── None + serverless project
│   ├── SST (Serverless Stack) → Superior developer experience for
│   │   serverless on AWS. Native TypeScript. Live Lambda development.
│   └── Serverless Framework → More mature, more docs, more plugins
│
├── Basic/Intermediate + mixed project (serverless + containers + DB)
│   └── Terraform → Industry standard, multi-cloud ready
│       With official AWS modules (VPC, ECS, RDS...)
│       HCL is simpler than CloudFormation YAML
│
├── Advanced + TypeScript team
│   └── AWS CDK → Infrastructure as actual TypeScript code
│       Type-safe, composable constructs
│       Compiles to CloudFormation
│
└── They already have something
    └── Keep what they have. Migrating IaC has a high cost.

RULE: the agent proposes the tool and justifies. Does not assume.
```

---

## Scaling by Product Phase

```
PHASE 1: MVP (0–100 users)
  → Pure serverless: Lambda + DynamoDB/Neon + S3 + Vercel
  → $0–50/month
  → Focus on development speed, not on infra

PHASE 2: Product-Market Fit (100–1,000 users)
  → Serverless with more services: add Redis, SQS, Sentry
  → Consider RDS if you need SQL
  → $50–300/month
  → Focus on reliability and monitoring

PHASE 3: Growth (1,000–10,000 users)
  → Evaluate Fargate if Lambda hits limits
  → Multi-AZ for HA
  → Global CDN, aggressive caching
  → $300–1,500/month
  → Focus on performance and scalability

PHASE 4: Scale (10,000+ users)
  → Auto-scaling on everything
  → Read replicas, distributed cache
  → Possible microservices for key domains
  → Reserved Instances/Savings Plans
  → $1,500+/month
  → Focus on cost optimization and resilience
```

---

## Anti-patterns

```
❌ Over-provisioning "just in case" → right-size based on real data
❌ Reserved Instances on day 1 → wait 3+ months of data
❌ NAT Gateway without need → $384/year minimum for nothing
❌ RDS Multi-AZ in dev/staging → $0 benefit, double cost
❌ Logs without retention → grows indefinitely
❌ ECS tasks with more CPU/RAM than needed → review metrics
❌ Lambda with Provisioned Concurrency for non time-sensitive APIs
❌ A single environment (prod) without staging → untested changes
❌ Not using tags → you can't know which service spends what
❌ Free tier mentality in production → limits cause outages
❌ Kubernetes for 2 services → brutal complexity without benefit
❌ Microservices for an MVP → organizational and technical overhead
❌ Ignoring storage of old snapshots/backups
```
