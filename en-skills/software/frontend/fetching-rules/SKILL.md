---
name: fetching-rules
description: >
  Data fetching rules for React/Next.js applications. Covers TanStack Query v5,
  SWR, Server Components fetch, cache invalidation, optimistic updates,
  prefetching, infinite scroll, and error/loading patterns.
---

# 📡 Data Fetching — Rules

## Guiding Principle

> **Server Components for the initial load, TanStack Query for interactivity.**
> Never duplicate server data in a global store.

---

## Decision Tree

```
Is the data needed for the initial render (SEO, LCP)?
├── YES → Server Component fetch (direct to DB or API)
│
Does the data change with user interaction (filters, pagination)?
├── YES → TanStack Query in Client Component
│
Is it an infinite or scroll-paginated list?
├── YES → useInfiniteQuery from TanStack Query
│
Is it real-time (chat, notifications)?
├── YES → WebSocket/SSE + query invalidation
```

---

## 1. Server Component Fetch (Next.js)

```tsx
// ✅ Direct fetch in Server Components — no useEffect, no useState
// app/products/page.tsx
async function ProductsPage() {
  // Parallel fetch — no waterfall
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

// ✅ Fetch with cache tags for granular invalidation
async function getProduct(id: string) {
  return fetch(`${env.API_URL}/products/${id}`, {
    next: { tags: [`product-${id}`, 'products'] },
  }).then((r) => r.json());
}

// Invalidate in Server Action:
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
            staleTime: 60 * 1000,        // 1 min before refetch
            gcTime: 5 * 60 * 1000,       // 5 min in cache
            retry: 1,                     // 1 retry on error
            refetchOnWindowFocus: false,  // No refetch on tab focus
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
// ✅ Query with factory pattern (organized keys)
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
    placeholderData: keepPreviousData, // No flash when changing filters
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => fetchProduct(id),
    enabled: !!id, // Only fetch if there's an id
  });
}
```

### Mutations with Optimistic Updates

```tsx
// ✅ Mutation with optimistic update
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) =>
      fetch(`/api/favorites/${productId}`, { method: 'POST' }),

    // Optimistic: update UI immediately
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: productKeys.lists() });

      const previousProducts = queryClient.getQueryData<Product[]>(productKeys.lists());

      queryClient.setQueryData<Product[]>(productKeys.lists(), (old) =>
        old?.map((p) =>
          p.id === productId ? { ...p, isFavorite: !p.isFavorite } : p,
        ),
      );

      return { previousProducts }; // Context for rollback
    },

    // Rollback on failure
    onError: (_err, _productId, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(productKeys.lists(), context.previousProducts);
      }
    },

    // Always refetch to sync
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}
```

---

## 3. Infinite Scroll

```tsx
// ✅ Infinite query with Intersection Observer
export function useInfiniteProducts(filters: ProductFilters) {
  return useInfiniteQuery({
    queryKey: [...productKeys.list(filters), 'infinite'],
    queryFn: ({ pageParam }) =>
      fetchProducts({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

// Hook for automatic trigger
function useIntersectionObserver(
  onIntersect: () => void,
  enabled: boolean,
) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) onIntersect(); },
      { rootMargin: '200px' }, // Pre-fetch 200px before reaching
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onIntersect, enabled]);

  return ref;
}

// Component
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
// ✅ Prefetch on hover (anticipates navigation)
function ProductCard({ product }: { product: Product }) {
  const queryClient = useQueryClient();

  function handleMouseEnter() {
    queryClient.prefetchQuery({
      queryKey: productKeys.detail(product.id),
      queryFn: () => fetchProduct(product.id),
      staleTime: 5 * 60 * 1000, // No re-fetch if < 5 min
    });
  }

  return (
    <Link href={`/products/${product.id}`} onMouseEnter={handleMouseEnter}>
      <Card>{product.name}</Card>
    </Link>
  );
}

// ✅ Prefetch in Server Component (hydration)
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
      <ProductList />  {/* Client Component uses useProducts() — already has data */}
    </HydrationBoundary>
  );
}
```

---

## 5. Loading and Error Patterns

```tsx
// ✅ Consistent pattern for queries
function ProductList() {
  const { data, isLoading, isError, error } = useProducts(filters);

  if (isLoading) return <ProductGridSkeleton />;
  if (isError) return <ErrorState message={error.message} onRetry={() => {}} />;
  if (data.length === 0) return <EmptyState message="No products found" />;

  return <ProductGrid products={data} />;
}

// ❌ NEVER: manual loading boolean + useEffect fetch
// ❌ NEVER: API data in useState/Zustand
```

---

## Anti-patterns

```tsx
// ❌ Fetch in useEffect without cleanup
useEffect(() => {
  fetch('/api/products').then(r => r.json()).then(setData);
}, []); // ❌ No AbortController, no loading, no error

// ❌ Storing API response in Zustand/Redux
const useStore = create((set) => ({
  products: [],
  fetchProducts: async () => { // ❌ Duplicating TanStack Query cache
    const data = await fetch('/api/products').then(r => r.json());
    set({ products: data });
  },
}));

// ❌ Query keys as magic strings
useQuery({ queryKey: ['products', 'list', filters] });  // ❌ Prone to typos
useQuery({ queryKey: productKeys.list(filters) });       // ✅ Factory

// ❌ Waterfall of fetches in Server Components
const user = await getUser();           // 500ms
const products = await getProducts();    // 800ms — waits for user unnecessarily
// ✅ Promise.all([getUser(), getProducts()])  — parallel: 800ms total
```
