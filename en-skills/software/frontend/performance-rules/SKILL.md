---
name: performance-rules
description: >
  Use this skill when optimizing performance in React/Next.js:
  Core Web Vitals (LCP, INP, CLS), lazy loading, code splitting,
  bundle analysis, strategic memoization, virtualization, and metrics.
---

# Performance — Rules

## Agent workflow

1. Measure first with React DevTools Profiler and Web Vitals before optimizing.
2. Ensure LCP < 2.5s, INP < 200ms, CLS < 0.1 (targets table below).
3. `lazy()` + `Suspense` for heavy components, `next/dynamic` with `ssr: false` for browser-only (section 1).
4. `useMemo`/`useCallback`/`memo` only when computation or re-render is expensive and measured (section 2).
5. Virtualize lists > 100 items with `@tanstack/react-virtual` (section 3).
6. `next/image` with `priority` for LCP, `sizes` for responsive, `placeholder="blur"` (section 4).
7. First Load JS < 100KB — analyze with `ANALYZE=true pnpm build` (section 6).

## Core Web Vitals — Targets

| Metric  | Good    | Needs improvement | Poor    | What it measures                      |
| ------- | ------- | ----------------- | ------- | ------------------------------------- |
| **LCP** | < 2.5s  | 2.5s – 4s        | > 4s    | Largest content element load time     |
| **INP** | < 200ms | 200ms – 500ms    | > 500ms | Interaction latency                   |
| **CLS** | < 0.1   | 0.1 – 0.25       | > 0.25  | Visual stability (layout shifts)      |

## 1. Code Splitting and Lazy Loading

```tsx
import { lazy, Suspense } from 'react';

const HeavyChart = lazy(() => import('./HeavyChart'));
const MarkdownEditor = lazy(() => import('./MarkdownEditor'));

function Dashboard() {
  return (
    <div>
      <Header />

      <Suspense fallback={<ChartSkeleton />}>
        <HeavyChart data={data} />
      </Suspense>

      {showEditor && (
        <Suspense fallback={<EditorSkeleton />}>
          <MarkdownEditor />
        </Suspense>
      )}
    </div>
  );
}

import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./Map'), {
  loading: () => <MapSkeleton />,
  ssr: false,
});
```

## 2. Strategic Memoization

```tsx
function ProductList({ products, filters }: Props) {
  // Filtering 10,000+ items is expensive
  const filteredProducts = useMemo(
    () => products.filter((p) => matchesFilters(p, filters)),
    [products, filters],
  );

  return <VirtualList items={filteredProducts} />;
}

// Cheap operations do NOT need memo
const fullName = `${user.first} ${user.last}`;

// useCallback — only when passed to a memoized component
const handleSearch = useCallback(
  (query: string) => {
    setFilters((prev) => ({ ...prev, query }));
  },
  [],
);

// React.memo — only for components with expensive render that re-render unnecessarily
const ExpensiveRow = memo(function ExpensiveRow({ item }: { item: Item }) {
  return <ComplexVisualization data={item} />;
});
```

## 3. List Virtualization

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualProductList({ products }: { products: Product[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const product = products[virtualItem.index]!;
          return (
            <div
              key={product.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <ProductRow product={product} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

## 4. Image Optimization

```tsx
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero banner"
  width={1200}
  height={600}
  priority
  sizes="100vw"
  className="object-cover"
/>

<Image
  src={product.image}
  alt={product.name}
  width={400}
  height={300}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  placeholder="blur"
  blurDataURL={product.blurHash}
/>
```

Image rules: always `width` + `height` (avoid CLS), descriptive `alt`, `priority` only for LCP (1 per page), `sizes` for responsive.

## 5. Avoiding Layout Shifts (CLS)

```tsx
<div className="h-[400px] w-full">
  {isLoading ? <Skeleton className="h-full w-full" /> : <Chart data={data} />}
</div>

// Aspect ratio for images/videos
<div className="aspect-video relative">
  <Image src={src} alt={alt} fill className="object-cover" />
</div>

// min-height for containers that grow
<main className="min-h-screen">
  {content}
</main>
```

## 6. Bundle Analysis

```bash
ANALYZE=true pnpm build

pnpm add -D @next/bundle-analyzer
import withBundleAnalyzer from '@next/bundle-analyzer';

const config = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})({
  // next config...
});

export default config;
```

### Bundle Targets

| Type            | Target     | Action if exceeded                |
| --------------- | ---------- | --------------------------------- |
| First Load JS   | < 100 KB   | Code splitting + lazy imports     |
| Page JS         | < 50 KB    | Move logic to Server Component    |
| Component       | < 20 KB    | lazy() or dynamic()               |
| Dependency      | Evaluate   | Is there a lighter alternative?   |

## 7. Debounce and Throttle

```tsx
import { useDeferredValue } from 'react';

function SearchResults({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  const { data } = useProducts({ query: deferredQuery });

  return (
    <div className={cn(isStale && 'opacity-60 transition-opacity')}>
      <ProductGrid products={data ?? []} />
    </div>
  );
}

// Custom hook for debounce (when useDeferredValue doesn't apply)
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

## 8. Web Vitals Monitoring

```tsx
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}

export function reportWebVitals(metric: NextWebVitalsMetric) {
  if (metric.label === 'web-vital') {
    analytics.track('Web Vital', {
      name: metric.name,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
    });
  }
}
```

## Gotchas

- `useMemo`/`useCallback`/`memo` on all components adds overhead without benefit — only apply where the profiler shows problems.
- Optimizing without measuring leads to unnecessary complexity — use React DevTools Profiler first.
- First Load JS > 100KB without code splitting significantly degrades LCP.
- Images without `width`/`height` cause layout shifts (CLS).
- Lists of 1000+ items without virtualization block the main thread.
- Event listeners without cleanup cause memory leaks.
- Inline objects/arrays in props cause unnecessary re-renders in memoized components.
- `import _ from 'lodash'` imports the full library — use `lodash-es/pick` or similar.
- Injecting content above the viewport without reserving space causes CLS.
- Fonts that change layout — use `next/font` with `display: swap`.
