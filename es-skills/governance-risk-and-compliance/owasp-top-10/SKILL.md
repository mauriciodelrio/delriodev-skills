---
name: owasp-top-10
description: >
  Usa este skill SIEMPRE que escribas código que maneje input de usuarios,
  autenticación, acceso a datos, configuración de servidores o cualquier endpoint
  HTTP. OWASP Top 10 es el estándar de seguridad de aplicaciones web más
  reconocido globalmente y debe aplicarse como base de seguridad para cualquier
  software web independientemente de la ubicación geográfica. Cubre las 10
  vulnerabilidades críticas: Broken Access Control, Cryptographic Failures,
  Injection, Insecure Design, Security Misconfiguration, Vulnerable Components,
  Authentication Failures, Data Integrity Failures, Logging Failures y SSRF.
---

# OWASP Top 10:2021 — Vulnerabilidades Críticas en Aplicaciones Web

OWASP Top 10 lista las 10 categorías de riesgos de seguridad más críticas en aplicaciones web, basado en datos reales de brechas e incidentes. Debe aplicarse como base de seguridad para cualquier software web — si el código es resistente a estas 10 categorías, cubre la gran mayoría de ataques comunes.

## Implementación

### A01:2021 — Broken Access Control (Control de Acceso Roto)

**#1 más crítico.** Ocurre cuando un usuario puede actuar fuera de sus permisos.

```typescript
// ❌ VULNERABLE: IDOR (Insecure Direct Object Reference)
// Cualquier usuario puede ver los datos de otro cambiando el ID en la URL
router.get('/api/users/:userId/profile', async (req, res) => {
  const profile = await prisma.user.findUnique({
    where: { id: req.params.userId },
  });
  res.json(profile); // ¡Sin verificar que el usuario logueado es el dueño!
});

// ✅ SEGURO: Verificar que el usuario solo accede a sus propios datos
router.get('/api/users/:userId/profile', authenticate, async (req, res) => {
  // Verificar que el usuario autenticado es el dueño del recurso
  if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'No tienes permiso para ver este perfil' });
  }

  const profile = await prisma.user.findUnique({
    where: { id: req.params.userId },
    select: { // Minimizar datos expuestos
      id: true,
      email: true,
      name: true,
      createdAt: true,
      // NO exponer: passwordHash, internalNotes, etc.
    },
  });
  
  if (!profile) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  res.json(profile);
});

// ❌ VULNERABLE: Endpoint admin sin protección
router.delete('/api/admin/users/:userId', async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.userId } });
  res.json({ success: true });
});

// ✅ SEGURO: Verificar rol admin + logging
router.delete('/api/admin/users/:userId', 
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    await prisma.user.delete({ where: { id: req.params.userId } });
    
    logger.info({
      event: 'user_deleted',
      deletedUserId: req.params.userId,
      deletedBy: req.user.id,
    }, 'Usuario eliminado por admin');
    
    res.json({ success: true });
  }
);

// Middleware de verificación de roles
function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role)) {
      logger.warn({
        event: 'unauthorized_access_attempt',
        userId: req.user?.id,
        userRole: req.user?.role,
        requiredRoles: roles,
        path: req.originalUrl,
      }, 'Intento de acceso no autorizado');
      
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }
    next();
  };
}
```

---

### A02:2021 — Cryptographic Failures (Fallos Criptográficos)

Datos sensibles expuestos por falta de cifrado o uso de criptografía débil.

