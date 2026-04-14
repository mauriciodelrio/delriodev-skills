---
name: security-rules
description: >
  Usa esta skill cuando implementes seguridad en aplicaciones frontend:
  prevención de XSS, CSP, sanitización de input, CORS, almacenamiento
  seguro de tokens (httpOnly cookies en Next.js, memoria en SPA),
  headers de seguridad, env vars, y cross-reference con GRC skills.
---

# Seguridad Frontend — Reglas

## Cross-references obligatorias

| Skill GRC | Cuándo activar |
|-----------|---------------|
| [`owasp-top-10`](../../../governance-risk-and-compliance/owasp-top-10/SKILL.md) | **Siempre** en cualquier desarrollo frontend que maneje input de usuario o autenticación. |
| [`gdpr`](../../../governance-risk-and-compliance/gdpr/SKILL.md) | Cuando el frontend capture datos personales, implemente cookies de tracking, o consentimiento. |
| [`ccpa-cpra`](../../../governance-risk-and-compliance/ccpa-cpra/SKILL.md) | Cuando se implemente opt-out de venta/compartición de datos o detección de señal GPC del navegador. |

## Flujo de trabajo del agente

1. Detectar tipo de proyecto: Next.js → secciones 2-4 + 4A. Vite SPA → sección 4B.
2. Validar TODO input del usuario con Zod en server. Client-side validation es solo UX (sección 5).
3. **Next.js**: Tokens de auth en httpOnly cookies, nunca localStorage (sección 4A).
4. **Vite SPA**: Tokens en memoria (variable/signal), nunca localStorage (sección 4B).
5. **Next.js**: CSP con nonce para scripts inline vía middleware (sección 2).
6. **Next.js**: Headers de seguridad en `next.config` (sección 3).
7. `dangerouslySetInnerHTML` solo con DOMPurify. Validar `href` contra `javascript:` (sección 1).
8. CORS explícito con whitelist de orígenes (sección 6).
9. Consultar `governance-risk-and-compliance` → `owasp-top-10` para checklist de vulnerabilidades.
10. Env vars validadas con Zod al inicio. Secrets nunca en `NEXT_PUBLIC_*` ni `VITE_*` (sección 7).
7. Env vars validadas con Zod al inicio. Secrets nunca en `NEXT_PUBLIC_*` (sección 7).

## 1. Prevención de XSS

```tsx
// React escapa HTML por defecto — seguro contra XSS
function UserGreeting({ name }: { name: string }) {
  return <p>Hola, {name}</p>;
}

// Si NECESITAS renderizar HTML (markdown, CMS), sanitizar con DOMPurify:
import DOMPurify from 'dompurify';

function SafeContent({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// Validar href para evitar javascript: protocol
function SafeLink({ href, children }: { href: string; children: ReactNode }) {
  const isValid = /^https?:\/\//.test(href) || href.startsWith('/');

  if (!isValid) {
    return <span>{children}</span>;
  }

  return (
    <a href={href} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  );
}
```

## 2. Content Security Policy (CSP)

```typescript
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: https:`,
    `font-src 'self'`,
    `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ');

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('x-nonce', nonce);

  return response;
}

// Pasar nonce a Scripts
import { headers } from 'next/headers';
import Script from 'next/script';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') ?? '';

  return (
    <html lang="es">
      <body>
        {children}
        <Script src="https://analytics.example.com/script.js" nonce={nonce} />
      </body>
    </html>
  );
}
```

## 3. Headers de Seguridad

```typescript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self)',
  },
];

export default {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

## 4A. Almacenamiento Seguro de Tokens — Next.js (httpOnly Cookies)

```typescript
// Auth tokens en httpOnly cookies (NO localStorage)
import { cookies } from 'next/headers';

export async function loginAction(formData: FormData) {
  const response = await authApi.login({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  const cookieStore = await cookies();
  cookieStore.set('session', response.token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });
}
```

Nunca almacenar tokens en localStorage, sessionStorage, cookies sin httpOnly, ni URL query params. Implementar refresh token rotation: si un refresh token se usa dos veces, invalidar todos los tokens del usuario.

## 4B. Almacenamiento Seguro de Tokens — Vite SPA (En Memoria)

En un SPA puro donde no controlas el server (no puedes setear httpOnly cookies), el token se almacena **en memoria** (variable JavaScript, signal, o store de estado). Esto es más seguro que localStorage porque:
- No es accesible desde XSS vía `document.cookie` o `localStorage.getItem()`
- Se pierde al cerrar la pestaña (el usuario debe re-autenticarse)

```typescript
// features/auth/services/auth.service.ts
import { signal } from '@preact/signals-react';

interface AuthState {
  token: string | null;
  user: { id: string; email: string; name: string } | null;
}

// El token vive SOLO en memoria — se pierde al cerrar/refrescar
const authState = signal<AuthState>({ token: null, user: null });

export function setAuth(token: string, user: AuthState['user']) {
  authState.value = { token, user };
}

export function clearAuth() {
  authState.value = { token: null, user: null };
}

export function getToken(): string | null {
  return authState.value.token;
}
```

La implementación completa del `apiClient` (con `ApiError` tipado, inyección de token, auto-clear en 401 y normalización de errores) está en [`fetching-rules` §6](../fetching-rules/SKILL.md). Es la **única fuente de verdad** para el API client — no duplicar aquí.

**Regla clave SPA:** El token en memoria se pierde al refrescar la página. Si la API soporta refresh tokens, implementar un endpoint que devuelva un nuevo access token vía httpOnly cookie (set desde el backend). Si no hay refresh token, el usuario debe re-autenticarse.

## 5. Validación de Input

```typescript
import { z } from 'zod';

// Schema compartido (client + server)
export const commentSchema = z.object({
  content: z
    .string()
    .min(1, 'El comentario no puede estar vacío')
    .max(2000, 'Máximo 2000 caracteres')
    .transform((val) => val.trim()),
  parentId: z.string().uuid().optional(),
});

// Server Action — SIEMPRE re-validar
export async function createComment(_: unknown, formData: FormData) {
  const parsed = commentSchema.safeParse({
    content: formData.get('content'),
    parentId: formData.get('parentId'),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // parsed.data es seguro — tipo inferido + sanitizado
  await db.comment.create({ data: parsed.data });
}
```

## 6. CORS y API Routes

```typescript
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL!,
];

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin');

  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(null, { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
```

## 7. Variables de Entorno

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_API_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
```

Reglas: `NEXT_PUBLIC_*` es visible en client (nunca secrets), sin prefijo es solo server. Validar con Zod al inicio (fail fast). `.env.local` en `.gitignore`, `.env.example` committeado.

## Gotchas

- `dangerouslySetInnerHTML` con input de usuario sin DOMPurify = XSS directo.
- `eval()`, `new Function()`, `innerHTML` con datos dinámicos = vector de ataque.
- `Access-Control-Allow-Origin: '*'` en producción expone la API a cualquier origen.
- **Vite SPA + API local:** El dev server de Vite corre en `localhost:5173` mientras la API suele correr en `localhost:3000`. CORS bloqueará las requests a menos que la API configure el origin correcto (ej: `CORS_ORIGIN=http://localhost:5173`). No usar `proxy` de Vite como workaround en producción — configurar CORS correctamente en el backend.
- API keys/secrets en `NEXT_PUBLIC_*` quedan expuestas en el bundle del cliente.
- Confiar solo en validación client-side — el server SIEMPRE debe re-validar.
- Links con `target="_blank"` sin `rel="noopener noreferrer"`.
- Deshabilitar CSP "porque causa problemas" — corregir la policy.
- `console.log` de datos sensibles en producción.
