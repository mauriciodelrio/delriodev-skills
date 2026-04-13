---
name: seo-rules
description: >
  Usa esta skill cuando implementes SEO técnico en Next.js: Metadata API,
  Open Graph, structured data (JSON-LD), sitemap, robots.txt, canonical URLs,
  Core Web Vitals, y semántica HTML para crawlers.
---

# SEO — Reglas Técnicas

## Flujo de trabajo del agente

1. Metadata estática en `layout.tsx` (title template, OG defaults, robots). Dinámica vía `generateMetadata` (sección 1).
2. JSON-LD para rich snippets: Product, Organization, BreadcrumbList (sección 2).
3. `sitemap.ts` y `robots.ts` dinámicos en `app/` (sección 3).
4. URL canónica en cada página. Alternates para multi-idioma (sección 4).
5. HTML semántico: `<article>`, `<time>`, `<nav>` breadcrumbs, un solo `<h1>` (sección 5).
6. Core Web Vitals: `priority` en hero image, `aspect-ratio` para CLS, dimensiones en iframes (sección 6).
7. Verificar checklist antes de deploy (sección 7).

## 1. Metadata API — Next.js

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://miapp.com'),
  title: {
    template: '%s | MiApp',
    default: 'MiApp — Gestión Empresarial',
  },
  description: 'Plataforma líder en gestión empresarial para PyMEs',
  keywords: ['gestión', 'empresas', 'inventario', 'facturación'],
  authors: [{ name: 'MiApp Team' }],
  creator: 'MiApp',
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    siteName: 'MiApp',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'MiApp' }],
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@miapp',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: '/',
    languages: { 'en': '/en', 'pt': '/pt' },
  },
};
```

### Metadata Dinámica

```tsx
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug } });

  if (!product) return { title: 'Producto no encontrado' };

  return {
    title: product.name,
    description: product.description?.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 160),
      images: product.images.map((img) => ({
        url: img.url,
        width: 1200,
        height: 630,
        alt: product.name,
      })),
      type: 'article',
      publishedTime: product.createdAt.toISOString(),
      modifiedTime: product.updatedAt.toISOString(),
    },
    alternates: {
      canonical: `/products/${slug}`,
    },
  };
}
```

## 2. Structured Data (JSON-LD)

```tsx
interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Producto
function ProductJsonLd({ product }: { product: Product }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: product.images.map((i) => i.url),
        sku: product.sku,
        brand: { '@type': 'Brand', name: product.brand },
        offers: {
          '@type': 'Offer',
          price: product.price,
          priceCurrency: 'USD',
          availability: product.inStock
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          url: `https://miapp.com/products/${product.slug}`,
        },
        aggregateRating: product.reviewCount > 0
          ? {
              '@type': 'AggregateRating',
              ratingValue: product.averageRating,
              reviewCount: product.reviewCount,
            }
          : undefined,
      }}
    />
  );
}

// Organización (aparece en Knowledge Panel)
function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'MiApp',
        url: 'https://miapp.com',
        logo: 'https://miapp.com/logo.png',
        sameAs: [
          'https://twitter.com/miapp',
          'https://linkedin.com/company/miapp',
        ],
      }}
    />
  );
}

// Breadcrumbs
function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}
```

## 3. Sitemap y Robots

```tsx
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await db.product.findMany({
    select: { slug: true, updatedAt: true },
  });

  const productUrls = products.map((p) => ({
    url: `https://miapp.com/products/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: 'https://miapp.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://miapp.com/products',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...productUrls,
  ];
}

// app/robots.ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/admin/'],
      },
    ],
    sitemap: 'https://miapp.com/sitemap.xml',
  };
}
```

## 4. URLs Canónicas y Alternates

```tsx
export const metadata: Metadata = {
  alternates: {
    canonical: '/products',
    languages: {
      'es': '/es/products',
      'en': '/en/products',
      'pt': '/pt/products',
    },
  },
};

// Paginación con rel prev/next
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const page = Number(params.page ?? '1');

  return {
    alternates: {
      canonical: `/products?page=${page}`,
    },
    other: {
      ...(page > 1 && { 'link-prev': `/products?page=${page - 1}` }),
      'link-next': `/products?page=${page + 1}`,
    },
  };
}
```

## 5. Semántica HTML para SEO

```tsx
<article itemScope itemType="https://schema.org/Article">
  <header>
    <h1 itemProp="headline">{post.title}</h1>
    <time itemProp="datePublished" dateTime={post.publishedAt.toISOString()}>
      {formatDate(post.publishedAt)}
    </time>
    <address itemProp="author" rel="author">{post.author.name}</address>
  </header>

  <div itemProp="articleBody">
    {post.content}
  </div>
</article>

// Breadcrumbs visibles + JSON-LD
<nav aria-label="Breadcrumb">
  <ol className="flex gap-2 text-sm text-gray-500">
    <li><a href="/">Inicio</a></li>
    <li aria-hidden="true">/</li>
    <li><a href="/products">Productos</a></li>
    <li aria-hidden="true">/</li>
    <li aria-current="page">{product.name}</li>
  </ol>
</nav>
```

## 6. Performance SEO (Core Web Vitals)

Google usa Core Web Vitals como factor de ranking: LCP < 2.5s, INP < 200ms, CLS < 0.1.

```tsx
// LCP: priorizar imagen hero
<Image src={heroUrl} alt="..." priority sizes="100vw" />

// CLS: reservar espacio para contenido asíncrono
<div className="aspect-video">
  <Image src={url} alt="..." fill />
</div>

// CLS: dimensiones explícitas en iframes/embeds
<iframe width="560" height="315" src={embedUrl} title={title} loading="lazy" />
```

## 7. Checklist SEO por Página

- `<title>` único y descriptivo (< 60 chars)
- `<meta description>` única (< 160 chars)
- URL canónica presente
- Imágenes con alt descriptivo
- Open Graph tags (og:title, og:description, og:image)
- JSON-LD structured data relevante
- Jerarquía de headings (h1 → h2 → h3), solo 1 `<h1>`
- Alternates de idioma declarados
- LCP < 2.5s, CLS < 0.1
