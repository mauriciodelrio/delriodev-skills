---
name: architecture
description: >
  Architectural decision framework for software projects. This skill
  is an orchestrator: it guides the agent through a cycle of questions about the
  business, scale, budget, and team, and then activates sub-skills for compute,
  databases, storage, networking, messaging, observability, and costs to build
  a complete infrastructure proposal. The agent does NOT assume technologies — everything
  is situational. Upon completion, it presents an executive summary and asks for confirmation.
---

# 🏛️ Architecture — Decision Framework

## Guiding Principle

> **There is no "best" architecture — there is the right one for this project.**
> Every decision has a trade-off. The agent asks, proposes with justification,
> and does not proceed without the developer's confirmation.

---

## Agent Flow

```
PHASE 1: DISCOVERY
  → Questions about business, scale, budget, team, constraints
  → Gather all answers before proposing ANYTHING

PHASE 2: ANALYSIS
  → Activate relevant sub-skills based on answers
  → Evaluate options with each sub-skill's decision trees
  → Consider budget as a cross-cutting constraint

PHASE 3: PROPOSAL
  → Present executive summary with ALL decisions
  → Justify each choice (why X and not Y)
  → Estimate approximate monthly cost
  → ASK FOR CONFIRMATION before continuing

PHASE 4: IMPLEMENTATION
  → With confirmation, generate configuration/IaC
  → Guide step by step through service configuration
  → Reference basic-workflows skill for PR CI/CD
```

---

## PHASE 1 — Discovery Questions

The agent MUST ask these questions before making any decision.
Group into blocks — don't overwhelm with all of them at once.

### Block 1: Business

```
1. What type of project is it?
   (B2B SaaS, marketplace, e-commerce, internal app, landing/marketing,
    public API, content platform, other)

2. What is the core of the product?
   (What it does, in one sentence)

3. Who are the users?
   (End consumers, businesses, developers, internal team)

4. In which geographic regions will it operate?
   (Latam, US, EU, global)
```

### Block 2: Scale and Traffic

```
5. How many simultaneous users do you expect in the first year?
   Tiers:
   - Low:     < 100 concurrent
   - Medium:  100 – 1,000 concurrent
   - High:    1,000 – 10,000 concurrent
   - Massive: > 10,000 concurrent

6. Is the traffic predictable or does it have spikes?
   (Constant, time-based spikes, events/campaigns, seasonal)

7. Is there heavy processing?
   (Images/video, ML/AI, batch reports, large CSV imports, real-time)

8. Do you need real-time?
   (Chat, push notifications, live collaboration, live dashboards)
```

### Block 3: Data

```
9. What type of data do you handle?
   (Transactional/financial, content/media, analytical,
    sensitive personal data, health data)

10. Estimated data volume?
    (GBs, TBs, expected monthly growth)

11. Do you need advanced search?
    (Full-text search, complex filters, geolocation)

12. Are there regulatory requirements?
    (GDPR, HIPAA, PCI DSS, SOC 2, data residency)
    → If yes: activate governance-risk-and-compliance skills
```

### Block 4: Team and Budget

```
13. Size of the technical team?
    - Solo:    1 developer
    - Small:   2–5 developers
    - Medium:  5–15 developers
    - Large:   > 15 developers

14. Team experience with cloud/infra?
    (None, basic, intermediate, advanced)

15. Monthly infrastructure budget?
    Tiers:
    - Minimal:    $0 – $50/month (free tiers, hobby)
    - Low:        $50 – $300/month (early stage startup)
    - Medium:     $300 – $1,500/month (startup with traction)
    - High:       $1,500 – $5,000/month (established company)
    - Enterprise: > $5,000/month

16. Is there a preference for managed services vs self-hosted?
    (Prefer to pay more and operate less / Prefer full control)
```

### Block 5: Existing Tech Stack

```
17. Is there existing code or is it greenfield?
    (Greenfield, migration, extension of existing system)

18. Are there already-decided technologies?
    (Frontend/backend framework, language, already committed cloud services)

19. What is the current deploy flow?
    (Manual, partial CI/CD, full CI/CD, doesn't exist yet)
```

