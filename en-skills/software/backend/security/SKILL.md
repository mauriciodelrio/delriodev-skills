---
name: security
description: >
  Use this skill when implementing code-level security in a Node.js
  backend. Covers Helmet, rate limiting, input sanitization, CSRF,
  dependency audit, OWASP Top 10 from code, and Express/NestJS
  hardening. Infra (WAF, VPC, IAM) → architecture/networking.
---

# Security — Code-Level Security

## Agent workflow

**1.** Review OWASP checklist by category (section 1).
**2.** Configure Helmet and CORS (section 2).
**3.** Sanitize inputs and prevent injection (sections 3–4).
**4.** Implement CSRF and secrets management (sections 5–7).
**5.** Verify resource-level authorization (section 8).
**6.** Check against the gotchas list (section 9).

## 1. OWASP Top 10 — Backend Checklist

**A01 — Broken Access Control:** verify permissions on every endpoint (not just frontend), don't expose sequential IDs (use UUID/CUID), verify resource ownership, principle of least privilege.

**A02 — Cryptographic Failures:** HTTPS mandatory in production, passwords with bcrypt/argon2, secrets in env vars, JWT with explicit algorithm (HS256/RS256).

**A03 — Injection:** parameterized queries (ORM, never string concat), sanitize user HTML, never execute `eval()` with input, validate and escape all input.

**A04 — Insecure Design:** rate limiting on auth endpoints, account lockout after N attempts, don't expose sensitive data in error messages, threat modeling.

**A05 — Security Misconfiguration:** Helmet enabled, restrictive CORS (explicit origins), debug mode off in production, stack traces not exposed.

**A06 — Vulnerable Components:** `pnpm audit` in CI, Dependabot/Renovate enabled, verify maintenance before installing.

**A07 — Auth Failures:** refresh token rotation, logout invalidates tokens, generic messages ("Invalid credentials"), MFA for sensitive accounts.

**A08 — Software and Data Integrity:** lock files committed, verify dependency integrity, CI/CD with minimal permissions.

**A09 — Logging & Monitoring Failures:** log auth failures and access control failures, don't log sensitive data (passwords, tokens, PII), alerts for suspicious patterns.

**A10 — SSRF:** validate user-provided URLs, don't fetch arbitrary URLs, whitelist of allowed domains for server-side requests.

## 2. Helmet — Security Headers

```typescript
import helmet from 'helmet';

// Express
app.use(helmet());
// Equivalent to setting these headers:
//   X-Content-Type-Options: nosniff
//   X-Frame-Options: DENY
//   X-XSS-Protection: 0 (deprecated, but helmet handles it)
//   Strict-Transport-Security: max-age=15552000; includeSubDomains
//   Content-Security-Policy: default-src 'self'
//   X-Download-Options: noopen
//   X-Permitted-Cross-Domain-Policies: none
//   Referrer-Policy: no-referrer

// NestJS — in main.ts
app.use(helmet());

// Customize if you need frames (iframes) or external scripts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Only if you really need it
    },
  },
  frameguard: { action: 'deny' },
}));
```

## 3. Input Sanitization

```typescript
// Sanitize HTML to prevent stored XSS
import sanitizeHtml from 'sanitize-html';

function sanitizeInput(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [],          // Strip ALL HTML tags
    allowedAttributes: {},
  });
}

// For fields that need formatting (rich text)
function sanitizeRichText(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    allowedAttributes: {
      a: ['href', 'target'],
    },
    allowedSchemes: ['http', 'https'], // No javascript: URLs
  });
}

// RULES:
//   ✅ Sanitize BEFORE saving to DB
//   ✅ Use a proven library, not custom regex
//   ❌ Only sanitize on output → dirty data in DB
//   ❌ allowedTags: ['script'] → XSS
```

## 4. SQL Injection Prevention

