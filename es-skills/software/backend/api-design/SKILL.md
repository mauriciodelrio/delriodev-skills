---
name: api-design
description: >
  Convenciones de diseño de API REST para backend Node.js. Cubre naming de
  endpoints, métodos HTTP correctos, status codes, paginación, filtrado,
  ordenamiento, response envelope, versionado y generación de documentación
  con OpenAPI/Swagger.
---

# 🌐 API Design — Convenciones REST

## Principio

> **La API es el contrato público del backend.**
> Debe ser predecible, consistente y auto-documentada.
> Un consumidor debe poder adivinar un endpoint sin leer docs.

---

## Naming de Endpoints

```
REGLAS:
  1. Sustantivos en plural para recursos: /users, /orders, /products
  2. Kebab-case para multi-palabra: /order-items, /payment-methods
  3. Anidación máxima 2 niveles: /users/:id/orders (ok) 
     ❌ /users/:id/orders/:orderId/items/:itemId/reviews
  4. Acciones como sub-recurso o verbo: POST /orders/:id/cancel
  5. Sin verbos en el path (el método HTTP es el verbo)
     ❌ GET /getUsers, POST /createUser

EJEMPLOS:
  GET    /users              → Listar usuarios
  POST   /users              → Crear usuario
  GET    /users/:id          → Obtener usuario por ID
  PATCH  /users/:id          → Actualizar parcialmente
  PUT    /users/:id          → Reemplazar completo
  DELETE /users/:id          → Eliminar usuario
  GET    /users/:id/orders   → Listar órdenes del usuario
  POST   /orders/:id/cancel  → Acción sobre recurso
```

---

## Métodos HTTP

```
GET     → Leer recurso(s). Idempotente. No body. Cacheable.
POST    → Crear recurso o ejecutar acción. No idempotente.
PUT     → Reemplazar recurso completo. Idempotente.
PATCH   → Actualizar campos parciales. Idempotente.
DELETE  → Eliminar recurso. Idempotente.

PREFERIR PATCH SOBRE PUT:
  PUT requiere enviar TODOS los campos → propenso a errores
  PATCH envía solo lo que cambia → más seguro y práctico
  Usar PUT solo cuando semánticamente se reemplaza todo el recurso
```

---

## Status Codes

```
ÉXITO:
  200 OK              → GET exitoso, PATCH exitoso, DELETE con body
  201 Created         → POST que crea recurso (incluir Location header)
  204 No Content      → DELETE exitoso sin body, PUT/PATCH sin body

REDIRECCIÓN:
  301 Moved           → Endpoint movido permanentemente
  304 Not Modified    → Cache hit (ETag / Last-Modified)

ERROR DEL CLIENTE:
  400 Bad Request     → Validación falló (body, query params)
  401 Unauthorized    → No autenticado (falta token o token inválido)
  403 Forbidden       → Autenticado pero sin permisos
  404 Not Found       → Recurso no existe
  409 Conflict        → Duplicado, violación de constraint
  422 Unprocessable   → Datos válidos pero lógica de negocio los rechaza
  429 Too Many Req    → Rate limit exceeded

ERROR DEL SERVIDOR:
  500 Internal        → Error inesperado (no exponer detalles al cliente)
  502 Bad Gateway     → Upstream service falló
  503 Unavailable     → Servicio en mantenimiento

REGLA GENERAL:
  4xx → el cliente puede arreglar el request
  5xx → el cliente no puede hacer nada, es culpa del servidor
```

---

## Response Envelope

```typescript
// Respuesta exitosa — objeto individual
{
  "data": {
    "id": "usr_abc123",
    "name": "Juan",
    "email": "juan@example.com"
  }
}

// Respuesta exitosa — lista paginada
{
  "data": [...],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8
  }
}

// Respuesta de error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos",
    "details": [
      {
        "field": "email",
        "message": "Formato de email inválido"
      }
    ]
  }
}

// Respuesta de error con request ID
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Error interno del servidor",
    "requestId": "req_abc123"
  }
}
```

### Implementación del Envelope

```typescript
// NestJS — interceptor para wrapping automático
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { data: T }> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<{ data: T }> {
    return next.handle().pipe(
      map((data) => {
        // Si ya tiene el formato, no wrappear
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

## Paginación

```
TIPOS:
  Offset-based → page + pageSize (simple, problemas con datos que cambian)
  Cursor-based → cursor + limit (estable, mejor para infinite scroll)

