---
name: performance-rules
description: >
  Performance rules for React/Next.js applications. Covers Core Web Vitals
  (LCP, INP, CLS), lazy loading, code splitting, bundle analysis, strategic
  memoization, React Profiler, image optimization, and metrics.
---

# ⚡ Performance — Rules

## Guiding Principle

> **Measure first, optimize later.** Never optimize without profiling.
> Perceived performance matters as much as actual performance.

---

## Core Web Vitals — Targets

| Metric  | Good    | Needs improvement | Poor    | What it measures                      |
| ------- | ------- | ----------------- | ------- | ------------------------------------- |
| **LCP** | < 2.5s  | 2.5s – 4s        | > 4s    | Largest content element load time     |
| **INP** | < 200ms | 200ms – 500ms    | > 500ms | Interaction latency                   |
| **CLS** | < 0.1   | 0.1 – 0.25       | > 0.25  | Visual stability (layout shifts)      |

---

## 1. Code Splitting and Lazy Loading

```tsx
// ✅ Lazy loading of routes/pages (automatic in Next.js App Router)
// For heavy Client Components:
import { lazy, Suspense } from 'react';

const HeavyChart = lazy(() => import('./HeavyChart'));
const MarkdownEditor = lazy(() => import('./MarkdownEditor'));

function Dashboard() {
  return (
    <div>
      <Header />  {/* Main bundle */}

      <Suspense fallback={<ChartSkeleton />}>
        <HeavyChart data={data} />  {/* Separate chunk */}
      </Suspense>

      {showEditor && (
        <Suspense fallback={<EditorSkeleton />}>
          <MarkdownEditor />  {/* Only loads if needed */}
        </Suspense>
      )}
    </div>
  );
}

// ✅ next/dynamic for heavy Client Components in Next.js
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./Map'), {
  loading: () => <MapSkeleton />,
  ssr: false,  // Don't render on server (uses browser APIs)
});
```

---

## 2. Strategic Memoization

```tsx
// ✅ useMemo — ONLY when the computation is expensive
function ProductList({ products, filters }: Props) {
  // ✅ Filtering 10,000+ items is expensive
  const filteredProducts = useMemo(
    () => products.filter((p) => matchesFilters(p, filters)),
    [products, filters],
  );

  return <VirtualList items={filteredProducts} />;
}

// ❌ NO memo for cheap operations
const fullName = useMemo(
  () => `${user.first} ${user.last}`, // ❌ A concatenation doesn't need memo
  [user.first, user.last],
);
const fullName = `${user.first} ${user.last}`; // ✅

// ✅ useCallback — ONLY when passed to a memoized component
const handleSearch = useCallback(
  (query: string) => {
    setFilters((prev) => ({ ...prev, query }));
  },
  [],
);

// ✅ React.memo — ONLY for components that re-render unnecessarily
// and whose render is expensive
const ExpensiveRow = memo(function ExpensiveRow({ item }: { item: Item }) {
  return <ComplexVisualization data={item} />;
});
```

---

## 3. List Virtualization

```tsx
// ✅ For lists > 100 items use @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualProductList({ products }: { products: Product[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Estimated height of each item
    overscan: 5,            // Extra items outside the viewport
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

---

## 4. Image Optimization

```tsx
// ✅ ALWAYS use next/image
import Image from 'next/image';

// LCP image — prioritize
<Image
  src="/hero.jpg"
  alt="Hero banner"
  width={1200}
  height={600}
  priority              // Preload — for above-the-fold images
  sizes="100vw"
  className="object-cover"
/>

// Lazy image (default)
<Image
  src={product.image}
  alt={product.name}
  width={400}
  height={300}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  placeholder="blur"
  blurDataURL={product.blurHash}  // Placeholder while loading
/>

// ✅ Image rules:
// - ALWAYS width + height (avoid CLS)
// - ALWAYS descriptive alt
// - priority ONLY for LCP image (1 per page)
// - sizes for responsive (avoid loading huge image on mobile)
// - WebP/AVIF (Next.js converts automatically)
```

---

## 5. Avoiding Layout Shifts (CLS)

```tsx
// ✅ Reserve space for dynamic content
// Skeleton with same dimensions
<div className="h-[400px] w-full">
  {isLoading ? <Skeleton className="h-full w-full" /> : <Chart data={data} />}
</div>

// ✅ Aspect ratio for images/videos
<div className="aspect-video relative">
  <Image src={src} alt={alt} fill className="object-cover" />
</div>

// ✅ min-height for containers that grow
<main className="min-h-screen">
  {content}
</main>

// ❌ Injecting content above the viewport without reserving space
// ❌ Fonts that change the layout (use next/font with display: swap)
// ❌ Ads/embeds without fixed dimensions
```

---

## 6. Bundle Analysis

```bash
# Analyze Next.js bundle
ANALYZE=true pnpm build

# Install analyzer
pnpm add -D @next/bundle-analyzer

# next.config.mjs
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

---

## 7. Debounce and Throttle

```tsx
// ✅ Debounce for search
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

// ✅ Custom hook for debounce (when useDeferredValue doesn't apply)
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

---

## 8. Web Vitals Monitoring

```tsx
// app/layout.tsx — report metrics
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

// Custom reporting
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

---

## Anti-patterns

```tsx
// ❌ Memo/useCallback on ALL components — unnecessary overhead
// ❌ Optimizing without measuring — use React DevTools Profiler first
// ❌ Bundle > 100KB First Load JS without justification
// ❌ Images without width/height (CLS)
// ❌ Lists of 1000+ items without virtualization
// ❌ Event listeners without cleanup (memory leaks)
// ❌ Re-renders caused by creating inline objects/arrays in props
// ❌ Importing full libraries: import _ from 'lodash' (use lodash-es/pick)
```
