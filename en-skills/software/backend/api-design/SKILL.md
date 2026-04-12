---
name: api-design
description: >
  REST API design conventions for Node.js backend. Covers endpoint naming,
  correct HTTP methods, status codes, pagination, filtering, sorting,
  response envelope, versioning, and documentation generation with
  OpenAPI/Swagger.
---

# 🌐 API Design — REST Conventions

## Principle

> **The API is the backend's public contract.**
> It must be predictable, consistent, and self-documented.
> A consumer should be able to guess an endpoint without reading docs.

---

## Endpoint Naming

```
RULES:
  1. Plural nouns for resources: /users, /orders, /products
  2. Kebab-case for multi-word: /order-items, /payment-methods
  3. Maximum 2 levels of nesting: /users/:id/orders (ok) 
     ❌ /users/:id/orders/:orderId/items/:itemId/reviews
  4. Actions as sub-resource or verb: POST /orders/:id/cancel
  5. No verbs in the path (the HTTP method is the verb)
     ❌ GET /getUsers, POST /createUser

EXAMPLES:
  GET    /users              → List users
  POST   /users              → Create user
  GET    /users/:id          → Get user by ID
  PATCH  /users/:id          → Partially update
  PUT    /users/:id          → Full replace
  DELETE /users/:id          → Delete user
  GET    /users/:id/orders   → List user's orders
  POST   /orders/:id/cancel  → Action on resource
```

---

## HTTP Methods

```
GET     → Read resource(s). Idempotent. No body. Cacheable.
POST    → Create resource or execute action. Not idempotent.
PUT     → Replace entire resource. Idempotent.
PATCH   → Update partial fields. Idempotent.
DELETE  → Delete resource. Idempotent.

PREFER PATCH OVER PUT:
  PUT requires sending ALL fields → error-prone
  PATCH sends only what changes → safer and more practical
  Use PUT only when semantically replacing the entire resource
```

---

## Status Codes

```
SUCCESS:
  200 OK              → Successful GET, successful PATCH, DELETE with body
  201 Created         → POST that creates a resource (include Location header)
  204 No Content      → Successful DELETE without body, PUT/PATCH without body

REDIRECTION:
  301 Moved           → Endpoint permanently moved
  304 Not Modified    → Cache hit (ETag / Last-Modified)

CLIENT ERROR:
  400 Bad Request     → Validation failed (body, query params)
  401 Unauthorized    → Not authenticated (missing token or invalid token)
  403 Forbidden       → Authenticated but without permissions
  404 Not Found       → Resource does not exist
  409 Conflict        → Duplicate, constraint violation
  422 Unprocessable   → Valid data but business logic rejects it
  429 Too Many Req    → Rate limit exceeded

SERVER ERROR:
  500 Internal        → Unexpected error (do not expose details to client)
  502 Bad Gateway     → Upstream service failed
  503 Unavailable     → Service under maintenance

GENERAL RULE:
  4xx → the client can fix the request
  5xx → the client can't do anything, it's the server's fault
```

---

## Response Envelope

```typescript
// Successful response — single object
{
  "data": {
    "id": "usr_abc123",
    "name": "Juan",
    "email": "juan@example.com"
  }
}

// Successful response — paginated list
{
  "data": [...],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8
  }
}

// Error response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The submitted data is not valid",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}

// Error response with request ID
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Internal server error",
    "requestId": "req_abc123"
  }
}
```

### Envelope Implementation

```typescript
// NestJS — interceptor for automatic wrapping
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { data: T }> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<{ data: T }> {
    return next.handle().pipe(
      map((data) => {
        // If already formatted, don't wrap
        if (data?.data !== undefined || data?.error !== undefined) {
          return data;
        }
        return { data };
      }),
    );
  }
}
```

---

## Pagination

```
TYPES:
  Offset-based → page + pageSize (simple, issues with changing data)
  Cursor-based → cursor + limit (stable, better for infinite scroll)

USE OFFSET FOR:
  ✅ Admin panels with numeric pagination
  ✅ Static datasets or ones that change infrequently

USE CURSOR FOR:
  ✅ Feeds, timelines, growing lists
  ✅ Large datasets (> 100k records)
  ✅ When deep offset is costly (OFFSET 100000)
```

