---
name: rendering-strategies
description: >
  Estrategias de rendering en aplicaciones React/Next.js. Cubre SSR, SSG, ISR,
  Streaming SSR, React Server Components (RSC), Partial Prerendering (PPR),
  hydration selectiva, y criterios de selección por caso de uso.
---

# 🖥️ Estrategias de Rendering

## Principio Rector

> **Renderiza lo más cerca del dato.** Server Components para datos estáticos/DB,
> Client Components solo para interactividad. Streaming para percepción de velocidad.

---

## Mapa de Estrategias

| Estrategia | Build Time | Request Time | Revalidación | Caso de Uso |
|-----------|------------|--------------|--------------|-------------|
| **SSG** | ✅ HTML estático | — | `revalidate` o on-demand | Blog, docs, landing |
| **ISR** | ✅ HTML inicial | ✅ Regenera en background | `revalidate: N` | Productos, catálogos |
| **SSR** | — | ✅ Cada request | — | Dashboards, datos user-specific |
| **Streaming** | — | ✅ Parcial progresivo | — | Páginas con zonas lentas |
| **RSC** | ✅/✅ | Según ruta | — | Todo (default en App Router) |
| **PPR** | ✅ Shell estático | ✅ Slots dinámicos | — | Combina estático + dinámico |
| **CSR** | — | — (client-only) | — | SPAs internas, widgets |

---

## 1. Static Site Generation (SSG)

```tsx
// app/blog/[slug]/page.tsx
// Genera HTML en build time. Más rápido posible.

// Generar las rutas estáticas en build
export async function generateStaticParams() {
  const posts = await db.post.findMany({ select: { slug: true } });
  return posts.map((post) => ({ slug: post.slug }));
}

// La página se renderiza en build time
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

// ✅ Usar para: contenido que no cambia con cada request
// ✅ Combinar con revalidate para ISR
```

---

## 2. Incremental Static Regeneration (ISR)

```tsx
// app/products/[id]/page.tsx
// Estático + revalidación en background

// Revalidación por tiempo
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

// ✅ Revalidación on-demand (cuando el dato cambia)
// app/api/revalidate/route.ts
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

---

## 3. Server-Side Rendering (SSR)

```tsx
// app/dashboard/page.tsx
// SSR forzado — renderiza en cada request

// Forzar dynamic rendering
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

// ✅ Usar para: datos personalizados por usuario, datos en tiempo real
// ❌ NO usar si los datos son los mismos para todos los usuarios (usar SSG/ISR)
```

---

## 4. Streaming SSR con Suspense

```tsx
// app/dashboard/page.tsx
// Enviar HTML progresivamente — la página aparece rápido

import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Se renderiza inmediatamente */}
      <header className="col-span-12">
        <h1>Dashboard</h1>
      </header>

      {/* Cada Suspense boundary envía HTML cuando está listo */}
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />  {/* Fetch lento: 2s */}
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <RecentOrders />  {/* Fetch medio: 800ms */}
      </Suspense>

      <Suspense fallback={<StatsSkeleton />}>
        <QuickStats />    {/* Fetch rápido: 200ms */}
      </Suspense>
    </div>
  );
}

// ✅ Cada sección async se resuelve independientemente
// ✅ El usuario ve contenido progresivamente
// ✅ No hay waterfalls — los fetches corren en paralelo
```

---

## 5. React Server Components (RSC) — Patterns

```tsx
// ✅ Pattern: Server Component wrapping Client Component
// El Server Component hace el fetch, el Client maneja interactividad

// Server Component (default)
async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });
  const reviews = await db.review.findMany({ where: { productId: id } });

  return (
    <div>
      {/* Server: renderiza HTML estático */}
      <ProductInfo product={product} />

      {/* Client: necesita interactividad */}
      <AddToCartButton productId={id} price={product.price} />

      {/* Server: renderiza lista estática */}
      <ReviewList reviews={reviews} />

      {/* Client: formulario interactivo */}
      <ReviewForm productId={id} />
    </div>
  );
}

// ✅ Pattern: Pasar Server Components como children a Client Components
// ClientWrapper.tsx
'use client';
export function ClientWrapper({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(true);
  return isVisible ? <div>{children}</div> : null;
}

// Page.tsx (Server Component)
export default async function Page() {
  const data = await fetchData(); // Server-side fetch
  return (
    <ClientWrapper>
      {/* ServerContent se renderiza en el server, aunque ClientWrapper es client */}
      <ServerContent data={data} />
    </ClientWrapper>
  );
}
```

---

## 6. Partial Prerendering (PPR) — Next.js 15+

```tsx
// next.config.ts
const config = {
  experimental: {
    ppr: 'incremental', // Activar PPR
  },
};

// app/product/[id]/page.tsx
export const experimental_ppr = true; // Opt-in por ruta

import { Suspense } from 'react';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });

  return (
    <div>
      {/* ESTÁTICO — se sirve desde CDN como HTML pre-renderizado */}
      <ProductInfo product={product} />
      <ProductImages images={product.images} />

      {/* DINÁMICO — se resuelve en request time via Suspense */}
      <Suspense fallback={<PriceSkeleton />}>
        <DynamicPrice productId={id} />  {/* Usa cookies/headers */}
      </Suspense>

      <Suspense fallback={<StockSkeleton />}>
        <StockStatus productId={id} />   {/* Stock en tiempo real */}
      </Suspense>
    </div>
  );
}

// ✅ Lo mejor de ambos mundos: velocidad de estático + frescura de dinámico
```

---

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

---

## Anti-patrones

```tsx
// ❌ 'use client' en el page.tsx de una ruta que solo muestra datos
'use client'; // ❌ Innecesario — esto podría ser Server Component
export default function ProductPage() { ... }

// ❌ Fetch en Client Component cuando podría ser Server
'use client';
export function ProductList() {
  const { data } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  // ❌ Esto debería ser un Server Component con fetch directo
}

// ❌ cache: 'no-store' en todo — elimina todas las optimizaciones
fetch(url, { cache: 'no-store' }); // ❌ Solo si el dato REALMENTE cambia cada request

// ❌ No usar Suspense boundaries — toda la página espera al fetch más lento
export default async function Page() {
  const slow = await fetchSlow();   // 3 segundos
  const fast = await fetchFast();   // 100ms
  // El usuario no ve NADA durante 3 segundos
}
```
