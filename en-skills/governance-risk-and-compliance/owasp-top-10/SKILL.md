---
name: owasp-top-10
description: >
  OWASP Top 10:2021 skill — The 10 most critical security vulnerabilities in web applications.
  Activate this skill WHENEVER you write code that handles user input, authentication,
  data access, server configuration, or any HTTP endpoint. This is the most fundamental
  applied code security skill.
---

# 🔥 OWASP Top 10:2021 — Critical Web Application Vulnerabilities

## General Description

The **OWASP Top 10** is the world's most important reference document on web application security, published by the Open Web Application Security Project. It lists the 10 most critical security risk categories, based on real breach and incident data.

**Why is it fundamental?** Because the majority of security breaches exploit vulnerabilities that are in this Top 10. If your code is resistant to these 10 categories, you are covered against the vast majority of common attacks.

---

## When to Activate this Skill

Activate this skill **WHENEVER**:

- You write **any HTTP endpoint** (REST, GraphQL, WebSocket)
- You process **any user input** (forms, query params, headers, cookies)
- You implement **authentication or authorization**
- You work with **databases** (queries, ORM, raw SQL)
- You configure a **web server** or middleware
- You implement **file uploads**
- You work with **sessions, tokens, or cookies**
- You render **dynamic content** on the frontend
- You consume or expose **third-party APIs**

**In summary: WHENEVER you write web code.**

---

## The 10 Vulnerabilities

### A01:2021 — Broken Access Control

**#1 most critical.** Occurs when a user can act outside their permissions.

```typescript
// ❌ VULNERABLE: IDOR (Insecure Direct Object Reference)
// Any user can view another's data by changing the ID in the URL
router.get('/api/users/:userId/profile', async (req, res) => {
  const profile = await prisma.user.findUnique({
    where: { id: req.params.userId },
  });
  res.json(profile); // No verification that the logged-in user is the owner!
});

// ✅ SECURE: Verify that the user only accesses their own data
router.get('/api/users/:userId/profile', authenticate, async (req, res) => {
  // Verify that the authenticated user is the resource owner
  if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You do not have permission to view this profile' });
  }

  const profile = await prisma.user.findUnique({
    where: { id: req.params.userId },
    select: { // Minimize exposed data
      id: true,
      email: true,
      name: true,
      createdAt: true,
      // DO NOT expose: passwordHash, internalNotes, etc.
    },
  });
  
  if (!profile) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(profile);
});

// ❌ VULNERABLE: Unprotected admin endpoint
router.delete('/api/admin/users/:userId', async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.userId } });
  res.json({ success: true });
});

// ✅ SECURE: Verify admin role + logging
router.delete('/api/admin/users/:userId', 
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    await prisma.user.delete({ where: { id: req.params.userId } });
    
    logger.info({
      event: 'user_deleted',
      deletedUserId: req.params.userId,
      deletedBy: req.user.id,
    }, 'User deleted by admin');
    
    res.json({ success: true });
  }
);

// Role verification middleware
function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role)) {
      logger.warn({
        event: 'unauthorized_access_attempt',
        userId: req.user?.id,
        userRole: req.user?.role,
        requiredRoles: roles,
        path: req.originalUrl,
      }, 'Unauthorized access attempt');
      
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
```

---

### A02:2021 — Cryptographic Failures

Sensitive data exposed due to lack of encryption or use of weak cryptography.

