---
name: performance-rules
description: >
  Reglas de rendimiento para aplicaciones React/Next.js. Cubre Core Web Vitals
  (LCP, INP, CLS), lazy loading, code splitting, bundle analysis, memoización
  estratégica, React Profiler, optimización de imágenes, y métricas.
---

# ⚡ Performance — Reglas

## Principio Rector

> **Medir primero, optimizar después.** Nunca optimizar sin perfilar.
> El rendimiento percibido importa tanto como el real.

---

## Core Web Vitals — Targets

| Métrica | Bueno   | Necesita mejora | Malo    | Qué mide                          |
| ------- | ------- | --------------- | ------- | ---------------------------------- |
| **LCP** | < 2.5s  | 2.5s – 4s       | > 4s    | Carga del contenido más grande     |
| **INP** | < 200ms | 200ms – 500ms   | > 500ms | Latencia de interacción            |
| **CLS** | < 0.1   | 0.1 – 0.25      | > 0.25  | Estabilidad visual (layout shifts) |

---

## 1. Code Splitting y Lazy Loading

```tsx
// ✅ Lazy loading de rutas/páginas (automático en Next.js App Router)
// Para componentes pesados en Client Components:
import { lazy, Suspense } from 'react';

const HeavyChart = lazy(() => import('./HeavyChart'));
const MarkdownEditor = lazy(() => import('./MarkdownEditor'));

function Dashboard() {
  return (
    <div>
      <Header />  {/* Bundle principal */}

      <Suspense fallback={<ChartSkeleton />}>
        <HeavyChart data={data} />  {/* Chunk separado */}
      </Suspense>

      {showEditor && (
        <Suspense fallback={<EditorSkeleton />}>
          <MarkdownEditor />  {/* Solo carga si se necesita */}
        </Suspense>
      )}
    </div>
  );
}

// ✅ next/dynamic para Client Components pesados en Next.js
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./Map'), {
  loading: () => <MapSkeleton />,
  ssr: false,  // No renderizar en servidor (usa APIs del browser)
});
```

---

## 2. Memoización Estratégica

```tsx
// ✅ useMemo — SOLO cuando el cálculo es costoso
function ProductList({ products, filters }: Props) {
  // ✅ Filtrar 10,000+ items es costoso
  const filteredProducts = useMemo(
    () => products.filter((p) => matchesFilters(p, filters)),
    [products, filters],
  );

  return <VirtualList items={filteredProducts} />;
}

// ❌ NO memo para operaciones baratas
const fullName = useMemo(
  () => `${user.first} ${user.last}`, // ❌ Una concatenación no necesita memo
  [user.first, user.last],
);
const fullName = `${user.first} ${user.last}`; // ✅

// ✅ useCallback — SOLO cuando se pasa a componente memoizado
const handleSearch = useCallback(
  (query: string) => {
    setFilters((prev) => ({ ...prev, query }));
  },
  [],
);

// ✅ React.memo — SOLO para componentes que re-renderizan innecesariamente
// y cuyo render es costoso
const ExpensiveRow = memo(function ExpensiveRow({ item }: { item: Item }) {
  return <ComplexVisualization data={item} />;
});
```

---

## 3. Virtualización de Listas

```tsx
// ✅ Para listas > 100 items usar @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualProductList({ products }: { products: Product[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Altura estimada de cada item
    overscan: 5,            // Items extra fuera del viewport
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

## 4. Optimización de Imágenes

```tsx
// ✅ SIEMPRE usar next/image
import Image from 'next/image';

// LCP image — priorizar
<Image
  src="/hero.jpg"
  alt="Hero banner"
  width={1200}
  height={600}
  priority              // Preload — para imágenes above the fold
  sizes="100vw"
  className="object-cover"
/>

// Imagen lazy (default)
<Image
  src={product.image}
  alt={product.name}
  width={400}
  height={300}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  placeholder="blur"
  blurDataURL={product.blurHash}  // Placeholder mientras carga
/>

// ✅ Reglas de imágenes:
// - SIEMPRE width + height (evitar CLS)
// - SIEMPRE alt descriptivo
// - priority SOLO para LCP image (1 por página)
// - sizes para responsive (evitar cargar imagen gigante en mobile)
// - WebP/AVIF (Next.js convierte automáticamente)
```

---

## 5. Evitar Layout Shifts (CLS)

```tsx
// ✅ Reservar espacio para contenido dinámico
// Skeleton con mismas dimensiones
<div className="h-[400px] w-full">
  {isLoading ? <Skeleton className="h-full w-full" /> : <Chart data={data} />}
</div>

// ✅ Aspect ratio para imágenes/videos
<div className="aspect-video relative">
  <Image src={src} alt={alt} fill className="object-cover" />
</div>

// ✅ min-height para contenedores que crecen
<main className="min-h-screen">
  {content}
</main>

// ❌ Inyectar contenido arriba del viewport sin reservar espacio
// ❌ Fuentes que cambian el layout (usar next/font con display: swap)
// ❌ Ads/embeds sin dimensiones fijas
```

---

## 6. Bundle Analysis

```bash
# Analizar bundle de Next.js
ANALYZE=true pnpm build

# Instalar analyzer
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

### Targets de Bundle

| Tipo            | Target     | Acción si excede                |
| --------------- | ---------- | ------------------------------- |
| First Load JS   | < 100 KB   | Code splitting + lazy imports   |
| Página JS       | < 50 KB    | Mover lógica a Server Component |
| Componente      | < 20 KB    | lazy() o dynamic()              |
| Dependencia     | Evaluar    | ¿Existe alternativa más ligera? |

---

## 7. Debounce y Throttle

```tsx
// ✅ Debounce para búsqueda
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

// ✅ Custom hook para debounce (cuando useDeferredValue no aplica)
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
// app/layout.tsx — reportar métricas
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

## Anti-patrones

```tsx
// ❌ Memo/useCallback en TODOS los componentes — overhead innecesario
// ❌ Optimizar sin medir — usar React DevTools Profiler primero
// ❌ Bundle de > 100KB First Load JS sin justificación
// ❌ Imágenes sin width/height (CLS)
// ❌ Listas de 1000+ items sin virtualización
// ❌ event listeners sin cleanup (memory leaks)
// ❌ Re-renders causados por crear objetos/arrays inline en props
// ❌ Importar librerías completas: import _ from 'lodash' (usar lodash-es/pick)
```
