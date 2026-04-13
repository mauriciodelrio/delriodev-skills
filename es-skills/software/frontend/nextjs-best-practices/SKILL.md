---
name: nextjs-best-practices
description: >
  Usa esta skill cuando desarrolles con Next.js 15+ App Router:
  Server Actions, middleware, caching (Data/Route/Router Cache),
  next/image, next/font, metadata API, route handlers, y patrones
  de arquitectura production-ready.
---

# Next.js — Mejores Prácticas

## Flujo de trabajo del agente

1. Todo es Server Component por defecto. Agregar `'use client'` solo cuando se necesite interactividad.
2. Server Actions para mutaciones con Zod validation + `revalidatePath`/`revalidateTag` (sección 1).
3. Middleware para auth redirects y security headers (sección 2).
4. Conocer los 4 niveles de cache: Request Memoization → Data Cache → Full Route Cache → Router Cache (sección 3).
5. `next/image` con `sizes` + `priority` para LCP, `next/font` con CSS variables (secciones 4-5).
6. Metadata API estática en layouts, `generateMetadata` dinámica en pages (sección 6).
7. Route handlers para API públicas; preferir Server Actions para mutaciones internas (sección 7).

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
        Crear producto
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
    '/((?!_next/static|_next/image|favicon.ico|api/health).*)',
  ],
};
```

## 3. Caching — Los 4 Niveles

```tsx
// Nivel 1: Request Memoization (automático)
async function Layout({ children }) {
  const user = await getUser();
  return <>{children}</>;
}
async function Page() {
  const user = await getUser(); // Reutiliza resultado de Layout (deduplicado)
  return <Profile user={user} />;
}

// Nivel 2: Data Cache (persistente, opt-out con no-store)
const data = await fetch('https://api.example.com/products');
const data = await fetch(url, { next: { revalidate: 3600 } });
const data = await fetch(url, { next: { tags: ['products'] } });
const data = await fetch(url, { cache: 'no-store' });

// Nivel 3: Full Route Cache (HTML + RSC payload estáticos)
// Automático si la ruta no usa headers(), cookies(), searchParams

// Nivel 4: Router Cache (client-side, prefetch con <Link>)
// Se invalida con router.refresh()

// Cache manual para funciones sin fetch
import { unstable_cache } from 'next/cache';

const getCachedUser = unstable_cache(
  async (userId: string) => db.user.findUnique({ where: { id: userId } }),
  ['user-by-id'],
  { revalidate: 600, tags: ['users'] },
);
```

## 4. Optimización de Imágenes

```tsx
import Image from 'next/image';
<Image
  src="/hero.webp"
  alt="Hero banner del producto"
  width={1200}
  height={630}
  priority
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
```

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

## 6. Metadata API

```tsx
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

// metadata dinámica
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

- `'use client'` en layouts de alto nivel fuerza a todo el subárbol a ser Client Component — mover interactividad a componentes hoja.
- Server Actions que retornan JSX causan errores de serialización — retornar solo datos planos.
- `fetch()` en Client Components cuando los datos podrían obtenerse en un Server Component desperdicia bundle y añade waterfalls.
- `<img>` sin next/image pierde optimización automática (WebP, lazy loading, responsive).
- Lógica pesada en middleware (DB queries, fetches lentos) bloquea todas las requests — mantenerlo ligero.
- `revalidatePath('/')` invalida todo el cache — usar `revalidateTag` para invalidación granular.
- API routes para mutaciones internas cuando Server Actions son más simples y type-safe.
