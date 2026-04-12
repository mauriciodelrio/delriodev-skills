---
name: typescript-patterns
description: >
  Patrones avanzados de TypeScript para desarrollo full-stack. Cubre
  generics, utility types, discriminated unions, type narrowing, satisfies,
  module augmentation, branded types, tipos compartidos frontend↔backend,
  y patrones de inferencia de tipos. Transversal a frontend y backend.
---

# 🔷 TypeScript Patterns — Tipos Avanzados

## Principio

> **TypeScript es tu primera línea de defensa contra bugs.**
> Un type system bien usado atrapa errores en compilación,
> no en producción. Invertir en tipos buenos es invertir en calidad.

---

## Configuración Base

```jsonc
// tsconfig.json — strict SIEMPRE
{
  "compilerOptions": {
    "strict": true,                    // Habilita todo lo siguiente:
    // "strictNullChecks": true,       // null/undefined son tipos distintos
    // "noImplicitAny": true,          // Prohibir 'any' implícito
    // "strictFunctionTypes": true,    // Parámetros de funciones estrictos
    // "strictPropertyInitialization": true,
    
    "noUncheckedIndexedAccess": true,  // array[0] es T | undefined
    "exactOptionalProperties": true,   // undefined !== optional
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    
    "target": "ES2022",
    "module": "NodeNext",             // Backend
    "moduleResolution": "NodeNext",
    
    "skipLibCheck": true,             // Faster builds
    "forceConsistentCasingInFileNames": true,
  }
}
```

---

## Generics — Patrones Comunes

```typescript
// 1. Función genérica con constraint
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// 2. Genérico con default
interface PaginatedResponse<T = unknown> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// 3. Factory genérica
function createRepository<T extends { id: string }>(model: PrismaModel<T>) {
  return {
    findById: (id: string): Promise<T | null> => model.findUnique({ where: { id } }),
    findAll: (): Promise<T[]> => model.findMany(),
    create: (data: Omit<T, 'id'>): Promise<T> => model.create({ data }),
  };
}

// 4. Genérico con múltiples constraints
function merge<T extends object, U extends object>(target: T, source: U): T & U {
  return { ...target, ...source };
}
```

---

## Utility Types — Referencia Rápida

```typescript
// BUILT-IN UTILITY TYPES

Partial<T>          // Todos los campos opcionales
Required<T>         // Todos los campos requeridos
Readonly<T>         // Todos los campos readonly
Record<K, V>        // Objeto con keys K y valores V
Pick<T, K>          // Solo los campos K de T
Omit<T, K>          // Todo excepto los campos K
Exclude<T, U>       // Tipos en T que no están en U
Extract<T, U>       // Tipos en T que están en U
NonNullable<T>      // Excluir null y undefined
ReturnType<F>       // Tipo de retorno de función F
Parameters<F>       // Tuple de parámetros de función F
Awaited<T>          // Unwrap de Promise<T>

// COMBINACIONES COMUNES
type CreateDto = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
type UpdateDto = Partial<CreateDto>;
type UserResponse = Pick<User, 'id' | 'name' | 'email' | 'role'>;

// CUSTOM UTILITY TYPES
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

type Nullable<T> = T | null;

type ValueOf<T> = T[keyof T];
```

---

## Discriminated Unions

```typescript
// PATRÓN: Un campo literal (discriminant) diferencia cada variante
// TypeScript hace narrowing automático en switch/if

type ApiResponse<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: { code: string; message: string } }
  | { status: 'loading' };

function handleResponse(response: ApiResponse<User>) {
  switch (response.status) {
    case 'success':
      // TypeScript sabe que response.data existe aquí
      console.log(response.data.name);
      break;
    case 'error':
      // TypeScript sabe que response.error existe aquí
      console.log(response.error.message);
      break;
    case 'loading':
      // No hay data ni error
      break;
  }
}

// Eventos tipados
type AppEvent =
  | { type: 'USER_CREATED'; payload: { userId: string; email: string } }
  | { type: 'ORDER_PLACED'; payload: { orderId: string; total: number } }
  | { type: 'PAYMENT_FAILED'; payload: { orderId: string; reason: string } };

function handleEvent(event: AppEvent) {
  switch (event.type) {
    case 'USER_CREATED':
      // event.payload es { userId, email }
      break;
    case 'ORDER_PLACED':
      // event.payload es { orderId, total }
      break;
  }
}
```

---

## Type Narrowing

```typescript
// 1. typeof
function format(value: string | number): string {
  if (typeof value === 'string') return value.toUpperCase();
  return value.toFixed(2);
}

// 2. in operator
interface Dog { bark(): void; }
interface Cat { meow(): void; }

function speak(animal: Dog | Cat) {
  if ('bark' in animal) animal.bark();
  else animal.meow();
}

// 3. instanceof
function handleError(error: unknown) {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof Error) {
    return { code: 'UNKNOWN', message: error.message };
  }
  return { code: 'UNKNOWN', message: 'An error occurred' };
}

// 4. Custom type guards
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value &&
    typeof (value as User).email === 'string'
  );
}

// 5. Assertion functions
function assertDefined<T>(value: T | undefined | null, name: string): asserts value is T {
  if (value == null) {
    throw new Error(`${name} is not defined`);
  }
}

const user = await findUser(id);
assertDefined(user, 'User');
// Después de esto, TypeScript sabe que user es User (no null/undefined)
```

