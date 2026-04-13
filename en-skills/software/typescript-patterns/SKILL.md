---
name: typescript-patterns
description: >
  Use this skill when defining TypeScript types, interfaces or schemas.
  Apply generics, utility types, discriminated unions, type narrowing,
  satisfies, branded types, module augmentation, shared frontend↔backend
  types and inference from Zod schemas. strict: true always.
---

# TypeScript Patterns

## Agent workflow

1. `strict: true` + `noUncheckedIndexedAccess` always in tsconfig.json
2. Discriminated unions over optional properties for modeling variants
3. `unknown` + type guards over `any` and `as Type` casts
4. `satisfies` to validate types while preserving literal inference
5. Zod schema as source of truth → infer types with `z.infer<>`
6. Shared types in dedicated package (monorepo) or shared file (simple project)
7. Validate against the Gotchas section before defining types

---

## Base Configuration

```jsonc
// tsconfig.json — strict ALWAYS
{
  "compilerOptions": {
    "strict": true,                    // Enables all of the following:
    // "strictNullChecks": true,       // null/undefined are distinct types
    // "noImplicitAny": true,          // Forbid implicit 'any'
    // "strictFunctionTypes": true,    // Strict function parameter types
    // "strictPropertyInitialization": true,
    
    "noUncheckedIndexedAccess": true,  // array[0] is T | undefined
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

## Generics — Common Patterns

```typescript
// 1. Generic function with constraint
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// 2. Generic with default
interface PaginatedResponse<T = unknown> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// 3. Generic factory
function createRepository<T extends { id: string }>(model: PrismaModel<T>) {
  return {
    findById: (id: string): Promise<T | null> => model.findUnique({ where: { id } }),
    findAll: (): Promise<T[]> => model.findMany(),
    create: (data: Omit<T, 'id'>): Promise<T> => model.create({ data }),
  };
}

// 4. Generic with multiple constraints
function merge<T extends object, U extends object>(target: T, source: U): T & U {
  return { ...target, ...source };
}
```

---

## Utility Types — Quick Reference

```typescript
// BUILT-IN UTILITY TYPES

Partial<T>          // All fields optional
Required<T>         // All fields required
Readonly<T>         // All fields readonly
Record<K, V>        // Object with keys K and values V
Pick<T, K>          // Only fields K from T
Omit<T, K>          // Everything except fields K
Exclude<T, U>       // Types in T that are not in U
Extract<T, U>       // Types in T that are in U
NonNullable<T>      // Exclude null and undefined
ReturnType<F>       // Return type of function F
Parameters<F>       // Parameter tuple of function F
Awaited<T>          // Unwrap Promise<T>

// COMMON COMBINATIONS
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
// PATTERN: A literal field (discriminant) differentiates each variant
// TypeScript automatically narrows in switch/if

type ApiResponse<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: { code: string; message: string } }
  | { status: 'loading' };

function handleResponse(response: ApiResponse<User>) {
  switch (response.status) {
    case 'success':
      // TypeScript knows response.data exists here
      console.log(response.data.name);
      break;
    case 'error':
      // TypeScript knows response.error exists here
      console.log(response.error.message);
      break;
    case 'loading':
      // No data or error
      break;
  }
}

// Typed events
type AppEvent =
  | { type: 'USER_CREATED'; payload: { userId: string; email: string } }
  | { type: 'ORDER_PLACED'; payload: { orderId: string; total: number } }
  | { type: 'PAYMENT_FAILED'; payload: { orderId: string; reason: string } };