```typescript
// ✅ ALWAYS use parameterized queries
// Prisma and Drizzle parameterize automatically

// ❌ NEVER concatenate strings in queries
const BAD = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ Prisma
const user = await prisma.user.findUnique({ where: { email } });

// ✅ Drizzle
const user = await db.select().from(users).where(eq(users.email, email));

// ✅ Parameterized raw query (when you need direct SQL)
const result = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${email}
`;
// Prisma escapes automatically with template literals
```

## 5. CSRF Protection

```typescript
// CSRF is relevant when you use cookies for auth

// Option 1: SameSite cookies (simpler, recommended)
res.cookie('refreshToken', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict', // Prevents CSRF automatically
});

// Option 2: CSRF tokens (if you need sameSite: 'lax')
import { doubleCsrf } from 'csrf-csrf';

const { doubleCsrfProtection, generateToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET!,
  cookieName: '__csrf',
  cookieOptions: { secure: true, sameSite: 'strict' },
});

app.use(doubleCsrfProtection);

// Endpoint to get CSRF token
app.get('/api/csrf-token', (req, res) => {
  res.json({ token: generateToken(req, res) });
});
```

## 6. Dependency Audit

```bash
# In CI — fail the build if there are critical vulnerabilities
pnpm audit --audit-level=critical

# Automated
# Dependabot → automatic PRs for security updates
# pnpm audit → in CI pipeline

# Check before installing a new package:
#   1. Is it actively maintained? (last commit < 6 months)
#   2. How many weekly downloads? (> 10k for important libs)
#   3. Does it have known vulnerabilities? (snyk.io/vuln)
#   4. How many transitive dependencies does it add?
```

## 7. Secrets Management

Never hardcode secrets in code or config files. Environment variables for development. Secret manager for production (AWS Secrets Manager, Vault). Validate that all secrets exist at startup (fail fast). Rotate secrets periodically (especially JWT_SECRET). `.env` in `.gitignore` always. `.env.example` with keys but without values.

**File checklist:** `.env` → in .gitignore, `.env.example` → in git (keys without values), `.env.test` → in git (test values), `.env.local` → in .gitignore.

## 8. Resource-Level Authorization

```typescript
// Not only verify the role, also verify ownership

// ❌ Only verifies that the user is authenticated
@Get('orders/:id')
getOrder(@Param('id') id: string) {
  return this.ordersService.findById(id); // Any user sees any order
}

// ✅ Verifies that the order belongs to the user
@Get('orders/:id')
async getOrder(@Param('id') id: string, @CurrentUser() user: User) {
  const order = await this.ordersService.findById(id);
  if (order.userId !== user.id && !user.roles.includes('admin')) {
    throw new ForbiddenError('You do not have access to this resource');
  }
  return order;
}

// Better: in the service
async findByIdForUser(id: string, userId: string) {
  const order = await this.prisma.order.findFirst({
    where: { id, userId }, // Filter by userId in the query
  });
  if (!order) throw new NotFoundError('Order', id);
  return order;
}
```

## 9. Gotchas

- Helmet not installed — missing security headers.
- CORS with `origin: '*'` — any site can make requests.
- Secrets in code or committed config files — git history exposes them.
- `eval()` with user input — arbitrary code execution.
- `SELECT *` without filtering by ownership — IDOR.
- Error messages with stack trace in production — information for attackers.
- Passwords logged — data breach.
- No rate limiting on `/login` — brute force.
- Dependency audit only manual — automate in CI.
- Trusting headers like `X-Forwarded-For` without a trusted proxy.
- Weak JWT secret (< 32 chars) or shared between access and refresh.

## Related Skills

| Skill | Why |
|-------|-----|
| `auth` | JWT, hashing, RBAC (auth security layer) |
| `logging` | Audit logging of security events |
| `error-handling` | Don't expose stack traces or internal info |
| `data-validation` | Input sanitization at boundaries |
| `governance/owasp-top-10` | Vulnerability prevention checklist |
| `governance/pci-compliance` | If handling payment data |
