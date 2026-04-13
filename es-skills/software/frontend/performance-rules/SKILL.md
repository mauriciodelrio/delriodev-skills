---
name: performance-rules
description: >
  Usa esta skill cuando optimices rendimiento en React/Next.js:
  Core Web Vitals (LCP, INP, CLS), lazy loading, code splitting,
  bundle analysis, memoización estratégica, virtualización, y métricas.
---

# Performance — Reglas

## Flujo de trabajo del agente

1. Medir primero con React DevTools Profiler y Web Vitals antes de optimizar.
2. Asegurar LCP < 2.5s, INP < 200ms, CLS < 0.1 (tabla de targets abajo).
3. `lazy()` + `Suspense` para componentes pesados, `next/dynamic` con `ssr: false` para browser-only (sección 1).
4. `useMemo`/`useCallback`/`memo` solo cuando el cálculo o re-render es costoso y medido (sección 2).
5. Virtualizar listas > 100 items con `@tanstack/react-virtual` (sección 3).
6. `next/image` con `priority` para LCP, `sizes` para responsive, `placeholder="blur"` (sección 4).
7. First Load JS < 100KB — analizar con `ANALYZE=true pnpm build` (sección 6).

## Core Web Vitals — Targets

| Métrica | Bueno   | Necesita mejora | Malo    | Qué mide                          |
| ------- | ------- | --------------- | ------- | ---------------------------------- |
| **LCP** | < 2.5s  | 2.5s – 4s       | > 4s    | Carga del contenido más grande     |
| **INP** | < 200ms | 200ms – 500ms   | > 500ms | Latencia de interacción            |
| **CLS** | < 0.1   | 0.1 – 0.25      | > 0.25  | Estabilidad visual (layout shifts) |

## 1. Code Splitting y Lazy Loading

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

## 2. Memoización Estratégica

```tsx
function ProductList({ products, filters }: Props) {
  // Filtrar 10,000+ items es costoso
  const filteredProducts = useMemo(
    () => products.filter((p) => matchesFilters(p, filters)),
    [products, filters],
  );

  return <VirtualList items={filteredProducts} />;
}

// Operaciones baratas NO necesitan memo
const fullName = `${user.first} ${user.last}`;

// useCallback — solo cuando se pasa a componente memoizado
const handleSearch = useCallback(
  (query: string) => {
    setFilters((prev) => ({ ...prev, query }));
  },
  [],
);

// React.memo — solo para componentes con render costoso que re-renderizan innecesariamente
const ExpensiveRow = memo(function ExpensiveRow({ item }: { item: Item }) {
  return <ComplexVisualization data={item} />;
});
```

## 3. Virtualización de Listas

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

## 4. Optimización de Imágenes

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

Reglas de imágenes: siempre `width` + `height` (evitar CLS), `alt` descriptivo, `priority` solo para LCP (1 por página), `sizes` para responsive.

## 5. Evitar Layout Shifts (CLS)

```tsx
<div className="h-[400px] w-full">
  {isLoading ? <Skeleton className="h-full w-full" /> : <Chart data={data} />}
</div>

// Aspect ratio para imágenes/videos
<div className="aspect-video relative">
  <Image src={src} alt={alt} fill className="object-cover" />
</div>

// min-height para contenedores que crecen
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

### Targets de Bundle

| Tipo            | Target     | Acción si excede                |
| --------------- | ---------- | ------------------------------- |
| First Load JS   | < 100 KB   | Code splitting + lazy imports   |
| Página JS       | < 50 KB    | Mover lógica a Server Component |
| Componente      | < 20 KB    | lazy() o dynamic()              |
| Dependencia     | Evaluar    | ¿Existe alternativa más ligera? |

## 7. Debounce y Throttle

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

// Custom hook para debounce (cuando useDeferredValue no aplica)
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
    <html lang="es">
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

- `useMemo`/`useCallback`/`memo` en todos los componentes añade overhead sin beneficio — solo aplicar donde el profiler muestra problemas.
- Optimizar sin medir lleva a complejidad innecesaria — usar React DevTools Profiler primero.
- First Load JS > 100KB sin code splitting degrada LCP significativamente.
- Imágenes sin `width`/`height` causan layout shifts (CLS).
- Listas de 1000+ items sin virtualización bloquean el main thread.
- Event listeners sin cleanup causan memory leaks.
- Objetos/arrays inline en props causan re-renders innecesarios en componentes memoizados.
- `import _ from 'lodash'` importa la librería completa — usar `lodash-es/pick` o similar.
- Inyectar contenido sobre el viewport sin reservar espacio causa CLS.
- Fuentes que cambian el layout — usar `next/font` con `display: swap`.