---

## `satisfies` Operator

```typescript
// satisfies verifica el tipo SIN ampliarlo
// Mantiene el tipo literal inferido

// ❌ Sin satisfies: tipo se amplía
const routes: Record<string, string> = {
  home: '/',
  about: '/about',
};
routes.home; // string (no '/')

// ✅ Con satisfies: tipo literal preservado
const routes = {
  home: '/',
  about: '/about',
} satisfies Record<string, string>;
routes.home; // '/' (literal)

// Caso real: config tipada con autocompletado
const theme = {
  colors: {
    primary: '#3490dc',
    secondary: '#ffed4a',
    danger: '#e3342f',
  },
  spacing: {
    sm: '0.5rem',
    md: '1rem',
    lg: '2rem',
  },
} satisfies Record<string, Record<string, string>>;

// theme.colors.primary es '#3490dc' (literal), no string
```

---

## Branded Types (Nominal Typing)

```typescript
// TypeScript usa structural typing: string === string
// Branded types crean tipos nominales para IDs y valores

type Brand<T, B extends string> = T & { readonly __brand: B };

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;
type Email = Brand<string, 'Email'>;

// Constructor functions con validación
function UserId(id: string): UserId {
  return id as UserId;
}

function Email(value: string): Email {
  if (!value.includes('@')) throw new Error('Invalid email');
  return value.toLowerCase() as Email;
}

// Ahora TypeScript previene mezclar IDs
function getUser(id: UserId): Promise<User> { ... }
function getOrder(id: OrderId): Promise<Order> { ... }

const userId = UserId('usr_123');
const orderId = OrderId('ord_456');

getUser(userId);    // ✅
getUser(orderId);   // ❌ Type error: OrderId is not assignable to UserId
```

---

## Module Augmentation

```typescript
// Extender tipos de librerías existentes sin modificarlas

// Augment Express Request
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: {
        id: string;
        email: string;
        roles: string[];
      };
    }
  }
}

// Augment environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT: string;
      DATABASE_URL: string;
      JWT_SECRET: string;
      REDIS_URL: string;
    }
  }
}

// Archivo separado para declaraciones: types/express.d.ts, types/env.d.ts
// Asegurar que está incluido en tsconfig: "include": ["src", "types"]
export {}; // Necesario para que sea un module, no un script
```

---

## Tipos Compartidos Frontend ↔ Backend

```typescript
// packages/shared-types/src/index.ts (en monorepo)
// O: shared/types.ts (en proyecto simple)

// DTOs compartidos
export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
}

// Response types
export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string; // ISO date string (no Date — serialización JSON)
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
    requestId?: string;
  };
}

// REGLAS:
//   ✅ Dates como ISO strings (JSON no tiene Date nativo)
//   ✅ Enums como string unions (no TypeScript enums)
//   ✅ Solo tipos/interfaces — no lógica runtime
//   ✅ En monorepo: paquete interno (packages/shared-types)
//   ✅ Frontend importa types del paquete, no del backend directo
```

---

## Inferencia desde Zod Schemas

```typescript
import { z } from 'zod';

// Schema como source of truth
const userSchema = z.object({
  id: z.string().cuid2(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(['user', 'admin']),
  createdAt: z.date(),
});

// Tipo inferido automáticamente
type User = z.infer<typeof userSchema>;
// { id: string; name: string; email: string; role: 'user' | 'admin'; createdAt: Date }

// DTOs derivados
const createUserSchema = userSchema.omit({ id: true, createdAt: true });
type CreateUserDto = z.infer<typeof createUserSchema>;

const updateUserSchema = createUserSchema.partial();
type UpdateUserDto = z.infer<typeof updateUserSchema>;

// VENTAJA: Un solo source of truth (schema) para:
//   - Runtime validation
//   - TypeScript types
//   - Frontend y backend
```

---

## Patrones Avanzados

```typescript
// Template Literal Types
type EventName = `on${Capitalize<string>}`;
type CSSProperty = `--${string}`;
type Route = `/${string}`;

// Conditional Types
type ApiReturn<T> = T extends Array<infer U> ? PaginatedResponse<U> : { data: T };

// Mapped Types con transformación
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

// Const assertions para enums
const ROLES = ['user', 'admin', 'superadmin'] as const;
type Role = (typeof ROLES)[number]; // 'user' | 'admin' | 'superadmin'

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NOT_FOUND: 404,
} as const;
type StatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS]; // 200 | 201 | 404
```

---

## Anti-patrones

```
❌ any como escape → usar unknown + type guard
❌ as Type sin verificar → es un cast inseguro, preferir type guards
❌ // @ts-ignore liberalmente → arreglar el type error
❌ TypeScript enums → usar as const + string unions
❌ interface con I prefix → IUser → usar User (el prefix no agrega valor)
❌ Tipos excesivamente complejos → si no se entiende, simplificar
❌ export type {} olvidado en .d.ts → el archivo se vuelve script global
❌ Duplicar tipos entre frontend y backend → compartir en paquete
❌ Date en interfaces de API → usar string (ISO) para serialización JSON
❌ strict: false → SIEMPRE strict: true desde el día 1
❌ Tipos con propiedades opcionales innecesarias → preferir discriminated unions
```