function handleEvent(event: AppEvent) {
  switch (event.type) {
    case 'USER_CREATED':
      // event.payload is { userId, email }
      break;
    case 'ORDER_PLACED':
      // event.payload is { orderId, total }
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
// After this, TypeScript knows user is User (not null/undefined)
```

---

## `satisfies` Operator

```typescript
// satisfies verifies the type WITHOUT widening it
// Keeps the inferred literal type

// ❌ Without satisfies: type widens
const routes: Record<string, string> = {
  home: '/',
  about: '/about',
};
routes.home; // string (not '/')

// ✅ With satisfies: literal type preserved
const routes = {
  home: '/',
  about: '/about',
} satisfies Record<string, string>;
routes.home; // '/' (literal)

// Real-world case: typed config with autocomplete
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

// theme.colors.primary is '#3490dc' (literal), not string
```

---

## Branded Types (Nominal Typing)

```typescript
// TypeScript uses structural typing: string === string
// Branded types create nominal types for IDs and values

type Brand<T, B extends string> = T & { readonly __brand: B };

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;
type Email = Brand<string, 'Email'>;

// Constructor functions with validation
function UserId(id: string): UserId {
  return id as UserId;
}

function Email(value: string): Email {
  if (!value.includes('@')) throw new Error('Invalid email');
  return value.toLowerCase() as Email;
}

// Now TypeScript prevents mixing IDs
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
// Extend types from existing libraries without modifying them

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

// Separate file for declarations: types/express.d.ts, types/env.d.ts
// Ensure it's included in tsconfig: "include": ["src", "types"]
export {}; // Needed so it's a module, not a script
```

---

## Shared Types Frontend ↔ Backend

```typescript
// packages/shared-types/src/index.ts (in monorepo)
// Or: shared/types.ts (in simple project)

// Shared DTOs
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
  createdAt: string; // ISO date string (not Date — JSON serialization)
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

// RULES:
//   ✅ Dates as ISO strings (JSON has no native Date)
//   ✅ Enums as string unions (not TypeScript enums)
//   ✅ Only types/interfaces — no runtime logic
//   ✅ In monorepo: internal package (packages/shared-types)
//   ✅ Frontend imports types from the package, not directly from backend
```

---

## Inference from Zod Schemas

```typescript
import { z } from 'zod';

// Schema as source of truth
const userSchema = z.object({
  id: z.string().cuid2(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(['user', 'admin']),
  createdAt: z.date(),
});

// Automatically inferred type
type User = z.infer<typeof userSchema>;
// { id: string; name: string; email: string; role: 'user' | 'admin'; createdAt: Date }

// Derived DTOs
const createUserSchema = userSchema.omit({ id: true, createdAt: true });
type CreateUserDto = z.infer<typeof createUserSchema>;

const updateUserSchema = createUserSchema.partial();
type UpdateUserDto = z.infer<typeof updateUserSchema>;

// ADVANTAGE: A single source of truth (schema) for:
//   - Runtime validation
//   - TypeScript types
//   - Frontend and backend
```

---

## Advanced Patterns

```typescript
// Template Literal Types
type EventName = `on${Capitalize<string>}`;
type CSSProperty = `--${string}`;
type Route = `/${string}`;

// Conditional Types
type ApiReturn<T> = T extends Array<infer U> ? PaginatedResponse<U> : { data: T };

// Mapped Types with transformation
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

// Const assertions for enums
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

## Gotchas

- Never use `any` as an escape — use `unknown` + type guard to maintain type safety.
- `as Type` is an unsafe cast that silences the compiler — prefer type guards or assertion functions.
- Don't use `// @ts-ignore` liberally — fix the type error. If unavoidable, use `@ts-expect-error` which fails when the error disappears.
- TypeScript `enum` has tree-shaking and runtime issues — use `as const` + string unions.
- Don't use `I` prefix on interfaces (`IUser`) — just `User`. The prefix adds no value in TypeScript.
- Overly complex types (3+ levels of nested conditional types) are unreadable — simplify or split.
- Forgetting `export type {}` in `.d.ts` files turns them into global scripts that pollute the namespace.
- Don't duplicate types between frontend and backend — share from a package or common file.
- Using `Date` in API interfaces causes serialization issues — use `string` (ISO 8601) because JSON has no native Date type.
- Never `strict: false` — always `strict: true` from day 1. Migrating later is much more costly.
- Unnecessary optional properties (`name?: string`) create ambiguity — prefer discriminated unions to model variants explicitly.
