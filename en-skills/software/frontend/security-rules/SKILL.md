---
name: security-rules
description: >
  Security rules for React/Next.js frontend applications. Covers XSS prevention,
  Content Security Policy, input sanitization, CORS, secure token storage,
  CSRF protection, and security headers.
---

# 🔒 Frontend Security — Rules

## Guiding Principle

> **Never trust user input.** Validate on server, sanitize on client.
> Security headers are mandatory, not optional.

---

## 1. XSS Prevention

```tsx
// ✅ React escapes HTML by default — this is SAFE
function UserGreeting({ name }: { name: string }) {
  return <p>Hello, {name}</p>;  // XSS-safe: React escapes the content
}

// ❌ DANGER: dangerouslySetInnerHTML — NEVER with user input
function UnsafeContent({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;  // ❌ Direct XSS
}

// ✅ If you NEED to render HTML (markdown, CMS), sanitize:
import DOMPurify from 'dompurify';

function SafeContent({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// ✅ Links: validate href to prevent javascript: protocol
function SafeLink({ href, children }: { href: string; children: ReactNode }) {
  const isValid = /^https?:\/\//.test(href) || href.startsWith('/');

  if (!isValid) {
    return <span>{children}</span>; // Don't render as link
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
// middleware.ts — CSP with nonce for inline scripts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,  // Tailwind needs inline styles
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

// app/layout.tsx — Pass nonce to Scripts
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

---

## 3. Security Headers

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

## 4. Secure Token Storage

```typescript
// ✅ Auth tokens in httpOnly cookies (NOT localStorage)
// Server Action or Route Handler for login:
import { cookies } from 'next/headers';

export async function loginAction(formData: FormData) {
  const response = await authApi.login({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  const cookieStore = await cookies();
  cookieStore.set('session', response.token, {
    httpOnly: true,       // ❗ Not accessible from JS
    secure: true,         // HTTPS only
    sameSite: 'lax',      // CSRF protection
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

// ❌ NEVER store tokens in:
// - localStorage        → accessible from any JS (XSS → token theft)
// - sessionStorage      → same problem
// - cookies without httpOnly → accessible from document.cookie
// - URL query params    → logged in history/server

// ✅ Refresh token rotation
// The backend issues a new refresh token on each use of the previous one.
// If a refresh token is used twice → invalidate all user tokens.
```

---

## 5. Input Validation

```typescript
// ✅ Validate on BOTH sides with Zod (shared schema)
import { z } from 'zod';

// Shared schema (imported in client AND server)
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

  // parsed.data is SAFE — inferred type + sanitized
  await db.comment.create({ data: parsed.data });
}
```

---

## 6. CORS and API Routes

```typescript
// app/api/[...]/route.ts — explicit CORS
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL!,
  // add other allowed origins
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

## 7. Environment Variables

```typescript
// ✅ Validate env vars at app startup
// env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_API_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);

// ✅ Env var rules:
// - NEXT_PUBLIC_* → visible on client (NEVER put secrets here)
// - Without prefix → server only (safe)
// - Validate with Zod at startup (fail fast)
// - .env.local in .gitignore
// - .env.example with placeholder values committed
```

---

## Anti-patterns

```typescript
// ❌ dangerouslySetInnerHTML with unsanitized user input
// ❌ Tokens in localStorage/sessionStorage
// ❌ eval(), new Function(), innerHTML with dynamic data
// ❌ CORS: Access-Control-Allow-Origin: '*' in production
// ❌ API keys/secrets in NEXT_PUBLIC_* vars
// ❌ Trusting only client-side validation
// ❌ Links without rel="noopener noreferrer" for target="_blank"
// ❌ Disabling CSP "because it causes problems" (fix the policy)
// ❌ console.log of sensitive data
```
