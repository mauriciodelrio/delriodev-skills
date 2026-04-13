---
name: api-design
description: >
  Use this skill when designing or modifying REST endpoints in a Node.js
  backend. Covers naming, HTTP methods, status codes, pagination, filtering,
  response envelope, versioning, and OpenAPI/Swagger documentation.
---

# API Design — REST Conventions

## Agent workflow

**1.** Define the resource and choose naming per section 1 rules.
**2.** Select correct HTTP method and status codes (sections 2–3).
**3.** Implement response envelope and pagination (sections 4–5).
**4.** Document with OpenAPI (section 9).
**5.** Check against the gotchas list (section 10).

## 1. Endpoint Naming

1. Plural nouns for resources: `/users`, `/orders`, `/products`
2. Kebab-case for multi-word: `/order-items`, `/payment-methods`
3. Maximum 2 levels of nesting: `/users/:id/orders` — never `/users/:id/orders/:orderId/items/:itemId/reviews`
4. Actions as sub-resource or verb: `POST /orders/:id/cancel`
5. No verbs in the path (the HTTP method is the verb) — never `GET /getUsers`

```
GET    /users              → List users
POST   /users              → Create user
GET    /users/:id          → Get user by ID
PATCH  /users/:id          → Partially update
PUT    /users/:id          → Full replace
DELETE /users/:id          → Delete user
GET    /users/:id/orders   → List user's orders
POST   /orders/:id/cancel  → Action on resource
```

## 2. HTTP Methods

**GET** — Read resource(s). Idempotent. No body. Cacheable.
**POST** — Create resource or execute action. Not idempotent.
**PUT** — Replace entire resource. Idempotent.
**PATCH** — Update partial fields. Idempotent.
**DELETE** — Delete resource. Idempotent.

**Prefer PATCH over PUT.** PUT requires sending ALL fields (error-prone). PATCH sends only what changes. Use PUT only when semantically replacing the entire resource.

## 3. Status Codes

**Success:**
- **200 OK** — Successful GET, successful PATCH, DELETE with body
- **201 Created** — POST that creates a resource (include Location header)
- **204 No Content** — Successful DELETE without body, PUT/PATCH without body

**Redirection:**
- **301 Moved** — Endpoint permanently moved
- **304 Not Modified** — Cache hit (ETag / Last-Modified)

**Client error:**
- **400 Bad Request** — Validation failed (body, query params)
- **401 Unauthorized** — Not authenticated (missing token or invalid token)
- **403 Forbidden** — Authenticated but without permissions
- **404 Not Found** — Resource does not exist
- **409 Conflict** — Duplicate, constraint violation
- **422 Unprocessable** — Valid data but business logic rejects it
- **429 Too Many Req** — Rate limit exceeded

**Server error:**
- **500 Internal** — Unexpected error (do not expose details to client)
- **502 Bad Gateway** — Upstream service failed
- **503 Unavailable** — Service under maintenance

**General rule:** 4xx → the client can fix the request. 5xx → the client can't do anything, it's the server's fault.

## 4. Response Envelope

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

## 5. Pagination

**Offset-based** (`page` + `pageSize`) — Simple, issues with changing data.
**Cursor-based** (`cursor` + `limit`) — Stable, better for infinite scroll.

**Use offset for:**
- Admin panels with numeric pagination
- Static datasets or ones that change infrequently

**Use cursor for:**
- Feeds, timelines, growing lists
- Large datasets (> 100k records)
- When deep offset is costly (OFFSET 100000)

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

## 6. Filtering and Sorting

**Filtering** — Filters as flat query params, no nested objects:

```
GET /users?status=active&role=admin
GET /orders?createdAfter=2024-01-01&createdBefore=2024-12-31
GET /products?minPrice=10&maxPrice=100
```

**Search:**

```
GET /users?search=juan          ← General search (full-text)
GET /users?email=juan@test.com  ← Exact filter by field
```

**Sorting:**

```
GET /users?sort=createdAt       ← Ascending by default
GET /users?sort=-createdAt      ← Descending (- prefix)
GET /users?sort=-createdAt,name ← Multiple fields
```

Explicit alternative: `GET /users?sortBy=createdAt&sortOrder=desc`

## 7. IDs

**Prefer:**
- UUID v7 (sortable, doesn't expose sequence) — `crypto.randomUUID()`
- Prefixed IDs: `usr_abc123`, `ord_xyz789` — clarity in logs and debugging
- CUID2 / NanoID — shorter, URL-safe

**Avoid:**
- Auto-increment integers exposed to client — enumeration attacks
- UUID v4 without prefix — impossible to know the type in logs

**Implementation:** The ID is generated on the backend, never on the frontend. It's included in the creation response (201 Created).

## 8. Versioning

**Recommended strategy:** URL prefix — `/api/v1/users`, `/api/v2/users`

**When to version:**
- Breaking changes (response structure change, removed fields)
- Adding optional fields is NOT a breaking change

**Rules:**
1. v1 always, even if "there are no plans for v2"
2. Previous version active for at least 6 months post-deprecation
3. `Sunset` header with end-of-life date
4. No more than 2 active versions simultaneously

## 9. OpenAPI / Swagger

Every public API or one shared with frontend MUST have automatically generated OpenAPI documentation.

**NestJS:** Use `@nestjs/swagger` with decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiProperty`). The DTO IS the documentation — don't duplicate.

**Express:** Use `swagger-jsdoc` + `swagger-ui-express`. JSDoc comments on handlers generate spec. Alternative: manual OpenAPI spec in `/docs/openapi.yaml`.

**Rules:**
1. Generate the spec, don't write it by hand (except for simple Express)
2. Include all possible status codes
3. Include request/response examples
4. Swagger UI accessible at `/api/docs` (development/staging only)
5. Spec exportable as JSON/YAML for clients (codegen)

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

## 10. Gotchas

- Mixing plural and singular: `/user/:id/orders` — always plural `/users/:id/orders`.
- Verbs in URLs: `/getUsers` — the HTTP method is the verb: `GET /users`.
- Deep nesting: `/a/:id/b/:id/c/:id` — flatten the route.
- Status 200 for everything (including errors) — use the correct status codes.
- Response without envelope — always `{ data }` or `{ error }`.
- Pagination without maximum limit — an attacker requests `pageSize=999999`.
- Sequential IDs exposed — use UUIDs/CUIDs.
- Ignoring Content-Type — always validate `application/json`.
- API without documentation — OpenAPI is mandatory for shared APIs.

## 11. Related Skills

| Skill | Why |
|-------|-----|
| `testing` | Integration tests for each endpoint (Supertest) |
| `data-validation` | DTOs and Zod schemas for inputs |
| `error-handling` | Correct status codes, consistent error responses |
| `security` | Rate limiting, sanitization, CORS |
| `logging` | Request logging with correlation IDs |
| `clean-code-principles` | JSDoc, RESTful naming, SRP |