USAR OFFSET PARA:
  ✅ Admin panels con paginación numérica
  ✅ Datasets estáticos o que cambian poco

USAR CURSOR PARA:
  ✅ Feeds, timelines, listas que crecen
  ✅ Datasets grandes (> 100k registros)
  ✅ Cuando el offset profundo es costoso (OFFSET 100000)
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
  cursor?: string;  // ID del último item visto
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

## Filtrado y Ordenamiento

```
FILTRADO:
  GET /users?status=active&role=admin
  GET /orders?createdAfter=2024-01-01&createdBefore=2024-12-31
  GET /products?minPrice=10&maxPrice=100

  Regla: filtros como query params planos, no nested objects.
  
BÚSQUEDA:
  GET /users?search=juan          ← Búsqueda general (full-text)
  GET /users?email=juan@test.com  ← Filtro exacto por campo

ORDENAMIENTO:
  GET /users?sort=createdAt       ← Ascendente por defecto
  GET /users?sort=-createdAt      ← Descendente (prefijo -)
  GET /users?sort=-createdAt,name ← Múltiples campos

  Alternativa explícita:
  GET /users?sortBy=createdAt&sortOrder=desc
```

---

## IDs

```
PREFERIR:
  ✅ UUID v7 (sortable, no expone secuencia) → crypto.randomUUID()
  ✅ Prefixed IDs: usr_abc123, ord_xyz789 → claridad en logs y debugging
  ✅ CUID2 / NanoID → más cortos, URL-safe

EVITAR:
  ❌ Auto-increment integers expuestos al cliente → enumeration attacks
  ❌ UUID v4 sin prefijo → imposible saber el tipo en logs

IMPLEMENTACIÓN:
  El ID se genera en el backend, nunca en el frontend.
  El ID se incluye en la respuesta de creación (201 Created).
```

---

## Versionado

```
ESTRATEGIA RECOMENDADA: URL prefix

  /api/v1/users
  /api/v2/users

CUÁNDO VERSIONAR:
  ✅ Breaking changes (cambio de estructura de response, campos removidos)
  ❌ Agregar campos opcionales NO es breaking change

REGLAS:
  1. v1 siempre. Incluso si "no hay planes de v2"
  2. Versión anterior activa mínimo 6 meses post-deprecation
  3. Header Sunset con fecha de end-of-life
  4. No más de 2 versiones activas simultáneas
```

---

## OpenAPI / Swagger

```
REGLA: Toda API pública o compartida con frontend DEBE tener documentación
  OpenAPI generada automáticamente.

NestJS:
  Usar @nestjs/swagger con decorators
  @ApiTags, @ApiOperation, @ApiResponse, @ApiProperty
  El DTO ES la documentación — no duplicar.

Express:
  Usar swagger-jsdoc + swagger-ui-express
  JSDoc comments sobre los handlers → genera spec
  O spec OpenAPI manual en /docs/openapi.yaml

REGLAS:
  1. Generar spec, no escribirla a mano (salvo Express simple)
  2. Incluir todos los status codes posibles
  3. Incluir ejemplos de request/response
  4. Swagger UI accesible en /api/docs (solo development/staging)
  5. Spec exportable como JSON/YAML para clients (codegen)
```

```typescript
// NestJS — ejemplo con @nestjs/swagger
@ApiTags('users')
@Controller('users')
export class UsersController {
  @Get()
  @ApiOperation({ summary: 'Listar usuarios paginados' })
  @ApiResponse({ status: 200, type: PaginatedUsersResponse })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(@Query() query: PaginationDto) {
    return this.usersService.findAll(query);
  }
}
```

---

## Anti-patrones

```
❌ Mezclar plural y singular: /user/:id/orders → /users/:id/orders
❌ Verbos en URLs: /getUsers → GET /users
❌ Anidación profunda: /a/:id/b/:id/c/:id → flatten
❌ Status 200 para todo (incluso errores) → usar codes correctos
❌ Response sin envelope → siempre { data } o { error }
❌ Pagination sin límite máximo → atacante pide pageSize=999999
❌ IDs secuenciales expuestos → usar UUIDs/CUIDs
❌ Ignorar Content-Type → validar siempre application/json
❌ API sin documentación → OpenAPI es obligatorio para APIs compartidas
```
