---
name: security-rules
description: >
  Reglas de seguridad para aplicaciones frontend React/Next.js. Cubre prevención
  de XSS, Content Security Policy, sanitización de input, CORS, almacenamiento
  seguro de tokens, protección CSRF, y headers de seguridad.
---

# 🔒 Seguridad Frontend — Reglas

## Principio Rector

> **Nunca confiar en el input del usuario.** Validar en server, sanitizar en client.
> Los headers de seguridad son obligatorios, no opcionales.

---

## 1. Prevención de XSS

```tsx
// ✅ React escapa HTML por defecto — esto es SEGURO
function UserGreeting({ name }: { name: string }) {
  return <p>Hola, {name}</p>;  // XSS-safe: React escapa el contenido
}

// ❌ PELIGRO: dangerouslySetInnerHTML — NUNCA con input de usuario
function UnsafeContent({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;  // ❌ XSS directo
}

// ✅ Si NECESITAS renderizar HTML (markdown, CMS), sanitizar:
import DOMPurify from 'dompurify';

function SafeContent({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// ✅ Links: validar href para evitar javascript: protocol
function SafeLink({ href, children }: { href: string; children: ReactNode }) {
  const isValid = /^https?:\/\//.test(href) || href.startsWith('/');

  if (!isValid) {
    return <span>{children}</span>; // No renderizar como link
  }

  return (
    <a href={href} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  );
}
```

---

## 2. Content Security Policy (CSP)

```typescript
// middleware.ts — CSP con nonce para scripts inline
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,  // Tailwind necesita inline styles
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

// app/layout.tsx — Pasar nonce a Scripts
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

---

## 3. Headers de Seguridad

```typescript
// next.config.mjs
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

---

## 4. Almacenamiento Seguro de Tokens

```typescript
// ✅ Auth tokens en httpOnly cookies (NO localStorage)
// Server Action o Route Handler para login:
import { cookies } from 'next/headers';

export async function loginAction(formData: FormData) {
  const response = await authApi.login({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  const cookieStore = await cookies();
  cookieStore.set('session', response.token, {
    httpOnly: true,       // ❗ No accesible desde JS
    secure: true,         // Solo HTTPS
    sameSite: 'lax',      // Protección CSRF
    maxAge: 60 * 60 * 24, // 24 horas
    path: '/',
  });
}

// ❌ NUNCA almacenar tokens en:
// - localStorage        → accesible desde cualquier JS (XSS → robo de tokens)
// - sessionStorage      → mismo problema
// - cookies sin httpOnly → accesible desde document.cookie
// - URL query params    → se logean en historial/servidor

// ✅ Refresh token rotation
// El backend emite nuevo refresh token en cada uso del anterior.
// Si un refresh token se usa dos veces → invalidar todos los tokens del usuario.
```

---

## 5. Validación de Input

```typescript
// ✅ Validar en AMBOS lados con Zod (schema compartido)
import { z } from 'zod';

// Schema compartido (importado en client Y server)
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

  // parsed.data es SEGURO — tipo inferido + sanitizado
  await db.comment.create({ data: parsed.data });
}
```

---

## 6. CORS y API Routes

```typescript
// app/api/[...]/route.ts — CORS explícito
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL!,
  // agregar otros orígenes permitidos
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

---

## 7. Variables de Entorno

```typescript
// ✅ Validar env vars al iniciar la app
// env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_API_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);

// ✅ Reglas de env vars:
// - NEXT_PUBLIC_* → visible en client (NUNCA poner secrets aquí)
// - Sin prefijo → solo server (seguro)
// - Validar con Zod al inicio (fail fast)
// - .env.local en .gitignore
// - .env.example con valores placeholder committeado
```

---

## Anti-patrones

```typescript
// ❌ dangerouslySetInnerHTML con input de usuario sin sanitizar
// ❌ Tokens en localStorage/sessionStorage
// ❌ eval(), new Function(), innerHTML con datos dinámicos
// ❌ CORS: Access-Control-Allow-Origin: '*' en producción
// ❌ API keys/secrets en NEXT_PUBLIC_* vars
// ❌ Confiar solo en validación client-side
// ❌ Links sin rel="noopener noreferrer" para target="_blank"
// ❌ Deshabilitar CSP "porque causa problemas" (fixear la policy)
// ❌ console.log de datos sensibles
```