```typescript
// ❌ VULNERABLE: Storing password in plain text
await prisma.user.create({
  data: {
    email: input.email,
    password: input.password, // NEVER!
  },
});

// ❌ VULNERABLE: Weak hash (MD5, SHA-1)
import crypto from 'node:crypto';
const hash = crypto.createHash('md5').update(password).digest('hex'); // VULNERABLE!

// ✅ SECURE: bcrypt with appropriate cost factor
import bcrypt from 'bcrypt';
const SALT_ROUNDS = 12; // Computational cost (10-12 recommended)

// Hash on creation
const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
await prisma.user.create({
  data: {
    email: input.email,
    passwordHash,
  },
});

// Verify on login
const isValid = await bcrypt.compare(inputPassword, user.passwordHash);

// ❌ VULNERABLE: JWT with none algorithm or weak secret
import jwt from 'jsonwebtoken';
const token = jwt.sign(payload, 'secret123'); // Weak and hardcoded secret

// ✅ SECURE: JWT with strong secret and strict options
const JWT_SECRET = process.env.JWT_SECRET!; // Min 256 bits, from env variable
const JWT_ALGORITHM = 'HS256' as const;

function signToken(payload: { userId: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: '15m',       // Short access token
    issuer: 'my-app',
    audience: 'my-app-users',
  });
}

function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: [JWT_ALGORITHM], // Fix algorithm — prevents algorithm confusion attack
    issuer: 'my-app',
    audience: 'my-app-users',
  });
}

// ❌ VULNERABLE: Transmitting data without TLS
// http://api.example.com/login (HTTP = plain text)

// ✅ SECURE: Always HTTPS + HSTS
// https://api.example.com/login (TLS 1.2+)
// Header: Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

### A03:2021 — Injection

Untrusted data sent to an interpreter as part of a command/query.

```typescript
// ❌ VULNERABLE: SQL Injection
const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
// Malicious input: email = "admin@test.com' OR '1'='1' --"
// Results in: SELECT * FROM users WHERE email = 'admin@test.com' OR '1'='1' --' AND password = ''

// ✅ SECURE: Parameterized queries (Prisma uses them automatically)
const user = await prisma.user.findUnique({
  where: { email: input.email }, // Prisma escapes automatically
});

// ✅ SECURE: If you need raw SQL, use parameterization
const users = await prisma.$queryRaw`
  SELECT id, email, name FROM users
  WHERE email = ${email}
  AND status = ${status}
`; // Prisma parameterizes values with tagged template literals

// ❌ VULNERABLE: NoSQL Injection (MongoDB)
const user = await db.collection('users').findOne({
  email: req.body.email,     // If email is { "$gt": "" }, returns the first user
  password: req.body.password,
});

// ✅ SECURE: Validate input type
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

// Validate BEFORE using
const validated = LoginSchema.parse(req.body);
const user = await db.collection('users').findOne({
  email: validated.email, // Guaranteed string, not an object
});

// ❌ VULNERABLE: Command Injection
import { exec } from 'node:child_process';
exec(`ping ${req.query.host}`); // If host = "google.com; rm -rf /", executes both commands

// ✅ SECURE: Use execFile with separate arguments (no shell)
import { execFile } from 'node:child_process';
execFile('ping', ['-c', '4', validatedHost], (error, stdout) => {
  // execFile does NOT use shell, so ; is not interpreted as a separator
});

// ✅ BETTER: Avoid executing system commands. Use native libraries:
import dns from 'node:dns/promises';
const result = await dns.resolve4(validatedHost);
```

---

### A04:2021 — Insecure Design

Design and architecture-level flaws that cannot be fixed with code alone.

```typescript
// ❌ INSECURE DESIGN: Password reset with security question
// Security questions are inherently insecure (public info on social media)

// ✅ SECURE DESIGN: Password reset with temporary token via email
import crypto from 'node:crypto';

async function initiatePasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  
  // ALWAYS respond the same way (don't reveal if the email exists)
  if (!user) {
    return { message: 'If the email exists, you will receive instructions to reset your password.' };
  }

  // Cryptographically secure token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash: resetTokenHash, // Store only the hash
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  // Send email with the token (not stored)
  await sendEmail(email, `https://app.example.com/reset-password?token=${resetToken}`);

  return { message: 'If the email exists, you will receive instructions to reset your password.' };
}

// ❌ INSECURE DESIGN: No rate limiting on login
// An attacker can try millions of combinations

// ✅ SECURE DESIGN: Rate limiting + account lockout + progressive delay
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 attempts per window
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  keyGenerator: (req) => req.body?.email ?? req.ip, // Limit by email, not just IP
});

router.post('/login', loginLimiter, loginHandler);
```

---

### A05:2021 — Security Misconfiguration

```typescript
// ❌ VULNERABLE: Insecure default configuration
const app = express();
// No helmet, no restrictive CORS, no rate limit, with stack traces

// ✅ SECURE: Hardened configuration
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

const app = express();

// Security headers
app.use(helmet());

// Restrictive CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

// Disable technology info
app.disable('x-powered-by');

// ❌ VULNERABLE: Exposing stack trace in production
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack, // NEVER in production!
  });
});

