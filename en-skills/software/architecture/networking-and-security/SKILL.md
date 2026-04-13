---
name: networking-and-security
description: >
  Use this skill when you need to configure networking and security on AWS.
  Covers VPC, subnets, security groups, WAF, API Gateway, secrets management,
  IAM least privilege, SSL, and DDoS protection. All infrastructure must be
  secure by default.
---

# Networking & Security — Networks, Access, and Protection

## Agent workflow

1. Determine the project type and which services need a private network.
2. Walk through the networking tree (section 1) to decide if VPC is needed.
3. Configure security groups, secrets, and IAM per service (sections 3-6).
4. Evaluate WAF and SSL based on public exposure (sections 7-8).
5. Validate against the security checklist (section 9) before closing.

> Security is not a layer you add later — it is the foundation on which
> everything else is built. Every cloud resource is born private and is exposed
> explicitly only as needed.

## 1. Decision tree — Networking

```
What type of project?
│
├── Frontend on Vercel + Serverless backend (Lambda)
│   └── Do you need access to a private DB?
│       ├── YES → VPC + RDS in private subnet + Lambda in VPC
│       │         + NAT Gateway (caution: $32/month per NAT)
│       └── NO → No VPC (vanilla Lambda + DynamoDB or external DB)
│
├── Backend on ECS Fargate
│   └── VPC mandatory
│       ├── Public subnets: ALB (load balancer)
│       ├── Private subnets: ECS tasks, RDS
│       └── NAT Gateway: so private subnets can access the internet
│
├── Fully serverless (Lambda + DynamoDB + S3)
│   └── No VPC needed (access via IAM roles)
│       ✅ Simpler, cheaper, fewer cold starts
│
└── Hybrid (some services in VPC, others not)
    └── VPC Endpoints to access S3, DynamoDB, etc.
        without going through the internet (PrivateLink)
```

## 2. VPC — Virtual Private Cloud

**When to use:**
- RDS PostgreSQL/MySQL (always in private subnet)
- ElastiCache Redis (always in private subnet)
- ECS Fargate tasks
- OpenSearch (always in private subnet)
- EC2 instances

**When NOT to use:**
- Only Lambda + DynamoDB + S3 → IAM is enough
- Minimal budget ($0–$50) → avoid NAT Gateway ($32/month)
- Hobby/prototype project → use external services (Neon, Supabase)

### Standard VPC architecture

```
VPC: 10.0.0.0/16
│
├── Public Subnets (2 AZs minimum for HA)
│   ├── 10.0.1.0/24 (AZ-a) → ALB, NAT Gateway, Bastion (if applicable)
│   └── 10.0.2.0/24 (AZ-b) → ALB, NAT Gateway
│
├── Private Subnets (2 AZs minimum)
│   ├── 10.0.10.0/24 (AZ-a) → ECS tasks, Lambda, app servers
│   └── 10.0.20.0/24 (AZ-b) → ECS tasks, Lambda, app servers
│
└── Isolated Subnets (2 AZs minimum)
    ├── 10.0.100.0/24 (AZ-a) → RDS, ElastiCache (no internet)
    └── 10.0.200.0/24 (AZ-b) → RDS, ElastiCache (no internet)
```

```hcl
# Terraform — Simplified VPC with official module
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "myapp-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.20.0/24"]
  # database_subnets for RDS/ElastiCache
  database_subnets = ["10.0.100.0/24", "10.0.200.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true  # To save ($32/month instead of $64)
  # In high-availability production: one_nat_gateway_per_az = true

  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Environment = var.environment }
}
```

## 3. Security groups

Golden rule: DENY ALL by default, open only what's necessary.

- **ALB:** Inbound 443 (HTTPS) from 0.0.0.0/0. Outbound: app port toward app SG.
- **App (ECS/Lambda):** Inbound app port ONLY from ALB SG. Outbound: 443 toward internet, DB port toward DB SG.
- **DB:** Inbound 5432 (Postgres) / 3306 (MySQL) ONLY from app SG. Outbound: none.
- **Redis:** Inbound 6379 ONLY from app SG. Outbound: none.

```hcl
resource "aws_security_group" "db" {
  name_prefix = "db-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "PostgreSQL from app only"
  }

  # No egress rules = deny all outbound (good for DB)

  tags = { Name = "db-sg" }
}
```

## 4. API Gateway

### When to Use

```
How do you expose your API to the world?
│
├── Lambda backend
│   ├── Simple/REST API → API Gateway HTTP API ($1/million requests)
│   ├── API with auth, throttling, caching → API Gateway REST API ($3.50/million)
│   └── WebSocket → API Gateway WebSocket API
│
├── ECS backend
│   └── Application Load Balancer (ALB) — $16/month + $0.008/LCU-hour
│       API Gateway not needed (ALB handles routing)
│
└── Vercel frontend with API routes
    └── Vercel handles it automatically
```

