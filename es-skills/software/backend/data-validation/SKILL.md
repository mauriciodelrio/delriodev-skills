---
name: data-validation
description: >
  Usa esta skill cuando valides o transformes datos de entrada en un
  backend Node.js. Cubre Zod (schema-first), class-validator (NestJS pipes),
  DTOs, sanitización, transformación de tipos y patrones para validación
  de negocio vs validación de formato.
---

# Data Validation — Validación de Input

## Flujo de trabajo del agente

**1.** Elegir stack de validación: Zod o class-validator (sección 1).
**2.** Definir schemas/DTOs para el endpoint (secciones 2–3).
**3.** Separar validación de formato (controller) vs negocio (service) (sección 4).
**4.** Aplicar sanitización y validar params/IDs (secciones 5–6).
**5.** Verificar contra la lista de gotchas (sección 8).

## 1. Stack de Validación

**Zod (preferido):**
- Schema-first: define schema → infiere tipo TypeScript.
- Funciona en NestJS y Express.
- Mismo schema compartible con frontend.
- Composable: `.extend()`, `.merge()`, `.pick()`, `.omit()`.
- Runtime validation + TypeScript types.

**class-validator + class-transformer (NestJS nativo):**
- Decorators en clases DTO.
- Integración directa con NestJS `ValidationPipe`.
- Usar cuando el equipo prefiere el approach OOP.
- No comparte schemas con frontend.

## 2. Zod — Schemas y DTOs

```typescript
import { z } from 'zod';

// Schema base
const createUserSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase(),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  role: z.enum(['user', 'admin']).default('user'),
  age: z.coerce.number().int().min(18).max(120).optional(),
});

// Tipo inferido automáticamente
type CreateUserDto = z.infer<typeof createUserSchema>;

// Schema de update: todos los campos opcionales
const updateUserSchema = createUserSchema.partial().omit({ password: true });

// Schema de query params (siempre strings → coerce)
const listUsersQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  role: z.enum(['user', 'admin']).optional(),
  sort: z.enum(['name', 'createdAt', '-name', '-createdAt']).default('-createdAt'),
});
```

### Zod — Middleware Express

```typescript
import { ZodSchema } from 'zod';

function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Los datos enviados no son válidos',
          details: result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
    }
    req[source] = result.data; // Datos transformados y validados
    next();
  };
}

// Uso
router.post('/users', validate(createUserSchema), createUser);
router.get('/users', validate(listUsersQuery, 'query'), listUsers);
```

### Zod — Pipe NestJS

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
        message: 'Los datos enviados no son válidos',
        details: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}

// Uso en controller
@Post()
create(@Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserDto) {
  return this.usersService.create(dto);
}
```

## 3. class-validator — NestJS nativo

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

// Activar ValidationPipe global en main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,           // Elimina propiedades no decoradas
  forbidNonWhitelisted: true, // Error si envían propiedades desconocidas
  transform: true,            // Transforma tipos automáticamente
  transformOptions: {
    enableImplicitConversion: true,
  },
}));
```

## 4. Validación por Capas

**Capa 1 — Formato (Controller / Middleware):**
¿Es un email válido? ¿El string tiene mínimo 8 chars? ¿El number es positivo? ¿El enum es válido? → Zod / class-validator → Retorna **400 Bad Request**.

**Capa 2 — Negocio (Service):**
¿El email ya está registrado? ¿El usuario tiene saldo suficiente? ¿La fecha de reserva es futura? ¿El producto tiene stock? → Lógica en el service → Retorna **409 Conflict / 422 Unprocessable Entity**.

**No mezclar:** verificar "email duplicado" en el validator es lógica de negocio. Verificar "es email válido" en el service es formato.

## 5. Sanitización

```typescript
// REGLAS DE SANITIZACIÓN:
//   1. trim() strings → trailing spaces
//   2. toLowerCase() emails → case-insensitive
//   3. Escapar HTML si se almacena para renderizar → prevenir stored XSS
//   4. Strip campos no esperados → whitelist: true en NestJS

// Zod — sanitización inline
const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1)
    .max(5000)
    .transform((val) => sanitizeHtml(val, { allowedTags: [] })), // strip HTML
});

// NUNCA:
//   ❌ Confiar en que el frontend sanitiza
//   ❌ Almacenar HTML raw del usuario sin sanitizar
//   ❌ Usar regex para "limpiar" HTML → usar librería (sanitize-html, DOMPurify)
```

## 6. Validación de Params y IDs

```typescript
// Siempre validar que IDs tienen el formato correcto
const uuidParam = z.object({
  id: z.string().uuid('ID must be a valid UUID'),
});

// Express
router.get('/users/:id', validate(uuidParam, 'params'), getUser);

// NestJS — ParseUUIDPipe built-in
@Get(':id')
findOne(@Param('id', ParseUUIDPipe) id: string) {
  return this.usersService.findOne(id);
}
```

## 7. Schemas Reutilizables

```typescript
// Shared schemas para patterns comunes
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).refine(
  (data) => !data.from || !data.to || data.from <= data.to,
  { message: '"from" debe ser anterior a "to"' },
);

// Composición
const listOrdersQuery = paginationSchema
  .merge(dateRangeSchema)
  .extend({
    status: z.enum(['pending', 'shipped', 'delivered']).optional(),
  });
```

## 8. Gotchas

- Validar solo en frontend — el backend **siempre** valida.
- Zod y class-validator mezclados en el mismo proyecto — elegir uno.
- DTOs sin whitelist — el cliente puede inyectar campos extra.
- Confiar en tipos TypeScript para runtime safety — TS no existe en runtime.
- Regex complejo para validar emails — usar `z.string().email()`.
- Validación de negocio en el schema — eso va en el service.
- Schema gigante de 100+ campos — dividir en sub-schemas composables.
- `transform()` que muta datos de forma inesperada — solo sanitización y format.
- No validar query params — `pageSize=999999`, SQL injection en sort.

## 9. Skills Relacionadas

| Skill | Por qué |
|-------|--------|
| `testing` | Tests de schemas: valid inputs, edge cases, error messages |
| `api-design` | Validación va en el request pipeline antes de la lógica |
| `security` | Sanitización como primera línea de defensa |
| `frontend/forms-and-validation-rules` | Schemas Zod compartidos cliente/servidor |
| `clean-code-principles` | Schemas composables, DRY, naming expresivo |