```typescript
// ❌ VULNERABLE: Almacenar contraseña en texto plano
await prisma.user.create({
  data: {
    email: input.email,
    password: input.password, // ¡NUNCA!
  },
});

// ❌ VULNERABLE: Hash débil (MD5, SHA-1)
import crypto from 'node:crypto';
const hash = crypto.createHash('md5').update(password).digest('hex'); // ¡VULNERABLE!

// ✅ SEGURO: bcrypt con cost factor adecuado
import bcrypt from 'bcrypt';
const SALT_ROUNDS = 12; // Costo computacional (10-12 recomendado)

// Hashear al crear
const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
await prisma.user.create({
  data: {
    email: input.email,
    passwordHash,
  },
});

// Verificar al hacer login
const isValid = await bcrypt.compare(inputPassword, user.passwordHash);

// ❌ VULNERABLE: JWT con algoritmo none o secret débil
import jwt from 'jsonwebtoken';
const token = jwt.sign(payload, 'secret123'); // Secret débil y hardcodeado

// ✅ SEGURO: JWT con secret fuerte y opciones estrictas
const JWT_SECRET = process.env.JWT_SECRET!; // Min 256 bits, desde env variable
const JWT_ALGORITHM = 'HS256' as const;

function signToken(payload: { userId: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: '15m',       // Access token corto
    issuer: 'mi-app',
    audience: 'mi-app-users',
  });
}

function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: [JWT_ALGORITHM], // Fijar algoritmo — previene algorithm confusion attack
    issuer: 'mi-app',
    audience: 'mi-app-users',
  });
}

// ❌ VULNERABLE: Transmitir datos sin TLS
// http://api.example.com/login (HTTP = texto plano)

// ✅ SEGURO: Siempre HTTPS + HSTS
// https://api.example.com/login (TLS 1.2+)
// Header: Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

### A03:2021 — Injection (Inyección)

Datos no confiables enviados a un intérprete como parte de un comando/query.

```typescript
// ❌ VULNERABLE: SQL Injection
const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
// Input malicioso: email = "admin@test.com' OR '1'='1' --"
// Resulta en: SELECT * FROM users WHERE email = 'admin@test.com' OR '1'='1' --' AND password = ''

// ✅ SEGURO: Queries parametrizadas (Prisma las usa automáticamente)
const user = await prisma.user.findUnique({
  where: { email: input.email }, // Prisma escapa automáticamente
});

// ✅ SEGURO: Si necesitas raw SQL, usa parametrización
const users = await prisma.$queryRaw`
  SELECT id, email, name FROM users
  WHERE email = ${email}
  AND status = ${status}
`; // Prisma parametriza los valores con tagged template literals

// ❌ VULNERABLE: NoSQL Injection (MongoDB)
const user = await db.collection('users').findOne({
  email: req.body.email,     // Si email es { "$gt": "" }, retorna el primer usuario
  password: req.body.password,
});

// ✅ SEGURO: Validar tipo de entrada
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

// Validar ANTES de usar
const validated = LoginSchema.parse(req.body);
const user = await db.collection('users').findOne({
  email: validated.email, // String garantizado, no un objeto
});

// ❌ VULNERABLE: Command Injection
import { exec } from 'node:child_process';
exec(`ping ${req.query.host}`); // Si host = "google.com; rm -rf /", ejecuta ambos comandos

// ✅ SEGURO: Usar execFile con argumentos separados (no shell)
import { execFile } from 'node:child_process';
execFile('ping', ['-c', '4', validatedHost], (error, stdout) => {
  // execFile NO usa shell, así que ; no se interpreta como separador
});

// ✅ MEJOR: Evitar ejecutar comandos del sistema. Usar librerías nativas:
import dns from 'node:dns/promises';
const result = await dns.resolve4(validatedHost);
```

---

### A04:2021 — Insecure Design (Diseño Inseguro)

Fallas a nivel de diseño y arquitectura que no se pueden arreglar solo con código.

```typescript
// ❌ DISEÑO INSEGURO: Reset de contraseña con pregunta de seguridad
// Las preguntas de seguridad son inherentemente inseguras (info pública en redes sociales)

// ✅ DISEÑO SEGURO: Reset de contraseña con token temporal por email
import crypto from 'node:crypto';

async function initiatePasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  
  // SIEMPRE responder lo mismo (no revelar si el email existe)
  if (!user) {
    return { message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.' };
  }

  // Token criptográficamente seguro
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash: resetTokenHash, // Almacenar solo el hash
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
    },
  });

  // Enviar email con el token (no almacenado)
  await sendEmail(email, `https://app.example.com/reset-password?token=${resetToken}`);

  return { message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.' };
}

// ❌ DISEÑO INSEGURO: Sin rate limiting en login
// Un atacante puede intentar millones de combinaciones

// ✅ DISEÑO SEGURO: Rate limiting + account lockout + delay progresivo
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,                    // 5 intentos por ventana
  message: { error: 'Demasiados intentos. Inténtalo de nuevo en 15 minutos.' },
  standardHeaders: true,
  keyGenerator: (req) => req.body?.email ?? req.ip, // Limitar por email, no solo IP
});

router.post('/login', loginLimiter, loginHandler);
```

---

### A05:2021 — Security Misconfiguration (Configuración Incorrecta)

```typescript
// ❌ VULNERABLE: Configuración por defecto insegura
const app = express();
// Sin helmet, sin CORS restrictivo, sin rate limit, con stack traces

// ✅ SEGURO: Configuración hardened
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

const app = express();