---

## PHASE 2 — Routing to Sub-Skills

Once answers are gathered, the agent consults the sub-skills:

| Decision | Sub-Skill | Activated when... |
|----------|-----------|-------------------|
| Where the code runs | `compute` | Always |
| Where data is stored | `databases` | Always |
| Files, media, assets | `storage-and-cdn` | There are uploads, images, or static assets |
| Networks, security, access | `networking-and-security` | Always |
| Communication between services | `messaging-and-events` | Microservices, async processing, real-time |
| Logs, monitoring, alerts | `observability` | Always |
| Cost optimization | `cost-and-scaling` | Always (evaluates against budget) |

---

## PHASE 3 — Executive Summary

After completing the analysis, present this format:

```markdown
## 📋 Architecture Proposal — [Project Name]

### Context
- Type: [B2B SaaS / marketplace / ...]
- Scale: [user tier] — [traffic type]
- Budget: [tier] ($X–$Y/month)
- Team: [size] — cloud experience [level]
- Regulations: [GDPR / PCI / none]

### Proposed Stack

| Layer | Technology | Justification | Est. cost/month |
|-------|-----------|---------------|-----------------|
| Frontend hosting | ... | ... | ... |
| Backend/API | ... | ... | ... |
| Database | ... | ... | ... |
| Cache | ... | ... | ... |
| Storage | ... | ... | ... |
| CDN | ... | ... | ... |
| Auth | ... | ... | ... |
| Messaging | ... | ... | ... |
| Monitoring | ... | ... | ... |
| CI/CD | ... | ... | ... |

### Estimated Total Cost: $X/month

### Alternatives Considered
- [Option B]: discarded because [reason]
- [Option C]: discarded because [reason]

### Architecture Diagram
[Mermaid or ASCII diagram]

### Risks and Trade-offs
- ...

---
⚠️ Do you confirm this proposal to proceed with implementation?
```

---

## PHASE 4 — Implementation

With the developer's confirmation:

1. **IaC / Configuration** — Generate Terraform, CDK, serverless.yml, or manual guide depending on team experience
2. **Deploy CI/CD** — Deploy pipeline (staging → production)
   - For PR checks (lint, test, build): reference `basic-workflows` skill
   - For cloud deploy: configure in this skill
3. **Setup guides** — Step by step for each proposed service
4. **Environment variables** — What secrets/configs each service needs

---

## Cross-cutting Rules

```
1. BUDGET IS A CONSTRAINT, NOT A SUGGESTION
   → Every proposal must respect the user's budget tier.
   → If the "ideal" solution exceeds the budget, propose alternatives.

2. COMPLEXITY PROPORTIONAL TO THE TEAM
   → Team of 1-2: managed services, minimal custom infra.
   → Team of 15+: can handle Kubernetes, multi-service, etc.

3. DON'T OVER-ARCHITECT
   → MVP doesn't need microservices.
   → < 1,000 users probably doesn't need distributed cache.
   → Start simple, scale when the data justifies it.

4. SECURITY IS NOT OPTIONAL
   → HTTPS everywhere, secrets in vault, IAM least privilege.
   → If there are regulations, activate GRC skills as a prerequisite.

5. OBSERVABILITY FROM DAY 1
   → It's not something you "add later." Logging and monitoring go
     in the initial configuration.
```

---

## Available Sub-Skills

- `architecture/compute` — Lambda, ECS, EC2, Vercel, Cloud Run
- `architecture/databases` — RDS, DynamoDB, MongoDB, Redis, ElastiCache
- `architecture/storage-and-cdn` — S3, CloudFront, media processing
- `architecture/networking-and-security` — VPC, WAF, IAM, API Gateway, secrets
- `architecture/messaging-and-events` — SQS, SNS, EventBridge, WebSockets
- `architecture/observability` — CloudWatch, Datadog, Sentry, tracing
- `architecture/cost-and-scaling` — Savings, auto-scaling, reserved instances
