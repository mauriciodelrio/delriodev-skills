---
name: security
description: >
  Usa esta skill cuando implementes seguridad a nivel de código en
  backend Node.js. Cubre Helmet, rate limiting, input sanitization,
  CSRF, dependency audit, OWASP Top 10 desde código, y hardening
  de Express/NestJS. Infra (WAF, VPC, IAM) → architecture/networking.
---

# Security — Seguridad en Código

## Flujo de trabajo del agente

**1.** Revisar checklist OWASP por categoría (sección 1).
**2.** Configurar Helmet y CORS (sección 2).
**3.** Sanitizar inputs y prevenir inyección (secciones 3–4).
**4.** Implementar CSRF y secrets management (secciones 5–7).
**5.** Verificar autorización a nivel de recurso (sección 8).
**6.** Verificar contra la lista de gotchas (sección 9).

## 1. OWASP Top 10 — Checklist Backend

**A01 — Broken Access Control:** verificar permisos en cada endpoint (no solo frontend), no exponer IDs secuenciales (usar UUID/CUID), verificar ownership del recurso, principle of least privilege.

**A02 — Cryptographic Failures:** HTTPS obligatorio en producción, passwords con bcrypt/argon2, secrets en env vars, JWT con algoritmo explícito (HS256/RS256).

**A03 — Injection:** parameterized queries (ORM, nunca string concat), sanitizar HTML del usuario, no ejecutar `eval()` con input, validar y escapar todo input.

**A04 — Insecure Design:** rate limiting en auth endpoints, account lockout tras N intentos, no exponer datos sensibles en error messages, threat modeling.

**A05 — Security Misconfiguration:** Helmet habilitado, CORS restrictivo (origins explícitos), debug mode off en producción, stack traces no expuestos.

**A06 — Vulnerable Components:** `pnpm audit` en CI, Dependabot/Renovate habilitado, verificar mantenimiento antes de instalar.

**A07 — Auth Failures:** refresh token rotation, logout invalida tokens, mensajes genéricos ("Invalid credentials"), MFA para cuentas sensibles.

**A08 — Software and Data Integrity:** lock files commiteados, verificar integridad de dependencias, CI/CD con permisos mínimos.

**A09 — Logging & Monitoring Failures:** loguear auth failures y access control failures, no loguear datos sensibles (passwords, tokens, PII), alertas para patrones sospechosos.

**A10 — SSRF:** validar URLs del usuario, no hacer fetch a URLs arbitrarias, whitelist de dominios para requests server-side.

## 2. Helmet — Security Headers

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

## 3. Input Sanitization

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

## 4. SQL Injection Prevention

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

## 5. CSRF Protection

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

## 6. Dependency Audit

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

## 7. Secrets Management

Nunca hardcodear secrets en código o config files. Variables de entorno para desarrollo. Secret manager para producción (AWS Secrets Manager, Vault). Validar que todos los secrets existen al startup (fail fast). Rotar secrets periódicamente (especialmente JWT_SECRET). `.env` en `.gitignore` siempre. `.env.example` con keys sin values.

**Checklist de archivos:** `.env` → en .gitignore, `.env.example` → en git (keys sin values), `.env.test` → en git (valores de test), `.env.local` → en .gitignore.

## 8. Resource-Level Authorization

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

## 9. Gotchas

- Helmet no instalado — headers de seguridad faltantes.
- CORS con `origin: '*'` — cualquier sitio puede hacer requests.
- Secrets en código o config files commiteados — git history los expone.
- `eval()` con input del usuario — ejecución de código arbitrario.
- `SELECT *` sin filtrar por ownership — IDOR.
- Error messages con stack trace en producción — información para atacantes.
- Passwords logueados — breach de datos.
- Sin rate limiting en `/login` — brute force.
- Dependency audit solo manual — automatizar en CI.
- Trust en headers como `X-Forwarded-For` sin proxy confiable.
- JWT secret débil (< 32 chars) o compartido entre access y refresh.

## Skills Relacionadas

| Skill | Por qué |
|-------|--------|
| `auth` | JWT, hashing, RBAC (security layer de auth) |
| `logging` | Audit logging de eventos de seguridad |
| `error-handling` | No exponer stack traces ni info interna |
| `data-validation` | Sanitización de inputs en boundaries |
| `governance/owasp-top-10` | Checklist de vulnerabilidades a prevenir |
| `governance/pci-compliance` | Si se manejan datos de pago |
