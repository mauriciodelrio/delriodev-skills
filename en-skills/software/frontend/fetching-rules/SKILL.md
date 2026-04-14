---
name: fetching-rules
description: >
  Use this skill when implementing data fetching in React/Next.js:
  TanStack Query v5, Server Components fetch, cache invalidation,
  optimistic updates, prefetching, infinite scroll, and
  loading/error patterns.
---

# Data Fetching

## Agent workflow

1. Consult decision tree to choose fetching strategy.
2. Server Component fetch for initial render/SEO (section 1).
3. TanStack Query for interactive data: query keys with factory, mutations with optimistic update (section 2).
4. useInfiniteQuery + IntersectionObserver for infinite scroll (section 3).
5. Prefetch on hover or HydrationBoundary to anticipate navigation (section 4).
6. Consistent pattern: isLoading → skeleton, isError → error state, empty → empty state (section 5).

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

### Mutations with Optimistic Updates

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

## 5. Loading and Error Patterns

```tsx
function ProductList() {
  const { data, isLoading, isError, error } = useProducts(filters);

  if (isLoading) return <ProductGridSkeleton />;
  if (isError) return <ErrorState message={error.message} onRetry={() => {}} />;
  if (data.length === 0) return <EmptyState message="No products found" />;

  return <ProductGrid products={data} />;
}
```

## 6. API Client Layer (Vite SPA)

In an SPA, all queries and mutations go through an API client that encapsulates base URL, auth header injection, and error normalization:

```typescript
// shared/lib/api-client.ts
import { getToken, clearAuth } from '@features/auth';
import { env } from '@config/env';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${env.VITE_API_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    clearAuth();
    window.location.href = '/login';
    throw new ApiError(401, 'Session expired');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.message ?? `HTTP ${response.status}`, body.errors);
  }

  return response.json();
}
```

```typescript
// features/persons/services/persons.service.ts
import { apiClient } from '@shared/lib/api-client';
import type { Person, CreatePersonData, UpdatePersonData } from '../types/persons.types';

export const personsApi = {
  list: (params?: { page?: number; search?: string }) =>
    apiClient<{ data: Person[]; meta: { total: number } }>(
      `/api/v1/persons?${new URLSearchParams(params as Record<string, string>)}`,
    ),
  getById: (id: string) => apiClient<{ data: Person }>(`/api/v1/persons/${id}`),
  create: (data: CreatePersonData) =>
    apiClient<{ data: Person }>('/api/v1/persons', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdatePersonData) =>
    apiClient<{ data: Person }>(`/api/v1/persons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) => apiClient<void>(`/api/v1/persons/${id}`, { method: 'DELETE' }),
};
```

```typescript
// features/persons/hooks/usePersons.ts — TanStack Query using the service
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { personsApi } from '../services/persons.service';

export const personKeys = {
  all: ['persons'] as const,
  lists: () => [...personKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...personKeys.lists(), filters] as const,
  details: () => [...personKeys.all, 'detail'] as const,
  detail: (id: string) => [...personKeys.details(), id] as const,
};

export function usePersons(filters: { page?: number; search?: string }) {
  return useQuery({
    queryKey: personKeys.list(filters),
    queryFn: () => personsApi.list(filters),
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: personsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.lists() });
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: personsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.lists() });
    },
  });
}
```

## Gotchas

- `fetch` in `useEffect` without AbortController or loading/error states produces race conditions and memory leaks — use TanStack Query.
- Storing API response in Zustand/Redux duplicates TanStack Query's cache — let TQ be the single source of truth for server data.
- Query keys as magic strings (`['products', 'list']`) are prone to typos — use factory pattern (`productKeys.list(filters)`).
- Sequential fetches in Server Components (`await A; await B;`) create waterfalls — use `Promise.all` to parallelize.
- Manual loading boolean + `useState` for API data is a poor reimplementation of TanStack Query — use `isLoading`/`isError` from the hook.