// ✅ SECURE: Error handler that doesn't leak internal information
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  // Generate unique ID for correlation
  const errorId = crypto.randomUUID();

  // Log internal details
  logger.error({
    errorId,
    error: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
  }, 'Unhandled error');

  // Respond without internal information
  res.status(500).json({
    error: 'Internal server error',
    errorId, // So the user can report the error
    // DO NOT include: message, stack, DB details, etc.
  });
});

// ❌ VULNERABLE: Listable directory, exposed files
app.use(express.static('public')); // No restriction, may expose .env, .git, etc.

// ✅ SECURE: Static files with restrictions
app.use(express.static('public', {
  dotfiles: 'deny',     // Deny .env, .git, etc. files
  index: false,          // Don't list directories
  maxAge: '1d',
}));
```

---

### A06:2021 — Vulnerable and Outdated Components

```typescript
// Configure npm audit in CI/CD

// package.json — Audit scripts
/*
{
  "scripts": {
    "audit": "npm audit --audit-level=moderate",
    "audit:fix": "npm audit fix",
    "audit:report": "npm audit --json > audit-report.json",
    "deps:check": "npx npm-check-updates",
    "deps:outdated": "npm outdated"
  }
}
*/

// .github/workflows/dependency-check.yml
export const DEPENDENCY_CHECK_WORKFLOW = `
name: Dependency Security Check
on:
  schedule:
    - cron: '0 8 * * 1'    # Every Monday at 8 AM
  push:
    paths:
      - 'package.json'
      - 'package-lock.json'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - name: Security Audit
        run: npm audit --audit-level=high
      - name: Check for known vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: \${{ secrets.SNYK_TOKEN }}
`;

// Policy: NEVER ignore high or critical vulnerabilities
// If no fix is available, evaluate alternatives or mitigations
```

---

### A07:2021 — Identification and Authentication Failures

```typescript
// ✅ Robust authentication implementation

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// Strict validation schema
const LoginSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  password: z.string().min(8).max(128),
});

async function loginHandler(req: Request, res: Response) {
  // 1. Validate input
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  const { email, password } = result.data;

  // 2. Find user
  const user = await prisma.user.findUnique({ where: { email } });

  // 3. ALWAYS respond in constant time (prevent timing attacks)
  if (!user) {
    // Hash anyway to equalize timing
    await bcrypt.hash(password, 12);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // 4. Check if account is locked
  if (user.lockedAt && Date.now() - user.lockedAt.getTime() < 30 * 60 * 1000) {
    return res.status(423).json({
      error: 'Account temporarily locked. Try again in 30 minutes.',
    });
  }

  // 5. Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    // Increment failed attempts counter
    const failedAttempts = user.failedLoginAttempts + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: failedAttempts,
        // Lock after 5 attempts
        lockedAt: failedAttempts >= 5 ? new Date() : null,
      },
    });

    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // 6. Reset failed attempts
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedAt: null, lastLoginAt: new Date() },
  });

  // 7. Generate tokens
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '15m', algorithm: 'HS256' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, tokenType: 'refresh' },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d', algorithm: 'HS256' }
  );

  // 8. Refresh token in httpOnly cookie (NOT in localStorage)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,     // Not accessible by JavaScript
    secure: true,       // HTTPS only
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth/refresh', // Only sent to refresh route
  });

  // 9. Access token in the body
  res.json({
    accessToken,
    expiresIn: 900, // 15 min in seconds
    user: { id: user.id, email: user.email, role: user.role },
  });
}
```

---

### A08:2021 — Software and Data Integrity Failures

```typescript
// ❌ VULNERABLE: Insecure deserialization
const userData = JSON.parse(req.cookies.userData); // User data in manipulable cookie

// ✅ SECURE: Sign data that comes back from the client
import crypto from 'node:crypto';

function signData(data: object): string {
  const json = JSON.stringify(data);
  const signature = crypto
    .createHmac('sha256', process.env.SIGNING_SECRET!)
    .update(json)
    .digest('hex');
  return `${Buffer.from(json).toString('base64')}.${signature}`;
}

function verifySignedData<T>(signed: string): T | null {
  const [dataB64, signature] = signed.split('.');
  const json = Buffer.from(dataB64, 'base64').toString('utf-8');
  
  const expectedSignature = crypto
    .createHmac('sha256', process.env.SIGNING_SECRET!)
    .update(json)
    .digest('hex');

  // Constant-time comparison (prevents timing attacks)
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null; // Invalid signature — data tampered with
  }

  return JSON.parse(json) as T;
}