```typescript
// Offset-based: GET /users?page=2&pageSize=20
interface PaginationQuery {
  page: number;      // default: 1, min: 1
  pageSize: number;  // default: 20, min: 1, max: 100
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// Cursor-based: GET /users?cursor=usr_abc123&limit=20
interface CursorQuery {
  cursor?: string;  // ID of the last seen item
  limit: number;    // default: 20, max: 100
}

interface CursorResponse<T> {
  data: T[];
  meta: {
    nextCursor: string | null;  // null = no more pages
    hasMore: boolean;
  };
}
```

---

## Filtering and Sorting

```
FILTERING:
  GET /users?status=active&role=admin
  GET /orders?createdAfter=2024-01-01&createdBefore=2024-12-31
  GET /products?minPrice=10&maxPrice=100

  Rule: filters as flat query params, no nested objects.
  
SEARCH:
  GET /users?search=juan          ← General search (full-text)
  GET /users?email=juan@test.com  ← Exact filter by field

SORTING:
  GET /users?sort=createdAt       ← Ascending by default
  GET /users?sort=-createdAt      ← Descending (- prefix)
  GET /users?sort=-createdAt,name ← Multiple fields

  Explicit alternative:
  GET /users?sortBy=createdAt&sortOrder=desc
```

---

## IDs

```
PREFER:
  ✅ UUID v7 (sortable, doesn't expose sequence) → crypto.randomUUID()
  ✅ Prefixed IDs: usr_abc123, ord_xyz789 → clarity in logs and debugging
  ✅ CUID2 / NanoID → shorter, URL-safe

AVOID:
  ❌ Auto-increment integers exposed to client → enumeration attacks
  ❌ UUID v4 without prefix → impossible to know the type in logs

IMPLEMENTATION:
  The ID is generated on the backend, never on the frontend.
  The ID is included in the creation response (201 Created).
```

---

## Versioning

```
RECOMMENDED STRATEGY: URL prefix

  /api/v1/users
  /api/v2/users

WHEN TO VERSION:
  ✅ Breaking changes (response structure change, removed fields)
  ❌ Adding optional fields is NOT a breaking change

RULES:
  1. v1 always. Even if "there are no plans for v2"
  2. Previous version active for at least 6 months post-deprecation
  3. Sunset header with end-of-life date
  4. No more than 2 active versions simultaneously
```

---

## OpenAPI / Swagger

```
RULE: Every public API or one shared with frontend MUST have automatically
  generated OpenAPI documentation.

NestJS:
  Use @nestjs/swagger with decorators
  @ApiTags, @ApiOperation, @ApiResponse, @ApiProperty
  The DTO IS the documentation — don't duplicate.

Express:
  Use swagger-jsdoc + swagger-ui-express
  JSDoc comments on handlers → generates spec
  Or manual OpenAPI spec in /docs/openapi.yaml

RULES:
  1. Generate the spec, don't write it by hand (except for simple Express)
  2. Include all possible status codes
  3. Include request/response examples
  4. Swagger UI accessible at /api/docs (development/staging only)
  5. Spec exportable as JSON/YAML for clients (codegen)
```

```typescript
// NestJS — example with @nestjs/swagger
@ApiTags('users')
@Controller('users')
export class UsersController {
  @Get()
  @ApiOperation({ summary: 'List paginated users' })
  @ApiResponse({ status: 200, type: PaginatedUsersResponse })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(@Query() query: PaginationDto) {
    return this.usersService.findAll(query);
  }
}
```

---

## Anti-patterns

```
❌ Mixing plural and singular: /user/:id/orders → /users/:id/orders
❌ Verbs in URLs: /getUsers → GET /users
❌ Deep nesting: /a/:id/b/:id/c/:id → flatten
❌ Status 200 for everything (including errors) → use correct codes
❌ Response without envelope → always { data } or { error }
❌ Pagination without maximum limit → attacker requests pageSize=999999
❌ Sequential IDs exposed → use UUIDs/CUIDs
❌ Ignoring Content-Type → always validate application/json
❌ API without documentation → OpenAPI is mandatory for shared APIs
```
