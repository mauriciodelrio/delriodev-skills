---
name: fetching-rules
description: >
  Reglas para data fetching en aplicaciones React/Next.js. Cubre TanStack Query v5,
  SWR, Server Components fetch, cache invalidation, optimistic updates,
  prefetching, infinite scroll, y patrones de error/loading.
---

# 📡 Data Fetching — Reglas

## Principio Rector

> **Server Components para la primera carga, TanStack Query para interactividad.**
> Nunca duplicar datos del servidor en un store global.

---

## Árbol de Decisión

```
¿El dato se necesita en el render inicial (SEO, LCP)?
├── SÍ → Server Component fetch (directo a DB o API)
│
¿El dato cambia con interacción del usuario (filtros, paginación)?
├── SÍ → TanStack Query en Client Component
│
¿Es un listado infinito o paginado por scroll?
├── SÍ → useInfiniteQuery de TanStack Query
│
¿Es real-time (chat, notificaciones)?
├── SÍ → WebSocket/SSE + invalidación de query
```

---

## 1. Server Component Fetch (Next.js)

```tsx
// ✅ Fetch directo en Server Components — sin useEffect, sin useState
// app/products/page.tsx
async function ProductsPage() {
  // Fetch paralelo — no waterfall
  const [products, categories] = await Promise.all([
    db.product.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    db.category.findMany(),
  ]);

  return (
    <div>
      <CategoryFilter categories={categories} />
      <ProductGrid products={products} />
    </div>
  );
}

// ✅ Fetch con cache tags para invalidación granular
async function getProduct(id: string) {
  return fetch(`${env.API_URL}/products/${id}`, {
    next: { tags: [`product-${id}`, 'products'] },
  }).then((r) => r.json());
}

// Invalidar en Server Action:
// revalidateTag(`product-${id}`);
```

---

## 2. TanStack Query — Client-Side Fetching

### Setup

```tsx
// shared/providers/QueryProvider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,        // 1 min antes de refetch
            gcTime: 5 * 60 * 1000,       // 5 min en cache
            retry: 1,                     // 1 retry en error
            refetchOnWindowFocus: false,  // No refetch al volver a la pestaña
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Queries

```tsx
// ✅ Query con factory pattern (keys organizadas)
// features/products/queries/productQueries.ts
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => fetchProducts(filters),
    placeholderData: keepPreviousData, // No flash al cambiar filtros
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => fetchProduct(id),
    enabled: !!id, // Solo fetch si hay id
  });
}
```

### Mutations con Optimistic Updates

```tsx
// ✅ Mutation con optimistic update
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) =>
      fetch(`/api/favorites/${productId}`, { method: 'POST' }),

    // Optimistic: actualizar UI inmediatamente
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: productKeys.lists() });

      const previousProducts = queryClient.getQueryData<Product[]>(productKeys.lists());

      queryClient.setQueryData<Product[]>(productKeys.lists(), (old) =>
        old?.map((p) =>
          p.id === productId ? { ...p, isFavorite: !p.isFavorite } : p,
        ),
      );

      return { previousProducts }; // Context para rollback
    },

    // Rollback si falla
    onError: (_err, _productId, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(productKeys.lists(), context.previousProducts);
      }
    },

    // Siempre refetch para sincronizar
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}
```

---

## 3. Infinite Scroll

```tsx
// ✅ Infinite query con Intersection Observer
export function useInfiniteProducts(filters: ProductFilters) {
  return useInfiniteQuery({
    queryKey: [...productKeys.list(filters), 'infinite'],
    queryFn: ({ pageParam }) =>
      fetchProducts({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

// Hook para trigger automático
function useIntersectionObserver(
  onIntersect: () => void,
  enabled: boolean,
) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) onIntersect(); },
      { rootMargin: '200px' }, // Pre-fetch 200px antes de llegar
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onIntersect, enabled]);

  return ref;
}

// Componente
function InfiniteProductList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteProducts(filters);

  const loadMoreRef = useIntersectionObserver(
    fetchNextPage,
    hasNextPage && !isFetchingNextPage,
  );

  const allProducts = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <ProductGrid products={allProducts} />
      <div ref={loadMoreRef}>
        {isFetchingNextPage && <Spinner />}
      </div>
    </>
  );
}
```

---

## 4. Prefetching

```tsx
// ✅ Prefetch en hover (anticipa navegación)
function ProductCard({ product }: { product: Product }) {
  const queryClient = useQueryClient();

  function handleMouseEnter() {
    queryClient.prefetchQuery({
      queryKey: productKeys.detail(product.id),
      queryFn: () => fetchProduct(product.id),
      staleTime: 5 * 60 * 1000, // No re-fetch si < 5 min
    });
  }

  return (
    <Link href={`/products/${product.id}`} onMouseEnter={handleMouseEnter}>
      <Card>{product.name}</Card>
    </Link>
  );
}

// ✅ Prefetch en Server Component (hydration)
// app/products/page.tsx
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';

export default async function ProductsPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: productKeys.list({}),
    queryFn: () => fetchProducts({}),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductList />  {/* Client Component usa useProducts() — ya tiene data */}
    </HydrationBoundary>
  );
}
```

---

## 5. Patrones de Loading y Error

```tsx
// ✅ Patrón consistente para queries
function ProductList() {
  const { data, isLoading, isError, error } = useProducts(filters);

  if (isLoading) return <ProductGridSkeleton />;
  if (isError) return <ErrorState message={error.message} onRetry={() => {}} />;
  if (data.length === 0) return <EmptyState message="No se encontraron productos" />;

  return <ProductGrid products={data} />;
}

// ❌ NUNCA: loading boolean manual + useEffect fetch
// ❌ NUNCA: datos de API en useState/Zustand
```

---

## Anti-patrones

```tsx
// ❌ Fetch en useEffect sin cleanup
useEffect(() => {
  fetch('/api/products').then(r => r.json()).then(setData);
}, []); // ❌ Sin AbortController, sin loading, sin error

// ❌ Guardar response de API en Zustand/Redux
const useStore = create((set) => ({
  products: [],
  fetchProducts: async () => { // ❌ Duplicando cache de TanStack Query
    const data = await fetch('/api/products').then(r => r.json());
    set({ products: data });
  },
}));

// ❌ Query keys como strings mágicos
useQuery({ queryKey: ['products', 'list', filters] });  // ❌ Propenso a typos
useQuery({ queryKey: productKeys.list(filters) });       // ✅ Factory

// ❌ Waterfall de fetches en Server Components
const user = await getUser();           // 500ms
const products = await getProducts();    // 800ms — espera a user innecesariamente
// ✅ Promise.all([getUser(), getProducts()])  — paralelo: 800ms total
```
