---
name: rendering-strategies
description: >
  Usa esta skill cuando debas elegir o implementar estrategias de rendering
  en React/Next.js: SSG, ISR, SSR, Streaming, RSC, PPR, CSR, y criterios
  de selección por caso de uso.
---

# Estrategias de Rendering

## Flujo de trabajo del agente

1. Identificar naturaleza de los datos: estático, semi-estático, personalizado, o real-time.
2. Consultar el Cheat Sheet (sección 7) para seleccionar la estrategia.
3. SSG para contenido inmutable, ISR para semi-estático, SSR para datos por usuario.
4. Envolver zonas lentas en `<Suspense>` para streaming progresivo.
5. PPR cuando una página mezcla contenido estático y dinámico.
6. `'use client'` solo para interactividad — todo lo demás es Server Component.

## Mapa de Estrategias

| Estrategia | Build Time | Request Time | Revalidación | Caso de Uso |
|-----------|------------|--------------|--------------|-------------|
| **SSG** | HTML estático | — | `revalidate` o on-demand | Blog, docs, landing |
| **ISR** | HTML inicial | Regenera en background | `revalidate: N` | Productos, catálogos |
| **SSR** | — | Cada request | — | Dashboards, datos user-specific |
| **Streaming** | — | Parcial progresivo | — | Páginas con zonas lentas |
| **RSC** | Build + request | Según ruta | — | Todo (default en App Router) |
| **PPR** | Shell estático | Slots dinámicos | — | Combina estático + dinámico |
| **CSR** | — | — (client-only) | — | SPAs internas, widgets |

## 1. Static Site Generation (SSG)

```tsx
export async function generateStaticParams() {
  const posts = await db.post.findMany({ select: { slug: true } });
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await db.post.findUnique({ where: { slug } });

  if (!post) notFound();

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.htmlContent }} />
    </article>
  );
}
```

## 2. Incremental Static Regeneration (ISR)

```tsx
export const revalidate = 3600; // Regenerar cada 1 hora

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await fetch(`${env.API_URL}/products/${id}`, {
    next: { revalidate: 3600 },
  }).then((r) => r.json());

  return <ProductDetail product={product} />;
}

// Revalidación on-demand
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request: Request) {
  const { path, tag, secret } = await request.json();

  if (secret !== env.REVALIDATION_SECRET) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 });
  }

  if (tag) revalidateTag(tag);
  if (path) revalidatePath(path);

  return Response.json({ revalidated: true, now: Date.now() });
}
```

## 3. Server-Side Rendering (SSR)

```tsx
export const dynamic = 'force-dynamic';
// O usar headers()/cookies() que automáticamente hacen la ruta dinámica

import { cookies } from 'next/headers';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');

  const data = await fetch(`${env.API_URL}/dashboard`, {
    headers: { Authorization: `Bearer ${session?.value}` },
    cache: 'no-store',
  }).then((r) => r.json());

  return <DashboardView data={data} />;
}
```

## 4. Streaming SSR con Suspense

```tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-12 gap-6">
      <header className="col-span-12">
        <h1>Dashboard</h1>
      </header>

      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <RecentOrders />
      </Suspense>

      <Suspense fallback={<StatsSkeleton />}>
        <QuickStats />
      </Suspense>
    </div>
  );
}
```

## 5. React Server Components (RSC) — Patterns

```tsx
// Pattern: Server Component wrapping Client Component
async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });
  const reviews = await db.review.findMany({ where: { productId: id } });

  return (
    <div>
      <ProductInfo product={product} />
      <AddToCartButton productId={id} price={product.price} />
      <ReviewList reviews={reviews} />
      <ReviewForm productId={id} />
    </div>
  );
}

// Pattern: Pasar Server Components como children a Client Components
'use client';
export function ClientWrapper({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(true);
  return isVisible ? <div>{children}</div> : null;
}

export default async function Page() {
  const data = await fetchData();
  return (
    <ClientWrapper>
      <ServerContent data={data} />
    </ClientWrapper>
  );
}
```

## 6. Partial Prerendering (PPR) — Next.js 15+

```tsx
// next.config.ts
const config = {
  experimental: {
    ppr: 'incremental',
  },
};

export const experimental_ppr = true;

import { Suspense } from 'react';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });

  return (
    <div>
      <ProductInfo product={product} />
      <ProductImages images={product.images} />

      <Suspense fallback={<PriceSkeleton />}>
        <DynamicPrice productId={id} />
      </Suspense>

      <Suspense fallback={<StockSkeleton />}>
        <StockStatus productId={id} />
      </Suspense>
    </div>
  );
}
```

## Cuándo Usar Cada Estrategia — Cheat Sheet

```
Landing page, marketing        → SSG
Blog, documentación            → SSG + ISR (revalidate: 3600)
E-commerce catálogo            → ISR (revalidate: 60)
E-commerce precio/stock        → PPR (shell SSG + slots dinámicos)
Dashboard personalizado        → SSR + Streaming
Auth pages                     → SSR (cookies)
SPA interna (admin panel)      → CSR (Vite, sin Next.js)
Formularios complejos          → Client Components
Chat / real-time               → Client Components + WebSockets
```

## Gotchas

- `'use client'` en page.tsx que solo muestra datos — debería ser Server Component.
- Fetch en Client Component cuando podría ser Server Component con fetch directo.
- `cache: 'no-store'` por defecto en todo elimina las optimizaciones — solo si el dato realmente cambia cada request.
- No usar `<Suspense>` boundaries — toda la página espera al fetch más lento en lugar de streaming progresivo.
