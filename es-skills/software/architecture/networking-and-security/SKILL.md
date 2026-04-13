---
name: networking-and-security
description: >
  Usa esta skill cuando necesites configurar networking y seguridad en AWS.
  Cubre VPC, subnets, security groups, WAF, API Gateway, secrets management,
  IAM least privilege, SSL y protección DDoS. Toda infraestructura debe ser
  segura por defecto.
---

# Networking & Security — Redes, Accesos y Protección

## Flujo de trabajo del agente

1. Determinar el tipo de proyecto y qué servicios necesitan red privada.
2. Recorrer el árbol de networking (sección 1) para decidir si se necesita VPC.
3. Configurar security groups, secrets e IAM según el servicio (secciones 3-6).
4. Evaluar WAF y SSL según exposición pública (secciones 7-8).
5. Validar contra el checklist de seguridad (sección 9) antes de cerrar.

> La seguridad no es una capa que se agrega después — es la base sobre la que
> se construye todo lo demás. Cada recurso cloud nace privado y se expone
> explícitamente solo lo necesario.

## 1. Árbol de decisión — Networking

```
¿Qué tipo de proyecto?
│
├── Frontend en Vercel + Backend serverless (Lambda)
│   └── ¿Necesitas acceso a DB privada?
│       ├── SÍ → VPC + RDS en private subnet + Lambda en VPC
│       │        + NAT Gateway (cuidado: $32/mes por NAT)
│       └── NO → Sin VPC (Lambda vanilla + DynamoDB o DB externa)
│
├── Backend en ECS Fargate
│   └── VPC obligatorio
│       ├── Public subnets: ALB (load balancer)
│       ├── Private subnets: ECS tasks, RDS
│       └── NAT Gateway: para que private subnets accedan a internet
│
├── Todo serverless (Lambda + DynamoDB + S3)
│   └── Sin VPC necesario (acceso vía IAM roles)
│       ✅ Más simple, más barato, menos cold starts
│
└── Híbrido (algunos servicios en VPC, otros no)
    └── VPC Endpoints para acceder a S3, DynamoDB, etc.
        sin pasar por internet (PrivateLink)
```

## 2. VPC — Virtual Private Cloud

**Cuándo usarlo:**
- RDS PostgreSQL/MySQL (siempre en private subnet)
- ElastiCache Redis (siempre en private subnet)
- ECS Fargate tasks
- OpenSearch (siempre en private subnet)
- EC2 instances

**Cuándo NO usarlo:**
- Solo Lambda + DynamoDB + S3 → IAM es suficiente
- Presupuesto mínimo ($0–$50) → evitar NAT Gateway ($32/mes)
- Proyecto hobby/prototipo → usar servicios externos (Neon, Supabase)

### Arquitectura de VPC estándar

```
VPC: 10.0.0.0/16
│
├── Public Subnets (2 AZs mínimo para HA)
│   ├── 10.0.1.0/24 (AZ-a) → ALB, NAT Gateway, Bastion (si aplica)
│   └── 10.0.2.0/24 (AZ-b) → ALB, NAT Gateway
│
├── Private Subnets (2 AZs mínimo)
│   ├── 10.0.10.0/24 (AZ-a) → ECS tasks, Lambda, app servers
│   └── 10.0.20.0/24 (AZ-b) → ECS tasks, Lambda, app servers
│
└── Isolated Subnets (2 AZs mínimo)
    ├── 10.0.100.0/24 (AZ-a) → RDS, ElastiCache (sin internet)
    └── 10.0.200.0/24 (AZ-b) → RDS, ElastiCache (sin internet)
```

```hcl
# Terraform — VPC simplificada con módulo oficial
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "myapp-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.20.0/24"]
  # database_subnets para RDS/ElastiCache
  database_subnets = ["10.0.100.0/24", "10.0.200.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true  # Para ahorrar ($32/mes en vez de $64)
  # En producción high-availability: one_nat_gateway_per_az = true

  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Environment = var.environment }
}
```

## 3. Security groups

Regla de oro: DENY ALL por defecto, abrir solo lo necesario.

- **ALB:** Inbound 443 (HTTPS) desde 0.0.0.0/0. Outbound: puerto de la app hacia app SG.
- **App (ECS/Lambda):** Inbound puerto de la app SOLO desde ALB SG. Outbound: 443 hacia internet, puerto DB hacia DB SG.
- **DB:** Inbound 5432 (Postgres) / 3306 (MySQL) SOLO desde app SG. Outbound: ninguno.
- **Redis:** Inbound 6379 SOLO desde app SG. Outbound: ninguno.

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

### Cuándo Usar

