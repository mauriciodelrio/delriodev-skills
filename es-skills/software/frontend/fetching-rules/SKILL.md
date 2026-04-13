---
name: fetching-rules
description: >
  Usa esta skill cuando implementes data fetching en React/Next.js:
  TanStack Query v5, Server Components fetch, cache invalidation,
  optimistic updates, prefetching, infinite scroll, y patrones
  de loading/error.
---

# Data Fetching

## Flujo de trabajo del agente

1. Consultar árbol de decisión para elegir estrategia de fetch.
2. Server Component fetch para render inicial/SEO (sección 1).
3. TanStack Query para datos interactivos: query keys con factory, mutations con optimistic update (sección 2).
4. useInfiniteQuery + IntersectionObserver para infinite scroll (sección 3).
5. Prefetch en hover o HydrationBoundary para anticipar navegación (sección 4).
6. Patrón consistente: isLoading → skeleton, isError → error state, empty → empty state (sección 5).

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

## 1. Server Component Fetch (Next.js)

```tsx
async function ProductsPage() {
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

async function getProduct(id: string) {
  return fetch(`${env.API_URL}/products/${id}`, {
    next: { tags: [`product-${id}`, 'products'] },
  }).then((r) => r.json());
}

// revalidateTag(`product-${id}`);
```

## 2. TanStack Query — Client-Side Fetching

### Setup

```tsx
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
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
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
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => fetchProduct(id),
    enabled: !!id,
  });
}
```

### Mutations con Optimistic Updates

```tsx
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) =>
      fetch(`/api/favorites/${productId}`, { method: 'POST' }),

    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: productKeys.lists() });

      const previousProducts = queryClient.getQueryData<Product[]>(productKeys.lists());

      queryClient.setQueryData<Product[]>(productKeys.lists(), (old) =>
        old?.map((p) =>
          p.id === productId ? { ...p, isFavorite: !p.isFavorite } : p,
        ),
      );

      return { previousProducts };
    },

    onError: (_err, _productId, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(productKeys.lists(), context.previousProducts);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}
```

## 3. Infinite Scroll

```tsx
export function useInfiniteProducts(filters: ProductFilters) {
  return useInfiniteQuery({
    queryKey: [...productKeys.list(filters), 'infinite'],
    queryFn: ({ pageParam }) =>
      fetchProducts({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

function useIntersectionObserver(
  onIntersect: () => void,
  enabled: boolean,
) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) onIntersect(); },
      { rootMargin: '200px' },
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

## 4. Prefetching

```tsx
function ProductCard({ product }: { product: Product }) {
  const queryClient = useQueryClient();

  function handleMouseEnter() {
    queryClient.prefetchQuery({
      queryKey: productKeys.detail(product.id),
      queryFn: () => fetchProduct(product.id),
      staleTime: 5 * 60 * 1000,
    });
  }

  return (
    <Link href={`/products/${product.id}`} onMouseEnter={handleMouseEnter}>
      <Card>{product.name}</Card>
    </Link>
  );
}

import { HydrationBoundary, dehydrate } from '@tanstack/react-query';

export default async function ProductsPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: productKeys.list({}),
    queryFn: () => fetchProducts({}),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductList />
    </HydrationBoundary>
  );
}
```

## 5. Patrones de Loading y Error

```tsx
function ProductList() {
  const { data, isLoading, isError, error } = useProducts(filters);

  if (isLoading) return <ProductGridSkeleton />;
  if (isError) return <ErrorState message={error.message} onRetry={() => {}} />;
  if (data.length === 0) return <EmptyState message="No se encontraron productos" />;

  return <ProductGrid products={data} />;
}
```

## Gotchas

- `fetch` en `useEffect` sin AbortController ni estados de loading/error produce race conditions y fugas de memoria — usar TanStack Query.
- Guardar response de API en Zustand/Redux duplica la cache de TanStack Query — dejar que TQ sea la única fuente de verdad para datos del servidor.
- Query keys como strings mágicos (`['products', 'list']`) son propensas a typos — usar factory pattern (`productKeys.list(filters)`).
- Fetches secuenciales en Server Components (`await A; await B;`) crean waterfalls — usar `Promise.all` para paralelizar.
- Loading boolean manual + `useState` para datos de API es reimplementar TanStack Query pobremente — usar `isLoading`/`isError` del hook.
