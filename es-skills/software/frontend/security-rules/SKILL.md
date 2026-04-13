---
name: security-rules
description: >
  Usa esta skill cuando implementes seguridad en aplicaciones React/Next.js:
  prevención de XSS, Content Security Policy, sanitización de input,
  CORS, almacenamiento seguro de tokens, headers de seguridad, y env vars.
---

# Seguridad Frontend — Reglas

## Flujo de trabajo del agente

1. Validar TODO input del usuario con Zod en server. Client-side validation es solo UX (sección 5).
2. Tokens de auth en httpOnly cookies, nunca localStorage (sección 4).
3. CSP con nonce para scripts inline vía middleware (sección 2).
4. Headers de seguridad en `next.config` (sección 3).
5. `dangerouslySetInnerHTML` solo con DOMPurify. Validar `href` contra `javascript:` (sección 1).
6. CORS explícito con whitelist de orígenes (sección 6).
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

## 4. Almacenamiento Seguro de Tokens

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
- API keys/secrets en `NEXT_PUBLIC_*` quedan expuestas en el bundle del cliente.
- Confiar solo en validación client-side — el server SIEMPRE debe re-validar.
- Links con `target="_blank"` sin `rel="noopener noreferrer"`.
- Deshabilitar CSP "porque causa problemas" — corregir la policy.
- `console.log` de datos sensibles en producción.
