---
name: nextjs-best-practices
description: >
  Use this skill when developing with Next.js 15+ App Router:
  Server Actions, middleware, caching (Data/Route/Router Cache),
  next/image, next/font, metadata API, route handlers, and
  production-ready architecture patterns.
---

# Next.js — Best Practices

## Agent workflow

1. Everything is a Server Component by default. Add `'use client'` only when interactivity is needed.
2. Server Actions for mutations with Zod validation + `revalidatePath`/`revalidateTag` (section 1).
3. Middleware for auth redirects and security headers (section 2).
4. Know the 4 cache levels: Request Memoization → Data Cache → Full Route Cache → Router Cache (section 3).
5. `next/image` with `sizes` + `priority` for LCP, `next/font` with CSS variables (sections 4-5).
6. Static Metadata API in layouts, `generateMetadata` dynamic in pages (section 6).
7. Route handlers for public APIs; prefer Server Actions for internal mutations (section 7).

## 1. Server Actions

```tsx
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

## 2. Middleware

```tsx
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
    '/((?!_next/static|_next/image|favicon.ico|api/health).*)',
  ],
};
```

## 3. Caching — The 4 Levels

```tsx
// Level 1: Request Memoization (automatic)
async function Layout({ children }) {
  const user = await getUser();
  return <>{children}</>;
}
async function Page() {
  const user = await getUser(); // Reuses result from Layout (deduplicated)
  return <Profile user={user} />;
}

// Level 2: Data Cache (persistent, opt-out with no-store)
const data = await fetch('https://api.example.com/products');
const data = await fetch(url, { next: { revalidate: 3600 } });
const data = await fetch(url, { next: { tags: ['products'] } });
const data = await fetch(url, { cache: 'no-store' });

// Level 3: Full Route Cache (static HTML + RSC payload)
// Automatic if route doesn't use headers(), cookies(), searchParams

// Level 4: Router Cache (client-side, prefetch via <Link>)
// Invalidated with router.refresh()

// Manual cache for functions without fetch
import { unstable_cache } from 'next/cache';

const getCachedUser = unstable_cache(
  async (userId: string) => db.user.findUnique({ where: { id: userId } }),
  ['user-by-id'],
  { revalidate: 600, tags: ['users'] },
);
```

## 4. Image Optimization

```tsx
import Image from 'next/image';
<Image
  src="/hero.webp"
  alt="Product hero banner"
  width={1200}
  height={630}
  priority
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
```

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

## 6. Metadata API

```tsx
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

// dynamic metadata
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

## 7. Route Handlers

```tsx
import { NextResponse, type NextRequest } from 'next/server';

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

## Gotchas

- `'use client'` on high-level layouts forces the entire subtree to be Client Components — move interactivity to leaf components.
- Server Actions that return JSX cause serialization errors — return only plain data.
- `fetch()` in Client Components when data could be fetched in a Server Component wastes bundle and adds waterfalls.
- `<img>` without next/image loses automatic optimization (WebP, lazy loading, responsive).
- Heavy logic in middleware (DB queries, slow fetches) blocks all requests — keep it lightweight.
- `revalidatePath('/')` invalidates the entire cache — use `revalidateTag` for granular invalidation.
- API routes for internal mutations when Server Actions are simpler and type-safe.
