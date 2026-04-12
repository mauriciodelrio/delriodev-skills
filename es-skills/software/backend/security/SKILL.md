---
name: security
description: >
  Seguridad a nivel de código en backend Node.js. Cubre Helmet, rate
  limiting, input sanitization, CSRF, dependency audit, OWASP Top 10
  desde la perspectiva de código, y hardening de Express/NestJS.
  Seguridad de infraestructura (WAF, VPC, IAM) → architecture/networking.
---

# 🛡️ Security — Seguridad en Código

## Principio

> **La seguridad no es un feature, es un requisito no funcional permanente.**
> Cada endpoint es un punto de ataque potencial.
> Asumir que todo input es malicioso hasta que se valide.

---

## OWASP Top 10 — Checklist Backend

```
A01: Broken Access Control
  ✅ Verificar permisos en CADA endpoint (no solo en frontend)
  ✅ No exponer IDs secuenciales → usar UUID/CUID
  ✅ Verificar ownership: ¿el user tiene acceso a ESTE recurso?
  ✅ Principle of least privilege en roles

A02: Cryptographic Failures
  ✅ HTTPS obligatorio en producción
  ✅ Passwords con bcrypt/argon2 (nunca MD5/SHA)
  ✅ Secrets en variables de entorno (nunca en código)
  ✅ JWT con algoritmo explícito (HS256/RS256)

A03: Injection
  ✅ Parameterized queries (ORM/query builder, nunca string concat)
  ✅ Sanitizar HTML del usuario (sanitize-html)
  ✅ No ejecutar eval() con input del usuario
  ✅ Validar y escapar todo input

A04: Insecure Design
  ✅ Rate limiting en auth endpoints
  ✅ Account lockout después de N intentos fallidos
  ✅ No exponer datos sensibles en error messages
  ✅ Threat modeling antes de diseñar features de seguridad

A05: Security Misconfiguration
  ✅ Helmet headers habilitados
  ✅ CORS restrictivo (lista explícita de origins)
  ✅ Debug mode deshabilitado en producción
  ✅ Stack traces no expuestos al cliente

A06: Vulnerable Components
  ✅ pnpm audit en CI
  ✅ Dependabot / Renovate habilitado
  ✅ No instalar paquetes sin verificar mantenimiento

A07: Auth Failures
  ✅ Refresh token rotation
  ✅ Logout invalida tokens
  ✅ Mensajes de error genéricos ("Invalid credentials")
  ✅ MFA para accounts sensibles

A08: Software and Data Integrity
  ✅ Lock files commiteados (pnpm-lock.yaml)
  ✅ Verificar integridad de dependencias
  ✅ CI/CD con permisos mínimos

A09: Logging & Monitoring Failures
  ✅ Loguear auth failures, access control failures
  ✅ No loguear datos sensibles (passwords, tokens, PII)
  ✅ Alertas para patrones sospechosos

A10: SSRF
  ✅ Validar URLs que el usuario proporciona
  ✅ No hacer fetch a URLs arbitrarias del usuario
  ✅ Whitelist de dominios permitidos para requests server-side
```

---

## Helmet — Security Headers

```typescript
import helmet from 'helmet';

// Express
app.use(helmet());
// Equivale a configurar estos headers:
//   X-Content-Type-Options: nosniff
//   X-Frame-Options: DENY
//   X-XSS-Protection: 0 (deprecated, pero helmet lo maneja)
//   Strict-Transport-Security: max-age=15552000; includeSubDomains
//   Content-Security-Policy: default-src 'self'
//   X-Download-Options: noopen
//   X-Permitted-Cross-Domain-Policies: none
//   Referrer-Policy: no-referrer

// NestJS — en main.ts
app.use(helmet());

// Personalizar si necesitas frames (iframes) o scripts externos
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Solo si realmente necesitas
    },
  },
  frameguard: { action: 'deny' },
}));
```

---

## Input Sanitization

```typescript
// Sanitizar HTML para prevenir stored XSS
import sanitizeHtml from 'sanitize-html';

function sanitizeInput(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [],          // Strip ALL HTML tags
    allowedAttributes: {},
  });
}

// Para campos que necesitan formato (rich text)
function sanitizeRichText(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    allowedAttributes: {
      a: ['href', 'target'],
    },
    allowedSchemes: ['http', 'https'], // No javascript: URLs
  });
}

// REGLAS:
//   ✅ Sanitizar ANTES de guardar en DB
//   ✅ Usar librería probada, no regex custom
//   ❌ Solo sanitizar en el output → datos sucios en DB
//   ❌ allowedTags: ['script'] → XSS
```