// ❌ VULNERABLE: npm install without verifying integrity
// npm install some-package (without lockfile)

// ✅ SECURE: Always use lockfile and verify integrity
// npm ci (uses package-lock.json, verifies hashes)
// In CI/CD always use: npm ci --ignore-scripts && npm audit
```

---

### A09:2021 — Security Logging and Monitoring Failures

```typescript
// ✅ Complete security logging with Pino

import pino from 'pino';

const logger = pino({
  name: 'security-audit',
  level: 'info',
  redact: {
    paths: [
      'password', '*.password', 'body.password',
      'authorization', '*.authorization', 'req.headers.authorization',
      'cookie', '*.cookie', 'req.headers.cookie',
      'creditCard', '*.creditCard', '*.cvv', '*.ssn',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Security events that MUST ALWAYS be logged:
const SECURITY_EVENTS = {
  // Authentication
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILURE: 'auth.login.failure',
  LOGOUT: 'auth.logout',
  PASSWORD_CHANGE: 'auth.password.change',
  PASSWORD_RESET: 'auth.password.reset',
  MFA_ENABLED: 'auth.mfa.enabled',
  MFA_DISABLED: 'auth.mfa.disabled',
  ACCOUNT_LOCKED: 'auth.account.locked',
  
  // Authorization
  ACCESS_DENIED: 'authz.access.denied',
  PRIVILEGE_ESCALATION: 'authz.privilege.escalation',
  
  // Data
  DATA_EXPORT: 'data.export',
  DATA_DELETE: 'data.delete',
  SENSITIVE_DATA_ACCESS: 'data.sensitive.access',
  
  // Administration
  USER_CREATED: 'admin.user.created',
  USER_DELETED: 'admin.user.deleted',
  ROLE_CHANGED: 'admin.role.changed',
  CONFIG_CHANGED: 'admin.config.changed',
  
  // Anomalies
  RATE_LIMIT_HIT: 'anomaly.rate_limit',
  INVALID_INPUT: 'anomaly.invalid_input',
  SUSPICIOUS_ACTIVITY: 'anomaly.suspicious',
} as const;

// Usage example in code
function logSecurityEvent(
  event: string,
  details: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'info',
) {
  logger[level]({
    event,
    ...details,
    timestamp: new Date().toISOString(),
  }, `Security: ${event}`);
}

// Example: log successful login
logSecurityEvent(SECURITY_EVENTS.LOGIN_SUCCESS, {
  userId: user.id,
  email: user.email,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});

// Example: log unauthorized access attempt
logSecurityEvent(SECURITY_EVENTS.ACCESS_DENIED, {
  userId: req.user?.id,
  resource: req.originalUrl,
  method: req.method,
  ip: req.ip,
  reason: 'Insufficient permissions',
}, 'warn');
```

---

### A10:2021 — Server-Side Request Forgery (SSRF)

```typescript
// ❌ VULNERABLE: Server makes a request to user-provided URL
router.post('/api/fetch-url', async (req, res) => {
  const response = await fetch(req.body.url); // User can request internal URLs!
  // url = "http://169.254.169.254/latest/meta-data/" → exposes AWS credentials
  // url = "http://localhost:5432/" → accesses internal database
  const data = await response.text();
  res.json({ data });
});

// ✅ SECURE: Validate and restrict allowed URLs
import { URL } from 'node:url';
import dns from 'node:dns/promises';

const BLOCKED_IP_RANGES = [
  /^127\./,              // Loopback
  /^10\./,               // Class A private
  /^172\.(1[6-9]|2\d|3[01])\./, // Class B private
  /^192\.168\./,         // Class C private
  /^169\.254\./,         // Link-local (AWS metadata!)
  /^0\./,                // Current network
  /^::1$/,               // IPv6 loopback
  /^fd[0-9a-f]{2}:/i,   // IPv6 private
];

const ALLOWED_PROTOCOLS = ['https:'];
const ALLOWED_DOMAINS_REGEX = /^[\w.-]+\.(com|org|net|io|dev)$/; // Only public domains

async function validateExternalUrl(urlString: string): Promise<{ valid: boolean; error?: string }> {
  let parsed: URL;
  
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, error: 'Invalid URL' };
  }

  // 1. Only allowed protocols
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    return { valid: false, error: `Protocol not allowed: ${parsed.protocol}` };
  }

  // 2. Do not allow direct IPs
  if (/^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname)) {
    return { valid: false, error: 'Direct IPs are not allowed' };
  }

  // 3. Resolve DNS and verify it doesn't point to internal IPs
  try {
    const addresses = await dns.resolve4(parsed.hostname);
    for (const ip of addresses) {
      if (BLOCKED_IP_RANGES.some(range => range.test(ip))) {
        return { valid: false, error: 'The URL resolves to a blocked internal address' };
      }
    }
  } catch {
    return { valid: false, error: 'Could not resolve the domain' };
  }

  return { valid: true };
}

