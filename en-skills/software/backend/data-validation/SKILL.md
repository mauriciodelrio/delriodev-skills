---
name: data-validation
description: >
  Use this skill when validating or transforming input data in a Node.js
  backend. Covers Zod (schema-first), class-validator (NestJS pipes),
  DTOs, sanitization, type transformation, and patterns for business
  validation vs format validation.
---

# Data Validation — Input Validation

## Agent workflow

**1.** Choose validation stack: Zod or class-validator (section 1).
**2.** Define schemas/DTOs for the endpoint (sections 2–3).
**3.** Separate format validation (controller) vs business (service) (section 4).
**4.** Apply sanitization and validate params/IDs (sections 5–6).
**5.** Check against the gotchas list (section 8).

## 1. Validation Stack

**Zod (preferred):**
- Schema-first: define schema → infer TypeScript type.
- Works with NestJS and Express.
- Same schema shareable with frontend.
- Composable: `.extend()`, `.merge()`, `.pick()`, `.omit()`.
- Runtime validation + TypeScript types.

**class-validator + class-transformer (NestJS native):**
- Decorators on DTO classes.
- Direct integration with NestJS `ValidationPipe`.
- Use when the team prefers the OOP approach.
- Doesn't share schemas with frontend.

## 2. Zod — Schemas and DTOs

```typescript
import { z } from 'zod';

// Base schema
const createUserSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase(),
  password: z.string()
    .min(8, 'Minimum 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  role: z.enum(['user', 'admin']).default('user'),
  age: z.coerce.number().int().min(18).max(120).optional(),
});

// Automatically inferred type
type CreateUserDto = z.infer<typeof createUserSchema>;

// Update schema: all fields optional
const updateUserSchema = createUserSchema.partial().omit({ password: true });

// Query params schema (always strings → coerce)
const listUsersQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  role: z.enum(['user', 'admin']).optional(),
  sort: z.enum(['name', 'createdAt', '-name', '-createdAt']).default('-createdAt'),
});
```

### Zod — Express Middleware

```typescript
import { ZodSchema } from 'zod';

function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The submitted data is not valid',
          details: result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
    }
    req[source] = result.data; // Transformed and validated data
    next();
  };
}

// Usage
router.post('/users', validate(createUserSchema), createUser);
router.get('/users', validate(listUsersQuery, 'query'), listUsers);
```

### Zod — NestJS Pipe

```typescript
import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'The submitted data is not valid',
        details: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}

// Usage in controller
@Post()
create(@Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserDto) {
  return this.usersService.create(dto);
}
```

## 3. class-validator — NestJS Native

```typescript
import { IsString, IsEmail, MinLength, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase())
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(['user', 'admin'])
  @IsOptional()
  role?: string = 'user';
}

// Enable global ValidationPipe in main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,           // Strips non-decorated properties
  forbidNonWhitelisted: true, // Error if unknown properties are sent
  transform: true,            // Transforms types automatically
  transformOptions: {
    enableImplicitConversion: true,
  },
}));
```

## 4. Layered Validation

**Layer 1 — Format (Controller / Middleware):**
Is it a valid email? Does the string have at least 8 chars? Is the number positive? Is the enum valid? → Zod / class-validator → Returns **400 Bad Request**.

**Layer 2 — Business (Service):**
Is the email already registered? Does the user have sufficient balance? Is the reservation date in the future? Does the product have stock? → Logic in the service → Returns **409 Conflict / 422 Unprocessable Entity**.

**Do not mix:** checking "duplicate email" in the validator is business logic. Checking "is valid email" in the service is format validation.

## 5. Sanitization

```typescript
// SANITIZATION RULES:
//   1. trim() strings → trailing spaces
//   2. toLowerCase() emails → case-insensitive
//   3. Escape HTML if stored for rendering → prevent stored XSS
//   4. Strip unexpected fields → whitelist: true in NestJS

// Zod — inline sanitization
const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1)
    .max(5000)
    .transform((val) => sanitizeHtml(val, { allowedTags: [] })), // strip HTML
});

// NEVER:
//   ❌ Trust that the frontend sanitizes
//   ❌ Store raw user HTML without sanitizing
//   ❌ Use regex to "clean" HTML → use a library (sanitize-html, DOMPurify)
```

## 6. Params and ID Validation

```typescript
// Always validate that IDs have the correct format
const uuidParam = z.object({
  id: z.string().uuid('ID must be a valid UUID'),
});

// Express
router.get('/users/:id', validate(uuidParam, 'params'), getUser);

// NestJS — built-in ParseUUIDPipe
@Get(':id')
findOne(@Param('id', ParseUUIDPipe) id: string) {
  return this.usersService.findOne(id);
}
```

## 7. Reusable Schemas

```typescript
// Shared schemas for common patterns
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).refine(
  (data) => !data.from || !data.to || data.from <= data.to,
  { message: '"from" must be before "to"' },
);

// Composition
const listOrdersQuery = paginationSchema
  .merge(dateRangeSchema)
  .extend({
    status: z.enum(['pending', 'shipped', 'delivered']).optional(),
  });
```

## 8. Gotchas

- Validate only on frontend — the backend **always** validates.
- Zod and class-validator mixed in the same project — pick one.
- DTOs without whitelist — the client can inject extra fields.
- Trusting TypeScript types for runtime safety — TS doesn't exist at runtime.
- Complex regex to validate emails — use `z.string().email()`.
- Schemas without HTML sanitization `.transform()` for free-text fields — see `security` section 3.
- Business validation in the schema — that belongs in the service.
- Giant schema with 100+ fields — split into composable sub-schemas.
- `transform()` that mutates data unexpectedly — only sanitization and formatting.
- Not validating query params — `pageSize=999999`, SQL injection in sort.

## 9. Related Skills

| Skill | Why |
|-------|-----|
| `testing` | Tests for schemas: valid inputs, edge cases, error messages |
| `api-design` | Validation goes in the request pipeline before logic |
| `security` | Sanitization as the first line of defense |
| `frontend/forms-and-validation-rules` | Shared Zod schemas client/server |
| `error-handling` | Error classes for validation (400 Bad Request) |
| `clean-code-principles` | Composable schemas, DRY, expressive naming |