---

## SQL Injection Prevention

```typescript
// ✅ SIEMPRE usar parameterized queries
// Prisma y Drizzle ya parametrizan automáticamente

// ❌ NUNCA concatenar strings en queries
const BAD = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ Prisma
const user = await prisma.user.findUnique({ where: { email } });

// ✅ Drizzle
const user = await db.select().from(users).where(eq(users.email, email));

// ✅ Raw query parametrizada (cuando necesitas SQL directo)
const result = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${email}
`;
// Prisma escapa automáticamente con template literals
```

---

## CSRF Protection

```typescript
// CSRF es relevante cuando usas cookies para auth

// Opción 1: SameSite cookies (más simple, recomendado)
res.cookie('refreshToken', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict', // Previene CSRF automáticamente
});

// Opción 2: CSRF tokens (si necesitas sameSite: 'lax')
import { doubleCsrf } from 'csrf-csrf';

const { doubleCsrfProtection, generateToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET!,
  cookieName: '__csrf',
  cookieOptions: { secure: true, sameSite: 'strict' },
});

app.use(doubleCsrfProtection);

// Endpoint para obtener token CSRF
app.get('/api/csrf-token', (req, res) => {
  res.json({ token: generateToken(req, res) });
});
```

---

## Dependency Audit

```bash
# En CI — fallar el build si hay vulnerabilidades críticas
pnpm audit --audit-level=critical

# Automatizado
# Dependabot → PRs automáticos para updates de seguridad
# pnpm audit → en CI pipeline

# Verificar antes de instalar un paquete nuevo:
#   1. ¿Tiene mantenimiento activo? (último commit < 6 meses)
#   2. ¿Cuántas descargas semanales? (> 10k para libs importantes)
#   3. ¿Tiene vulnerabilidades conocidas? (snyk.io/vuln)
#   4. ¿Cuántas dependencias transitivas agrega?
```

---

## Secrets Management

```
REGLAS:
  1. NUNCA hardcodear secrets en código o config files
  2. Variables de entorno para desarrollo
  3. Secret manager para producción (AWS Secrets Manager, Vault)
  4. Validar que TODOS los secrets existen al startup (fail fast)
  5. Rotar secrets periódicamente (especialmente JWT_SECRET)
  6. .env en .gitignore SIEMPRE
  7. .env.example CON las keys pero SIN los values

CHECKLIST:
  .env          → en .gitignore ✅
  .env.example  → en git ✅ (keys sin values)
  .env.test     → en git ✅ (valores de test, no reales)
  .env.local    → en .gitignore ✅
```

---

## Resource-Level Authorization

```typescript
// No solo verificar rol, también verificar ownership

// ❌ Solo verifica que es un user autenticado
@Get('orders/:id')
getOrder(@Param('id') id: string) {
  return this.ordersService.findById(id); // Cualquier user ve cualquier order
}

// ✅ Verifica que el order pertenece al user
@Get('orders/:id')
async getOrder(@Param('id') id: string, @CurrentUser() user: User) {
  const order = await this.ordersService.findById(id);
  if (order.userId !== user.id && !user.roles.includes('admin')) {
    throw new ForbiddenError('No tienes acceso a este recurso');
  }
  return order;
}

// Mejor: en el service
async findByIdForUser(id: string, userId: string) {
  const order = await this.prisma.order.findFirst({
    where: { id, userId }, // Filtrar por userId en la query
  });
  if (!order) throw new NotFoundError('Order', id);
  return order;
}
```

---

## Anti-patrones

```
❌ Helmet no instalado → headers de seguridad faltantes
❌ CORS con origin: '*' → cualquier sitio puede hacer requests
❌ Secrets en código o config files commiteados → git history los expone
❌ eval() con input del usuario → ejecución de código arbitrario
❌ SELECT * sin filtrar por ownership → IDOR (Insecure Direct Object Reference)
❌ Error messages con stack trace en producción → información para atacantes
❌ Passwords logueados → breach de datos
❌ Sin rate limiting en /login → brute force
❌ Dependency audit solo manual → automatizar en CI
❌ Trust en headers como X-Forwarded-For sin proxy confiable
❌ JWT secret débil (< 32 chars) o compartido entre access y refresh
```