// Headers de seguridad
app.use(helmet());

// CORS restrictivo
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

// Desactivar info de tecnología
app.disable('x-powered-by');

// ❌ VULNERABLE: Exponer stack trace en producción
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack, // ¡NUNCA en producción!
  });
});

// ✅ SEGURO: Error handler que no filtra información interna
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  // Generar ID único para correlación
  const errorId = crypto.randomUUID();

  // Loggear detalles internos
  logger.error({
    errorId,
    error: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
  }, 'Error no manejado');

  // Responder sin información interna
  res.status(500).json({
    error: 'Error interno del servidor',
    errorId, // Para que el usuario pueda reportar el error
    // NO incluir: message, stack, detalles de DB, etc.
  });
});

// ❌ VULNERABLE: Directorio listable, archivos expuestos
app.use(express.static('public')); // Sin restricción, puede exponer .env, .git, etc.

// ✅ SEGURO: Static files con restricciones
app.use(express.static('public', {
  dotfiles: 'deny',     // Denegar archivos .env, .git, etc.
  index: false,          // No listar directorios
  maxAge: '1d',
}));
```

---

### A06:2021 — Vulnerable and Outdated Components

```typescript
// Configurar npm audit en CI/CD

// package.json — Scripts de auditoría
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
    - cron: '0 8 * * 1'    # Cada lunes a las 8 AM
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

// Política: NUNCA ignorar vulnerabilidades altas o críticas
// Si no hay fix disponible, evaluar alternativas o mitigaciones
```

---

### A07:2021 — Identification and Authentication Failures

```typescript
// ✅ Implementación robusta de autenticación

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// Schema de validación estricto
const LoginSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  password: z.string().min(8).max(128),
});

async function loginHandler(req: Request, res: Response) {
  // 1. Validar input
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Credenciales inválidas' });
  }

  const { email, password } = result.data;

  // 2. Buscar usuario
  const user = await prisma.user.findUnique({ where: { email } });

  // 3. SIEMPRE responder en tiempo constante (prevenir timing attacks)
  if (!user) {
    // Hacer hash de todos modos para igualar el timing
    await bcrypt.hash(password, 12);
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  // 4. Verificar si la cuenta está bloqueada
  if (user.lockedAt && Date.now() - user.lockedAt.getTime() < 30 * 60 * 1000) {
    return res.status(423).json({
      error: 'Cuenta temporalmente bloqueada. Intenta de nuevo en 30 minutos.',
    });
  }

  // 5. Verificar contraseña
  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    // Incrementar contador de intentos fallidos
    const failedAttempts = user.failedLoginAttempts + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: failedAttempts,
        // Bloquear después de 5 intentos
        lockedAt: failedAttempts >= 5 ? new Date() : null,
      },
    });

    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  // 6. Reset intentos fallidos
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedAt: null, lastLoginAt: new Date() },
  });

  // 7. Generar tokens
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

  // 8. Refresh token en cookie httpOnly (NO en localStorage)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,     // No accesible por JavaScript
    secure: true,       // Solo HTTPS
    sameSite: 'strict', // Protección CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    path: '/api/v1/auth/refresh', // Solo enviado a ruta de refresh
  });

  // 9. Access token en el body
  res.json({
    accessToken,
    expiresIn: 900, // 15 min en segundos
    user: { id: user.id, email: user.email, role: user.role },
  });
}
```

---

### A08:2021 — Software and Data Integrity Failures

```typescript
// ❌ VULNERABLE: Deserialización insegura
const userData = JSON.parse(req.cookies.userData); // Datos del usuario en cookie manipulable

// ✅ SEGURO: Firmar datos que vuelven del cliente
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

  // Comparación en tiempo constante (previene timing attacks)
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null; // Firma inválida — datos manipulados
  }

  return JSON.parse(json) as T;
}

// ❌ VULNERABLE: npm install sin verificar integridad
// npm install some-package (sin lockfile)

// ✅ SEGURO: Siempre usar lockfile y verificar integridad
// npm ci (usa package-lock.json, verifica hashes)
// En CI/CD siempre usar: npm ci --ignore-scripts && npm audit
```

---

### A09:2021 — Security Logging and Monitoring Failures

```typescript
// ✅ Logging de seguridad completo con Pino

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

