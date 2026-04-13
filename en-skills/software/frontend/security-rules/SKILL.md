---
name: security-rules
description: >
  Use this skill when implementing security in React/Next.js applications:
  XSS prevention, Content Security Policy, input sanitization, CORS,
  secure token storage, security headers, and env vars.
---

# Frontend Security — Rules

## Agent workflow

1. Validate ALL user input with Zod on server. Client-side validation is UX only (section 5).
2. Auth tokens in httpOnly cookies, never localStorage (section 4).
3. CSP with nonce for inline scripts via middleware (section 2).
4. Security headers in `next.config` (section 3).
5. `dangerouslySetInnerHTML` only with DOMPurify. Validate `href` against `javascript:` (section 1).
6. Explicit CORS with origin whitelist (section 6).
7. Env vars validated with Zod at startup. Secrets never in `NEXT_PUBLIC_*` (section 7).

## 1. XSS Prevention

```tsx
// React escapes HTML by default — safe against XSS
function UserGreeting({ name }: { name: string }) {
  return <p>Hello, {name}</p>;
}

// If you NEED to render HTML (markdown, CMS), sanitize with DOMPurify:
import DOMPurify from 'dompurify';

function SafeContent({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// Validate href to prevent javascript: protocol
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

// Pass nonce to Scripts
import { headers } from 'next/headers';
import Script from 'next/script';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') ?? '';

  return (
    <html lang="en">
      <body>
        {children}
        <Script src="https://analytics.example.com/script.js" nonce={nonce} />
      </body>
    </html>
  );
}
```

## 3. Security Headers

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

## 4. Secure Token Storage

```typescript
// Auth tokens in httpOnly cookies (NOT localStorage)
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

Never store tokens in localStorage, sessionStorage, cookies without httpOnly, or URL query params. Implement refresh token rotation: if a refresh token is used twice, invalidate all user tokens.

## 5. Input Validation

```typescript
import { z } from 'zod';

// Shared schema (client + server)
export const commentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Maximum 2000 characters')
    .transform((val) => val.trim()),
  parentId: z.string().uuid().optional(),
});

// Server Action — ALWAYS re-validate
export async function createComment(_: unknown, formData: FormData) {
  const parsed = commentSchema.safeParse({
    content: formData.get('content'),
    parentId: formData.get('parentId'),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // parsed.data is safe — inferred type + sanitized
  await db.comment.create({ data: parsed.data });
}
```

## 6. CORS and API Routes

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

## 7. Environment Variables

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_API_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
```

Rules: `NEXT_PUBLIC_*` is visible on client (never secrets), without prefix is server only. Validate with Zod at startup (fail fast). `.env.local` in `.gitignore`, `.env.example` committed.

## Gotchas

- `dangerouslySetInnerHTML` with user input without DOMPurify = direct XSS.
- `eval()`, `new Function()`, `innerHTML` with dynamic data = attack vector.
- `Access-Control-Allow-Origin: '*'` in production exposes the API to any origin.
- API keys/secrets in `NEXT_PUBLIC_*` are exposed in the client bundle.
- Trusting only client-side validation — the server MUST always re-validate.
- Links with `target="_blank"` without `rel="noopener noreferrer"`.
- Disabling CSP "because it causes problems" — fix the policy.
- `console.log` of sensitive data in production.
