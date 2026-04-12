---
name: seo-rules
description: >
  Technical SEO rules for Next.js applications. Covers Metadata API,
  Open Graph, structured data (JSON-LD), sitemap, robots.txt, canonical URLs,
  Core Web Vitals for SEO, and patterns for dynamic content.
---

# 🔍 SEO — Technical Rules

## Guiding Principle

> **SEO starts in the code.** Correct metadata, structured data, canonical URLs,
> and Core Web Vitals are the developer's responsibility, not just marketing's.

---

## 1. Metadata API — Next.js

```tsx
// app/layout.tsx — global metadata (inherited)
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://myapp.com'),
  title: {
    template: '%s | MyApp',     // Child pages: "Products | MyApp"
    default: 'MyApp — Business Management',
  },
  description: 'Leading business management platform for SMBs',
  keywords: ['management', 'business', 'inventory', 'billing'],
  authors: [{ name: 'MyApp Team' }],
  creator: 'MyApp',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'MyApp',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'MyApp' }],
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@myapp',
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

### Dynamic Metadata

```tsx
// app/products/[slug]/page.tsx
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug } });

  if (!product) return { title: 'Product not found' };

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

---

## 2. Structured Data (JSON-LD)

```tsx
// ✅ JSON-LD for rich snippets in Google
// shared/components/seo/JsonLd.tsx
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

// ✅ Product
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
          url: `https://myapp.com/products/${product.slug}`,
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

// ✅ Organization (appears in Knowledge Panel)
function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'MyApp',
        url: 'https://myapp.com',
        logo: 'https://myapp.com/logo.png',
        sameAs: [
          'https://twitter.com/myapp',
          'https://linkedin.com/company/myapp',
        ],
      }}
    />
  );
}

// ✅ Breadcrumbs
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

---

## 3. Sitemap and Robots

```tsx
// app/sitemap.ts — dynamic generation
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await db.product.findMany({
    select: { slug: true, updatedAt: true },
  });

  const productUrls = products.map((p) => ({
    url: `https://myapp.com/products/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: 'https://myapp.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://myapp.com/products',
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
    sitemap: 'https://myapp.com/sitemap.xml',
  };
}
```

---

## 4. Canonical URLs and Alternates

```tsx
// ✅ Canonical on every page to avoid duplicate content
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

// ✅ Pagination with rel prev/next
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

---

## 5. Semantic HTML for SEO

```tsx
// ✅ Semantic structure that crawlers understand
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

// ✅ Visible breadcrumbs + JSON-LD
<nav aria-label="Breadcrumb">
  <ol className="flex gap-2 text-sm text-gray-500">
    <li><a href="/">Home</a></li>
    <li aria-hidden="true">/</li>
    <li><a href="/products">Products</a></li>
    <li aria-hidden="true">/</li>
    <li aria-current="page">{product.name}</li>
  </ol>
</nav>
```

---

## 6. Performance SEO (Core Web Vitals)

```tsx
// Google uses Core Web Vitals as a ranking factor:
// LCP (Largest Contentful Paint) < 2.5s
// INP (Interaction to Next Paint) < 200ms
// CLS (Cumulative Layout Shift) < 0.1

// ✅ LCP: prioritize hero image
<Image src={heroUrl} alt="..." priority sizes="100vw" />

// ✅ CLS: reserve space for async content
<div className="aspect-video">          {/* Fixed ratio */}
  <Image src={url} alt="..." fill />
</div>

// ✅ CLS: explicit dimensions on iframes/embeds
<iframe width="560" height="315" src={embedUrl} title={title} loading="lazy" />
```

---

## SEO Checklist per Page

- [ ] Does it have a unique and descriptive `<title>` (< 60 chars)?
- [ ] Does it have a unique `<meta description>` (< 160 chars)?
- [ ] Does it have a canonical URL?
- [ ] Do images have descriptive alt text?
- [ ] Does it have Open Graph tags (og:title, og:description, og:image)?
- [ ] Does it have relevant JSON-LD structured data?
- [ ] Do headings follow hierarchy (h1 → h2 → h3)?
- [ ] Is there only 1 `<h1>` per page?
- [ ] Are alternate language routes declared?
- [ ] LCP < 2.5s, CLS < 0.1?