// Eventos de seguridad que SIEMPRE deben loggearse:
const SECURITY_EVENTS = {
  // Autenticación
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILURE: 'auth.login.failure',
  LOGOUT: 'auth.logout',
  PASSWORD_CHANGE: 'auth.password.change',
  PASSWORD_RESET: 'auth.password.reset',
  MFA_ENABLED: 'auth.mfa.enabled',
  MFA_DISABLED: 'auth.mfa.disabled',
  ACCOUNT_LOCKED: 'auth.account.locked',
  
  // Autorización
  ACCESS_DENIED: 'authz.access.denied',
  PRIVILEGE_ESCALATION: 'authz.privilege.escalation',
  
  // Datos
  DATA_EXPORT: 'data.export',
  DATA_DELETE: 'data.delete',
  SENSITIVE_DATA_ACCESS: 'data.sensitive.access',
  
  // Administración
  USER_CREATED: 'admin.user.created',
  USER_DELETED: 'admin.user.deleted',
  ROLE_CHANGED: 'admin.role.changed',
  CONFIG_CHANGED: 'admin.config.changed',
  
  // Anomalías
  RATE_LIMIT_HIT: 'anomaly.rate_limit',
  INVALID_INPUT: 'anomaly.invalid_input',
  SUSPICIOUS_ACTIVITY: 'anomaly.suspicious',
} as const;

// Ejemplo de uso en código
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

// Ejemplo: loggear login exitoso
logSecurityEvent(SECURITY_EVENTS.LOGIN_SUCCESS, {
  userId: user.id,
  email: user.email,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});

// Ejemplo: loggear intento de acceso no autorizado
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
// ❌ VULNERABLE: El servidor hace request a URL proporcionada por el usuario
router.post('/api/fetch-url', async (req, res) => {
  const response = await fetch(req.body.url); // ¡El usuario puede pedir URLs internas!
  // url = "http://169.254.169.254/latest/meta-data/" → expone credenciales AWS
  // url = "http://localhost:5432/" → accede a la base de datos interna
  const data = await response.text();
  res.json({ data });
});

// ✅ SEGURO: Validar y restringir URLs permitidas
import { URL } from 'node:url';
import dns from 'node:dns/promises';

const BLOCKED_IP_RANGES = [
  /^127\./,              // Loopback
  /^10\./,               // Clase A privada
  /^172\.(1[6-9]|2\d|3[01])\./, // Clase B privada
  /^192\.168\./,         // Clase C privada
  /^169\.254\./,         // Link-local (AWS metadata!)
  /^0\./,                // Red actual
  /^::1$/,               // IPv6 loopback
  /^fd[0-9a-f]{2}:/i,   // IPv6 privada
];

const ALLOWED_PROTOCOLS = ['https:'];
const ALLOWED_DOMAINS_REGEX = /^[\w.-]+\.(com|org|net|io|dev)$/; // Solo dominios públicos

async function validateExternalUrl(urlString: string): Promise<{ valid: boolean; error?: string }> {
  let parsed: URL;
  
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, error: 'URL inválida' };
  }

  // 1. Solo protocolos permitidos
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    return { valid: false, error: `Protocolo no permitido: ${parsed.protocol}` };
  }

  // 2. No permitir IPs directas
  if (/^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname)) {
    return { valid: false, error: 'No se permiten IPs directas' };
  }

  // 3. Resolver DNS y verificar que no apunte a IPs internas
  try {
    const addresses = await dns.resolve4(parsed.hostname);
    for (const ip of addresses) {
      if (BLOCKED_IP_RANGES.some(range => range.test(ip))) {
        return { valid: false, error: 'La URL resuelve a una dirección interna bloqueada' };
      }
    }
  } catch {
    return { valid: false, error: 'No se pudo resolver el dominio' };
  }

  return { valid: true };
}

// Uso seguro
router.post('/api/fetch-url', async (req, res) => {
  const validation = await validateExternalUrl(req.body.url);
  
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const response = await fetch(req.body.url, {
    redirect: 'error', // No seguir redirecciones (podrían ir a URLs internas)
    signal: AbortSignal.timeout(5000), // Timeout de 5 segundos
  });

  const data = await response.text();
  res.json({ data: data.substring(0, 10000) }); // Limitar respuesta
});
```

---

## Middleware Integral de Seguridad

```typescript
// middleware/security.middleware.ts
// Middleware que combina protecciones contra múltiples vulnerabilidades OWASP

