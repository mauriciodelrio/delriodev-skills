---
name: nextjs-best-practices
description: >
  Best practices for Next.js 15+ with App Router. Covers Server Actions,
  middleware, caching (Data Cache, Full Route Cache, Router Cache),
  next/image, next/font, metadata API, route handlers, and architecture
  patterns for production-ready applications.
---

# ▲ Next.js — Best Practices

## Guiding Principle

> **Server-first architecture.** Everything is a Server Component by default.
> Use `'use client'` and `'use server'` as explicit boundaries.

---

## 1. Server Actions

```tsx
// ✅ Server Action — mutations from Client Components
// features/products/actions/createProduct.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().positive(),
  description: z.string().max(2000).optional(),
});

export async function createProduct(formData: FormData) {
  // ALWAYS validate on the server
  const parsed = createProductSchema.safeParse({
    name: formData.get('name'),
    price: Number(formData.get('price')),
    description: formData.get('description'),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await db.product.create({ data: parsed.data });

  revalidatePath('/products');
  redirect('/products');
}

// ✅ Usage in Client Component with useActionState
'use client';

import { useActionState } from 'react';
import { createProduct } from '../actions/createProduct';

export function CreateProductForm() {
  const [state, action, isPending] = useActionState(createProduct, null);

  return (
    <form action={action}>
      <input name="name" required />
      {state?.error?.name && <p className="text-red-600">{state.error.name}</p>}

      <input name="price" type="number" step="0.01" required />

      <Button type="submit" isLoading={isPending}>
        Create product
      </Button>
    </form>
  );
}
```

---

## 2. Middleware

```tsx
// middleware.ts (project root)
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Auth redirect
  const token = request.cookies.get('session');
  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. i18n locale detection
  const locale = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] ?? 'en';

  // 3. Security headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    // Exclude static files and internal API routes
    '/((?!_next/static|_next/image|favicon.ico|api/health).*)',
  ],
};
```

---

## 3. Caching — The 4 Levels

```tsx
// Level 1: Request Memoization (automatic)
// Same fetch() in multiple Server Components = 1 single request
async function Layout({ children }) {
  const user = await getUser(); // fetch #1
  return <>{children}</>;
}
async function Page() {
  const user = await getUser(); // Reuses result from #1 (deduplicated)
  return <Profile user={user} />;
}

// Level 2: Data Cache (persistent, opt-out with no-store)
// ✅ Cached by default
const data = await fetch('https://api.example.com/products');

// ✅ Revalidate every hour
const data = await fetch(url, { next: { revalidate: 3600 } });

// ✅ Invalidate on-demand with tags
const data = await fetch(url, { next: { tags: ['products'] } });
// In Server Action: revalidateTag('products');

// ✅ Opt-out — no caching
const data = await fetch(url, { cache: 'no-store' });

// Level 3: Full Route Cache (static HTML + RSC payload)
// Automatic for routes that don't use headers(), cookies(), searchParams
// Opt-out: export const dynamic = 'force-dynamic';

// Level 4: Router Cache (client-side, route prefetch)
// Automatic with <Link>. Invalidated with router.refresh()

// ✅ Manual cache for functions that DON'T use fetch
import { unstable_cache } from 'next/cache';

const getCachedUser = unstable_cache(
  async (userId: string) => db.user.findUnique({ where: { id: userId } }),
  ['user-by-id'], // cache key
  { revalidate: 600, tags: ['users'] },
);
```

---

## 4. Image Optimization

```tsx
// ✅ ALWAYS use next/image
import Image from 'next/image';

// Image with known dimensions
<Image
  src="/hero.webp"
  alt="Product hero banner"
  width={1200}
  height={630}
  priority          // LCP — load without lazy loading
  quality={85}
  placeholder="blur"
  blurDataURL={blurHash}
/>

// Responsive image (fill mode)
<div className="relative aspect-video">
  <Image
    src={product.imageUrl}
    alt={product.name}
    fill
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    className="object-cover rounded-lg"
  />
</div>

// ❌ NEVER
<img src={url} />                    // Not optimized
<Image src={url} alt="" />           // Empty alt (a11y)
<Image src={url} width={0} height={0} style={{ width: '100%' }} /> // Hack
```

---

## 5. Optimized Fonts

```tsx
// app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}

// tailwind.config.ts
// theme: { fontFamily: { sans: ['var(--font-sans)'], mono: ['var(--font-mono)'] } }
```

---

## 6. Metadata API

```tsx
// app/layout.tsx — global metadata
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://myapp.com'),
  title: {
    template: '%s | MyApp',
    default: 'MyApp — Management Platform',
  },
  description: 'Leading enterprise management platform',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'MyApp',
  },
};

// app/products/[id]/page.tsx — dynamic metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });

  return {
    title: product?.name,
    description: product?.description?.slice(0, 160),
    openGraph: {
      images: product?.imageUrl ? [{ url: product.imageUrl }] : [],
    },
  };
}
```

---

## 7. Route Handlers (API Routes)

```tsx
// app/api/products/route.ts
import { NextResponse, type NextRequest } from 'next/server';

// GET with caching
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 100);

  const products = await db.product.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(products, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}

// POST with validation
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createProductSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const product = await db.product.create({ data: parsed.data });
  return NextResponse.json(product, { status: 201 });
}
```

---

## Next.js Anti-patterns

```tsx
// ❌ 'use client' on high-level layouts
// ❌ Server Actions that return JSX (only return data)
// ❌ fetch() in Client Components when it could be a Server Component
// ❌ Not using next/image's Image component
// ❌ middleware.ts with heavy logic (DB queries, slow fetches)
// ❌ Ignoring the cache hierarchy (Data → Route → Router)
// ❌ revalidatePath('/') to invalidate everything (be granular with tags)
// ❌ Using API routes for what should be a Server Action
```