## 5. Secrets management

### Decision Tree

```
Where to store secrets?
│
├── Environment variables in CI/CD (GitHub Actions secrets)
│   └── For values only needed by the pipeline
│
├── AWS SSM Parameter Store
│   └── Config parameters and simple secrets
│       ✅ Free (Standard tier)
│       ✅ Native integration with Lambda, ECS
│       ❌ No automatic rotation
│
├── AWS Secrets Manager
│   └── Secrets that need automatic rotation
│       ✅ Automatic rotation (DB passwords, API keys)
│       ❌ $0.40/secret/month + $0.05 per 10K API calls
│
└── .env files
    └── ONLY in local development
        ❌ NEVER in production
        ❌ NEVER commit to the repository
```

### Usage Reference

```typescript
// Lambda — read secret from SSM (cached)
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const ssm = new SSMClient({});
const cache = new Map<string, string>();

async function getSecret(name: string): Promise<string> {
  if (cache.has(name)) return cache.get(name)!;

  const response = await ssm.send(
    new GetParameterCommand({ Name: name, WithDecryption: true })
  );
  const value = response.Parameter!.Value!;
  cache.set(name, value);
  return value;
}

// Usage
const dbUrl = await getSecret('/myapp/prod/database-url');
```

```yaml
# serverless.yml — secrets from SSM
provider:
  environment:
    DATABASE_URL: ${ssm:/myapp/${sls:stage}/database-url}
    STRIPE_SECRET: ${ssm:/myapp/${sls:stage}/stripe-secret}
```

## 6. IAM — Least privilege

Each service receives ONLY the permissions it needs. NEVER use AdministratorAccess or `*` in production.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::myapp-uploads/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789:table/myapp-items"
    }
  ]
}
```

### Deploy roles (GitHub Actions → AWS)

Use OIDC federation, NOT static access keys. GitHub Actions assumes an IAM Role via OIDC: no AWS secrets in GitHub, credentials rotate automatically, scope limited to the repository.

```hcl
# Terraform — OIDC provider for GitHub Actions
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "github_deploy" {
  name = "github-actions-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:myorg/myrepo:*"
        }
      }
    }]
  })
}
```

## 7. WAF — Web Application Firewall

**When to use:**
- Public API exposed to the internet
- E-commerce / marketplace (PCI compliance)
- Applications with sensitive data
- Protection against bots, SQL injection, XSS

**When NOT to use:**
- Internal APIs only accessible from VPC
- Minimal budget ($6/month per web ACL + $0.60/million requests)

**Minimum recommended rules:** AWSManagedRulesCommonRuleSet (OWASP top 10), AWSManagedRulesKnownBadInputsRuleSet, AWSManagedRulesSQLiRuleSet, rate limiting (e.g.: 2000 requests/5 min per IP).

## 8. SSL/TLS

HTTPS is mandatory, no exceptions.

- **Frontend on Vercel:** automatic SSL included.
- **CloudFront + custom domain:** ACM (FREE certificates), must be in us-east-1 for CloudFront.
- **ALB + custom domain:** ACM certificate in the ALB's region, automatic renewal.
- **API Gateway:** compatible with ACM custom domain.

## 9. Security checklist

- [ ] All S3 buckets with public access blocked
- [ ] DB in private subnet, not accessible from the internet
- [ ] Secrets in SSM/Secrets Manager, not in code or .env in prod
- [ ] IAM roles with least privilege (no `*` or AdministratorAccess)
- [ ] HTTPS everywhere (redirect HTTP → HTTPS)
- [ ] Security groups: deny all by default
- [ ] OIDC for CI/CD (no static access keys)
- [ ] WAF on public endpoints (if budget allows)
- [ ] Encryption at rest enabled (S3, RDS, ElastiCache)
- [ ] Encryption in transit (TLS 1.2+)
- [ ] CloudTrail enabled (audit log of AWS actions)
- [ ] MFA on AWS root account
- [ ] Do not use root account for daily operations

## 10. Gotchas

- DB accessible from the internet (0.0.0.0/0 in security group) — always private subnet.
- Secrets hardcoded in code or environment variables in repositories.
- IAM with Action `*` or Resource `*` — use least privilege.
- Static access keys for CI/CD — use OIDC.
- HTTP without redirect to HTTPS.
- VPC when not needed — Lambda + DynamoDB doesn't need VPC.
- NAT Gateway in dev/staging when not necessary — $32/month minimum.
- A single security group for everything ("all traffic" between services).
- Bastion host as primary access method — use SSM Session Manager.
- Not enabling CloudTrail.
