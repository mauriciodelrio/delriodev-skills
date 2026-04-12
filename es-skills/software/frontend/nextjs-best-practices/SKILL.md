---
name: nextjs-best-practices
description: >
  Mejores prácticas para Next.js 15+ con App Router. Cubre Server Actions,
  middleware, caching (Data Cache, Full Route Cache, Router Cache),
  next/image, next/font, metadata API, route handlers, y patrones de
  arquitectura para aplicaciones production-ready.
---

# ▲ Next.js — Mejores Prácticas

## Principio Rector

> **Server-first architecture.** Todo es Server Component por defecto.
> Usa `'use client'` y `'use server'` como fronteras explícitas.

---

## 1. Server Actions

```tsx
// ✅ Server Action — mutaciones desde Client Components
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
  // Validar en el server SIEMPRE
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

// ✅ Uso en Client Component con useActionState
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
        Crear producto
      </Button>
    </form>
  );
}
```

---

## 2. Middleware

```tsx
// middleware.ts (raíz del proyecto)
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Auth redirect
  const token = request.cookies.get('session');
  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. i18n locale detection
  const locale = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] ?? 'es';

  // 3. Security headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    // Excluir archivos estáticos y API routes internas
    '/((?!_next/static|_next/image|favicon.ico|api/health).*)',
  ],
};
```

---

## 3. Caching — Los 4 Niveles

```tsx
// Nivel 1: Request Memoization (automático)
// Mismo fetch() en múltiples Server Components = 1 sola request
async function Layout({ children }) {
  const user = await getUser(); // fetch #1
  return <>{children}</>;
}
async function Page() {
  const user = await getUser(); // Reutiliza resultado de #1 (deduplicado)
  return <Profile user={user} />;
}

// Nivel 2: Data Cache (persistente, opt-out con no-store)
// ✅ Cached por defecto
const data = await fetch('https://api.example.com/products');

// ✅ Revalidar cada hora
const data = await fetch(url, { next: { revalidate: 3600 } });

// ✅ Invalidar on-demand con tags
const data = await fetch(url, { next: { tags: ['products'] } });
// En Server Action: revalidateTag('products');

// ✅ Opt-out — no cachear
const data = await fetch(url, { cache: 'no-store' });

// Nivel 3: Full Route Cache (HTML + RSC payload estáticos)
// Automático para rutas que no usan headers(), cookies(), searchParams
// Opt-out: export const dynamic = 'force-dynamic';

// Nivel 4: Router Cache (client-side, prefetch de rutas)
// Automático con <Link>. Se invalida con router.refresh()

// ✅ Cache manual para funciones que NO usan fetch
import { unstable_cache } from 'next/cache';

const getCachedUser = unstable_cache(
  async (userId: string) => db.user.findUnique({ where: { id: userId } }),
  ['user-by-id'], // cache key
  { revalidate: 600, tags: ['users'] },
);
```

---

## 4. Optimización de Imágenes

```tsx
// ✅ SIEMPRE usar next/image
import Image from 'next/image';

// Imagen con dimensiones conocidas
<Image
  src="/hero.webp"
  alt="Hero banner del producto"
  width={1200}
  height={630}
  priority          // LCP — cargar sin lazy loading
  quality={85}
  placeholder="blur"
  blurDataURL={blurHash}
/>

// Imagen responsive (fill mode)
<div className="relative aspect-video">
  <Image
    src={product.imageUrl}
    alt={product.name}
    fill
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    className="object-cover rounded-lg"
  />
</div>

// ❌ NUNCA
<img src={url} />                    // No optimizada
<Image src={url} alt="" />           // Alt vacío (a11y)
<Image src={url} width={0} height={0} style={{ width: '100%' }} /> // Hack
```

---

## 5. Fonts Optimizadas

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
    <html lang="es" className={`${inter.variable} ${jetbrainsMono.variable}`}>
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
// app/layout.tsx — metadata global
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://miapp.com'),
  title: {
    template: '%s | MiApp',
    default: 'MiApp — Plataforma de Gestión',
  },
  description: 'Plataforma líder en gestión empresarial',
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    siteName: 'MiApp',
  },
};

// app/products/[id]/page.tsx — metadata dinámica
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

// GET con caching
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

// POST con validación
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

## Anti-patrones Next.js

```tsx
// ❌ 'use client' en layouts de alto nivel
// ❌ Server Actions que retornan JSX (solo retornar datos)
// ❌ fetch() en Client Components cuando podría ser Server Component
// ❌ No usar Image de next/image
// ❌ middleware.ts con lógica pesada (DB queries, fetch lentos)
// ❌ Ignorar la jerarquía de cache (Data → Route → Router)
// ❌ revalidatePath('/') para invalidar todo (ser granular con tags)
// ❌ Usar API routes para lo que debería ser un Server Action
```