import express, { Request, Response, NextFunction, Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

export function applyOWASPSecurity(app: Express) {
  // A05: Headers de seguridad
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

  // A05: CORS restrictivo
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
    credentials: true,
  }));

  // A04/A07: Rate limiting general
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // Rate limiting específico para auth (más restrictivo)
  app.use('/api/*/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Demasiados intentos de autenticación' },
  }));

  // A05: Desactivar fingerprinting
  app.disable('x-powered-by');

  // A03: Limitar tamaño de request body
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
}

/**
 * Middleware genérico de sanitización de input.
 * Aplicar en rutas que reciben datos del usuario.
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  // Función recursiva para sanitizar strings en objetos
  function sanitize(obj: unknown): unknown {
    if (typeof obj === 'string') {
      return obj
        .replace(/[<>]/g, '') // Eliminar < y > básicos (para XSS básico)
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

## Flujo de trabajo del agente

1. Verificar control de acceso en toda ruta: autenticación + autorización + verificación de propiedad del recurso (A01).
2. Aplicar criptografía correcta: bcrypt/argon2 para passwords (nunca MD5/SHA1), JWT con secret fuerte y algoritmo fijo, TLS en tránsito (A02).
3. Usar queries parametrizadas (Prisma/ORM), validar todo input con schemas Zod, evitar exec/eval con input de usuario (A03).
4. Diseñar con rate limiting, account lockout tras 5 intentos, reset de password con token temporal hasheado, y respuestas en tiempo constante para prevenir timing attacks (A04, A07).
5. Aplicar middleware integral de seguridad: helmet + CSP, CORS restrictivo, rate limiting, x-powered-by desactivado, body limit 1mb, errores genéricos sin stack traces (A05).
6. Configurar npm audit / Snyk en CI/CD, lockfile con integridad, firmar datos que vuelven del cliente con HMAC-SHA256 (A06, A08).
7. Implementar logging de eventos de seguridad (login, acceso denegado, cambios de rol, exports) con redacción de datos sensibles (A09).
8. Validar URLs externas: solo HTTPS, resolver DNS para bloquear IPs internas (169.254.x, 10.x, 127.x, 192.168.x), no seguir redirects, timeout 5s (A10).
9. Validar contra el checklist de cumplimiento (A01—A10) antes de desplegar.

## Gotchas

Nunca confiar en datos del cliente (params, body, headers, cookies) — todo input es potencialmente malicioso. Nunca construir queries SQL con concatenación de strings; usar siempre ORM o queries parametrizadas. Nunca almacenar secretos en código fuente. Nunca exponer stack traces en producción — loggear internamente con errorId y responder genéricamente al usuario. Nunca usar eval(), new Function() o child_process.exec() con input de usuario — usar execFile con argumentos separados o librerías nativas. Nunca almacenar tokens sensibles en localStorage — usar cookies httpOnly + secure + sameSite strict. Nunca desactivar CSRF protection sin justificación. JWT debe tener algoritmo fijo (prevenir algorithm confusion attack), expiresIn corto (15min para access token), y el secret debe tener mínimo 256 bits desde variable de entorno. El refresh token va en cookie httpOnly con path restringido a la ruta de refresh. Las respuestas de login/reset deben ser idénticas para email válido e inválido (prevenir user enumeration). Para SSRF, resolver DNS antes de hacer fetch — las IPs privadas y link-local (169.254.x para AWS metadata) deben bloquearse. No confiar en headers X-Forwarded-For sin validación. No servir contenido mixto HTTP + HTTPS.

---

## Checklist OWASP Top 10

- [ ] A01: Control de acceso verificado en toda ruta (autenticación + autorización)
- [ ] A02: Contraseñas hasheadas con bcrypt/argon2, datos encriptados, TLS activo
- [ ] A03: Queries parametrizadas, input validado con schemas, sin exec con input de usuario
- [ ] A04: Rate limiting, account lockout, reset passwords seguro, threat modeling
- [ ] A05: Helmet, CORS, x-powered-by desactivado, errores genéricos, sin archivos expuestos
- [ ] A06: npm audit en CI/CD, dependencias actualizadas, escaneo regular
- [ ] A07: MFA disponible, JWT seguro, refresh tokens en httpOnly cookies, session timeout
- [ ] A08: Datos del cliente firmados, lockfile con integridad, CSP configurado
- [ ] A09: Logging de eventos de seguridad, monitoreo de anomalías, alertas configuradas
- [ ] A10: Validación de URLs externas, bloqueo de IPs internas, no seguir redirects ciegos

---

## Referencias y Recursos

- [OWASP Top 10:2021 Official](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP ASVS (Application Security Verification Standard)](https://owasp.org/www-project-application-security-verification-standard/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