// Secure usage
router.post('/api/fetch-url', async (req, res) => {
  const validation = await validateExternalUrl(req.body.url);
  
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const response = await fetch(req.body.url, {
    redirect: 'error', // Don't follow redirects (they could go to internal URLs)
    signal: AbortSignal.timeout(5000), // 5-second timeout
  });

  const data = await response.text();
  res.json({ data: data.substring(0, 10000) }); // Limit response
});
```

---

## Integral Security Middleware

```typescript
// middleware/security.middleware.ts
// Middleware combining protections against multiple OWASP vulnerabilities

import express, { Request, Response, NextFunction, Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

export function applyOWASPSecurity(app: Express) {
  // A05: Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  }));

  // A05: Restrictive CORS
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
    credentials: true,
  }));

  // A04/A07: General rate limiting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // More restrictive rate limiting for auth
  app.use('/api/*/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many authentication attempts' },
  }));

  // A05: Disable fingerprinting
  app.disable('x-powered-by');

  // A03: Limit request body size
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
}

/**
 * Generic input sanitization middleware.
 * Apply on routes that receive user data.
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  // Recursive function to sanitize strings in objects
  function sanitize(obj: unknown): unknown {
    if (typeof obj === 'string') {
      return obj
        .replace(/[<>]/g, '') // Remove basic < and > (for basic XSS)
        .trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    return obj;
  }

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query) as any;

  next();
}
```

---

## OWASP Best Practices

### ✅ DO

1. **Validate ALL user input** with strict schemas (Zod/Joi)
2. **Use an ORM** (Prisma) instead of raw SQL queries
3. **bcrypt/argon2** for password hashing (NEVER MD5/SHA1)
4. **HTTPS + HSTS** in production
5. **Helmet** for security headers
6. **Restrictive CORS** — only specific origins
7. **Rate limiting** on all routes, especially auth
8. **JWT in httpOnly cookie** — NOT in localStorage
9. **Security event logging** without sensitive data
10. **Validate URLs** before fetching from the server
11. **npm audit** / **Snyk** in CI/CD for dependencies
12. **Generic errors** to the user, details only in internal logs

### ❌ DO NOT

1. **NEVER** trust client data (params, body, headers, cookies)
2. **NEVER** build SQL queries with string concatenation
3. **NEVER** store secrets in source code
4. **NEVER** expose stack traces in production
5. **NEVER** disable CSRF protection without justification
6. **NEVER** use `eval()`, `new Function()`, or `child_process.exec()` with user input
7. **NEVER** store sensitive tokens in localStorage
8. **NEVER** serve mixed content (HTTP + HTTPS)
9. **NEVER** trust `X-Forwarded-For` headers without validation

---

## OWASP Top 10 Checklist

- [ ] A01: Access control verified on every route (authentication + authorization)
- [ ] A02: Passwords hashed with bcrypt/argon2, data encrypted, TLS active
- [ ] A03: Parameterized queries, input validated with schemas, no exec with user input
- [ ] A04: Rate limiting, account lockout, secure password reset, threat modeling
- [ ] A05: Helmet, CORS, x-powered-by disabled, generic errors, no exposed files
- [ ] A06: npm audit in CI/CD, dependencies up to date, regular scanning
- [ ] A07: MFA available, secure JWT, refresh tokens in httpOnly cookies, session timeout
- [ ] A08: Client data signed, lockfile with integrity, CSP configured
- [ ] A09: Security event logging, anomaly monitoring, alerts configured
- [ ] A10: External URL validation, internal IP blocking, no blind redirect following

---

## References and Resources

- [OWASP Top 10:2021 Official](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP ASVS (Application Security Verification Standard)](https://owasp.org/www-project-application-security-verification-standard/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