```
¿Cómo expones tu API al mundo?
│
├── Lambda backend
│   ├── API simple/REST → API Gateway HTTP API ($1/million requests)
│   ├── API con auth, throttling, caching → API Gateway REST API ($3.50/million)
│   └── WebSocket → API Gateway WebSocket API
│
├── ECS backend
│   └── Application Load Balancer (ALB) — $16/mes + $0.008/LCU-hour
│       API Gateway no necesario (ALB hace routing)
│
└── Vercel frontend con API routes
    └── Vercel lo maneja automáticamente
```

## 5. Secrets management

### Árbol de Decisión

```
¿Dónde guardar secrets?
│
├── Variables de entorno en CI/CD (GitHub Actions secrets)
│   └── Para valores que solo necesita el pipeline
│
├── AWS SSM Parameter Store
│   └── Parámetros de config y secrets simples
│       ✅ Gratis (Standard tier)
│       ✅ Integración nativa con Lambda, ECS
│       ❌ Sin rotación automática
│
├── AWS Secrets Manager
│   └── Secrets que necesitan rotación automática
│       ✅ Rotación automática (DB passwords, API keys)
│       ❌ $0.40/secret/mes + $0.05 per 10K API calls
│
└── .env files
    └── SOLO en desarrollo local
        ❌ NUNCA en producción
        ❌ NUNCA commitear al repositorio
```

### Referencia de Uso

```typescript
// Lambda — leer secret desde SSM (cacheado)
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

// Uso
const dbUrl = await getSecret('/myapp/prod/database-url');
```

```yaml
# serverless.yml — secrets desde SSM
provider:
  environment:
    DATABASE_URL: ${ssm:/myapp/${sls:stage}/database-url}
    STRIPE_SECRET: ${ssm:/myapp/${sls:stage}/stripe-secret}
```

## 6. IAM — Least privilege

Cada servicio recibe SOLO los permisos que necesita. NUNCA usar AdministratorAccess o `*` en producción.

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

Usar OIDC federation, NO access keys estáticas. GitHub Actions asume un IAM Role vía OIDC: sin secrets de AWS en GitHub, credentials rotan automáticamente, scope limitado al repositorio.

```hcl
# Terraform — OIDC provider para GitHub Actions
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

**Cuándo usarlo:**
- API pública expuesta a internet
- E-commerce / marketplace (PCI compliance)
- Aplicaciones con datos sensibles
- Protección contra bots, SQL injection, XSS

**Cuándo NO usarlo:**
- APIs internas solo accesibles desde VPC
- Presupuesto mínimo ($6/mes por web ACL + $0.60/million requests)

**Reglas mínimas recomendadas:** AWSManagedRulesCommonRuleSet (OWASP top 10), AWSManagedRulesKnownBadInputsRuleSet, AWSManagedRulesSQLiRuleSet, rate limiting (ej: 2000 requests/5 min por IP).

## 8. SSL/TLS

HTTPS es obligatorio, sin excepciones.

- **Frontend en Vercel:** SSL automático incluido.
- **CloudFront + dominio custom:** ACM (certificados GRATIS), debe ser en us-east-1 para CloudFront.
- **ALB + dominio custom:** ACM certificate en la región del ALB, renovación automática.
- **API Gateway:** compatible con ACM custom domain.

## 9. Checklist de seguridad

- [ ] Todos los buckets S3 con acceso público bloqueado
- [ ] DB en private subnet, no accesible desde internet
- [ ] Secrets en SSM/Secrets Manager, no en código ni .env en prod
- [ ] IAM roles con least privilege (no `*` ni AdministratorAccess)
- [ ] HTTPS everywhere (redirect HTTP → HTTPS)
- [ ] Security groups: deny all por defecto
- [ ] OIDC para CI/CD (no access keys estáticas)
- [ ] WAF en endpoints públicos (si presupuesto permite)
- [ ] Encryption at rest habilitado (S3, RDS, ElastiCache)
- [ ] Encryption in transit (TLS 1.2+)
- [ ] CloudTrail habilitado (audit log de acciones AWS)
- [ ] MFA en cuenta root de AWS
- [ ] No usar root account para operaciones diarias

## 10. Gotchas

- DB accesible desde internet (0.0.0.0/0 en security group) — siempre private subnet.
- Secrets hardcodeados en código o variables de entorno en repositorios.
- IAM con Action `*` o Resource `*` — usar least privilege.
- Access keys estáticas para CI/CD — usar OIDC.
- HTTP sin redirección a HTTPS.
- VPC sin necesidad — Lambda + DynamoDB no necesita VPC.
- NAT Gateway en dev/staging sin necesidad — $32/mes mínimo.
- Un solo security group para todo ("all traffic" entre servicios).
- Bastion host como método principal de acceso — usar SSM Session Manager.
- No habilitar CloudTrail.
