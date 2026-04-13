---
name: security-rules
description: >
  Use this skill when implementing security in frontend applications:
  XSS prevention, CSP, input sanitization, CORS, secure token storage
  (httpOnly cookies in Next.js, in-memory for SPA), security headers,
  env vars, and cross-reference with GRC skills.
---

# Frontend Security — Rules

## Mandatory cross-references

| GRC Skill | When to activate |
|-----------|-----------------|
| [`owasp-top-10`](../../../governance-risk-and-compliance/owasp-top-10/SKILL.md) | **Always** in any frontend development handling user input or authentication. |
| [`gdpr`](../../../governance-risk-and-compliance/gdpr/SKILL.md) | When the frontend captures personal data, implements tracking cookies, or consent. |
| [`ccpa-cpra`](../../../governance-risk-and-compliance/ccpa-cpra/SKILL.md) | When implementing data sale/sharing opt-out or detecting the browser GPC signal. |

## Agent workflow

1. Detect project type: Next.js → sections 2-4 + 4A. Vite SPA → section 4B.
2. Validate ALL user input with Zod on server. Client-side validation is UX only (section 5).
3. **Next.js**: Auth tokens in httpOnly cookies, never localStorage (section 4A).
4. **Vite SPA**: Tokens in memory (variable/signal), never localStorage (section 4B).
5. **Next.js**: CSP with nonce for inline scripts via middleware (section 2).
6. **Next.js**: Security headers in `next.config` (section 3).
7. `dangerouslySetInnerHTML` only with DOMPurify. Validate `href` against `javascript:` (section 1).
8. Explicit CORS with origin whitelist (section 6).
9. Consult `governance-risk-and-compliance` → `owasp-top-10` for vulnerability checklist.
10. Env vars validated with Zod at startup. Secrets never in `NEXT_PUBLIC_*` or `VITE_*` (section 7).
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

## 4A. Secure Token Storage — Next.js (httpOnly Cookies)

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

## 4B. Secure Token Storage — Vite SPA (In Memory)

In a pure SPA where you don't control the server (can't set httpOnly cookies), the token is stored **in memory** (JavaScript variable, signal, or state store). This is more secure than localStorage because:
- It's not accessible from XSS via `document.cookie` or `localStorage.getItem()`
- It's lost when the tab closes (user must re-authenticate)

```typescript
// features/auth/services/auth.service.ts
import { signal } from '@preact/signals-react';

interface AuthState {
  token: string | null;
  user: { id: string; email: string; name: string } | null;
}

// Token lives ONLY in memory — lost on close/refresh
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

```typescript
// shared/lib/api-client.ts — Inject token automatically
import { getToken, clearAuth } from '@features/auth';
import { env } from '@config/env';

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${env.VITE_API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuth(); // Token expired → clear state
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }

  return response.json();
}
```

**Key SPA rule:** The in-memory token is lost on page refresh. If the API supports refresh tokens, implement an endpoint that returns a new access token via httpOnly cookie (set from the backend). If there's no refresh token, the user must re-authenticate.

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
