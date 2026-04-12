---
name: clean-code-principles
description: >
  Principios fundamentales de construcción de software limpio. Esta skill es el
  núcleo que aplica ANTES que cualquier otra: SOLID, DRY, KISS, YAGNI, métodos
  atómicos, encapsulación, inyección de dependencias, documentación JSDoc orientada
  al negocio, naming expresivo, guard clauses, composición, inmutabilidad, y
  separación de concerns. Todo acto de escribir código debe pasar por estas reglas.
---

# 🧱 Clean Code Principles

## Principio Rector

> **El código se lee 10x más de lo que se escribe.**
> Escribe para el humano que lo leerá en 6 meses — probablemente tú.
> Esta skill es el **núcleo**: aplica antes que cualquier otra skill específica.

---

## 1. SOLID

### S — Single Responsibility Principle

Cada clase, módulo o función tiene **una sola razón para cambiar**.

```typescript
// ❌ Hace demasiado: valida, persiste, notifica
class OrderService {
  createOrder(data: unknown) {
    // validar datos
    if (!data.items?.length) throw new Error('Empty');
    // calcular total
    const total = data.items.reduce((s, i) => s + i.price * i.qty, 0);
    // guardar en BD
    db.orders.insert({ ...data, total });
    // enviar email
    mailer.send(data.email, 'Orden creada', `Total: ${total}`);
  }
}

// ✅ Cada pieza tiene una responsabilidad
function calculateOrderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

async function createOrder(input: CreateOrderInput): Promise<Order> {
  const validated = orderSchema.parse(input);
  const total = calculateOrderTotal(validated.items);
  return db.order.create({ data: { ...validated, total } });
}

async function notifyOrderCreated(order: Order): Promise<void> {
  await mailer.send(order.email, 'Orden creada', `Total: ${order.total}`);
}
```

### O — Open/Closed Principle

Abierto para extensión, cerrado para modificación. Extender comportamiento sin tocar código existente.

```typescript
// ❌ Switch que crece con cada tipo nuevo
function calculateDiscount(type: string, amount: number) {
  switch (type) {
    case 'student': return amount * 0.2;
    case 'senior': return amount * 0.15;
    case 'employee': return amount * 0.3;
    // ¿Nuevo tipo? → modificar esta función
  }
}

// ✅ Estrategia extensible — agregar tipo sin tocar código existente
interface DiscountStrategy {
  calculate(amount: number): number;
}

const discountStrategies: Record<string, DiscountStrategy> = {
  student: { calculate: (amount) => amount * 0.2 },
  senior: { calculate: (amount) => amount * 0.15 },
  employee: { calculate: (amount) => amount * 0.3 },
};

function calculateDiscount(type: string, amount: number): number {
  const strategy = discountStrategies[type];
  if (!strategy) return 0;
  return strategy.calculate(amount);
}
```

### L — Liskov Substitution Principle

Subtipos deben ser sustituibles por sus tipos base sin romper el programa.

```typescript
// ❌ Rompe LSP: Square no se comporta como Rectangle
class Rectangle {
  constructor(public width: number, public height: number) {}
  area() { return this.width * this.height; }
}
class Square extends Rectangle {
  set width(v: number) { this.width = v; this.height = v; } // Efecto inesperado
}

// ✅ Usar composición o interfaces separadas
interface Shape {
  area(): number;
}

class Rectangle implements Shape {
  constructor(private width: number, private height: number) {}
  area() { return this.width * this.height; }
}

class Square implements Shape {
  constructor(private side: number) {}
  area() { return this.side * this.side; }
}
```

### I — Interface Segregation Principle

No forzar a implementar métodos que no se usan.

```typescript
// ❌ Interfaz gorda
interface Repository<T> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: T): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  bulkInsert(data: T[]): Promise<T[]>;
  aggregate(pipeline: unknown): Promise<unknown>;
}

// ✅ Interfaces segregadas — implementar solo lo necesario
interface Readable<T> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
}

interface Writable<T> {
  create(data: T): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

interface ProductRepository extends Readable<Product>, Writable<Product> {}
interface ReportRepository extends Readable<Report> {} // Solo lectura
```

### D — Dependency Inversion Principle

Depender de abstracciones, no de implementaciones concretas.

```typescript
// ❌ Dependencia directa a implementación concreta
class OrderService {
  private repository = new PostgresOrderRepository(); // Acoplado a Postgres
  private mailer = new SendGridMailer();               // Acoplado a SendGrid
}

// ✅ Inyección de dependencias vía constructor
class OrderService {
  constructor(
    private readonly repository: OrderRepository,  // Interfaz
    private readonly mailer: EmailSender,           // Interfaz
  ) {}

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const order = await this.repository.create(input);
    await this.mailer.send(order.email, 'Orden creada');
    return order;
  }
}

// En el composition root (punto de entrada):
const orderService = new OrderService(
  new PostgresOrderRepository(db),
  new SendGridMailer(apiKey),
);

// En tests:
const orderService = new OrderService(
  new InMemoryOrderRepository(),
  new FakeMailer(),
);
```

---

## 2. DRY — Don't Repeat Yourself

```typescript
// ❌ Lógica duplicada
function createUser(data: UserInput) {
  if (!data.email || !data.email.includes('@')) throw new Error('Invalid email');
  // ...
}
function updateUser(data: UserInput) {
  if (!data.email || !data.email.includes('@')) throw new Error('Invalid email');
  // ...
}

// ✅ Extraer a una sola fuente de verdad
const emailSchema = z.string().email('Email inválido');

function createUser(data: UserInput) {
  const email = emailSchema.parse(data.email);
  // ...
}
```

**Pero cuidado:** DRY no es "eliminar toda duplicación textual". Si dos fragmentos lucen iguales pero representan **conceptos diferentes** que evolucionarán de forma independiente, duplicarlos es correcto. Abstraer prematuramente acopla cosas que no deberían estarlo.

```
La regla de tres:
1era vez → escribirlo
2da vez  → notar la duplicación
3ra vez  → extraer abstracciones
```

---

## 3. KISS — Keep It Simple

```typescript
// ❌ Sobre-ingeniería para un caso simple
class StringValidator {
  private strategy: ValidationStrategy;
  constructor(strategyFactory: ValidatorFactory) {
    this.strategy = strategyFactory.create('string');
  }
  validate(input: unknown): boolean {
    return this.strategy.execute(input);
  }
}

// ✅ Simple y directo
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
```

---

## 4. YAGNI — You Aren't Gonna Need It

```typescript
// ❌ Construir para "el futuro" sin requisitos concretos
interface Repository<T> {
  find(query: ComplexQueryBuilder): Promise<T[]>;  // Solo necesitas findById hoy
  findWithJoins(joins: JoinSpec[]): Promise<T[]>;  // Nadie lo pidió
  cache(ttl: number): this;                         // Tal vez algún día
}

// ✅ Implementar lo que se necesita HOY
interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  findByCategory(category: string): Promise<Product[]>;
}
// Cuando necesites más, lo agregas then — no antes.
```

---

## 5. Funciones Atómicas

Cada función hace **una sola cosa**, tiene un **nombre que describe qué hace**, es **corta** (idealmente < 20 líneas) y opera en **un solo nivel de abstracción**.

```typescript
// ❌ Función larga con múltiples niveles de abstracción
async function processOrder(input: RawOrderInput) {
  // validar
  if (!input.items) throw new Error('No items');
  if (input.items.some(i => i.price < 0)) throw new Error('Invalid price');
  const email = input.email?.trim().toLowerCase();
  if (!email || !email.includes('@')) throw new Error('Bad email');
  // calcular
  let subtotal = 0;
  for (const item of input.items) {
    subtotal += item.price * item.quantity;
  }
  const tax = subtotal * 0.16;
  const total = subtotal + tax;
  // guardar
  const order = await db.order.create({ data: { email, subtotal, tax, total } });
  for (const item of input.items) {
    await db.orderItem.create({ data: { orderId: order.id, ...item } });
  }
  // notificar
  await fetch('https://api.mailer.com/send', {
    method: 'POST',
    body: JSON.stringify({ to: email, subject: 'Orden', body: `Total: ${total}` }),
  });
  return order;
}

// ✅ Funciones atómicas — cada una hace una cosa
async function processOrder(input: RawOrderInput): Promise<Order> {
  const validated = validateOrderInput(input);
  const totals = calculateTotals(validated.items);
  const order = await persistOrder(validated, totals);
  await notifyOrderCreated(order);
  return order;
}

function validateOrderInput(input: RawOrderInput): ValidatedOrderInput {
  return orderSchema.parse(input);
}

function calculateTotals(items: OrderItem[]): OrderTotals {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = subtotal * 0.16;
  return { subtotal, tax, total: subtotal + tax };
}
```

**Regla del periódico:** la función de alto nivel se lee como un titular; las funciones que llama son los detalles.

---

## 6. Guard Clauses — Early Returns

Evitar nesting profundo. Validar y salir temprano.

```typescript
// ❌ Nesting excesivo
function processPayment(order: Order | null, user: User | null) {
  if (order) {
    if (user) {
      if (order.status === 'pending') {
        if (user.balance >= order.total) {
          // ... lógica principal enterrada en 4 niveles
        } else {
          throw new Error('Insufficient balance');
        }
      } else {
        throw new Error('Order not pending');
      }
    } else {
      throw new Error('User not found');
    }
  } else {
    throw new Error('Order not found');
  }
}

// ✅ Guard clauses — flat y legible
function processPayment(order: Order | null, user: User | null) {
  if (!order) throw new Error('Order not found');
  if (!user) throw new Error('User not found');
  if (order.status !== 'pending') throw new Error('Order not pending');
  if (user.balance < order.total) throw new Error('Insufficient balance');

  // Lógica principal sin nesting
  // ...
}
```

---

## 7. Encapsulación y Exposición

Exponer solo lo que el consumidor necesita. Ocultar detalles de implementación.

```typescript
// ❌ Todo público — el consumidor puede romper invariantes
class ShoppingCart {
  public items: CartItem[] = [];
  public total: number = 0;
}
// cart.items.push(item);  ← No recalcula total
// cart.total = -100;      ← Estado inválido

// ✅ API pública mínima — internals protegidos
class ShoppingCart {
  private items: CartItem[] = [];

  addItem(product: Product, quantity: number): void {
    const existing = this.items.find((i) => i.productId === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.items.push({ productId: product.id, price: product.price, quantity });
    }
  }

  removeItem(productId: string): void {
    this.items = this.items.filter((i) => i.productId !== productId);
  }

  get total(): number {
    return this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  get itemCount(): number {
    return this.items.reduce((sum, i) => sum + i.quantity, 0);
  }

  getItems(): ReadonlyArray<CartItem> {
    return this.items; // Exposición de solo lectura
  }
}
```

En módulos/funciones (no solo clases):

```typescript
// cart.ts — Exportar solo la API pública
export function createCart(): Cart { /* ... */ }
export function addItem(cart: Cart, item: CartItem): Cart { /* ... */ }
export function getTotal(cart: Cart): number { /* ... */ }

// Helpers internos — NO exportar
function recalculateTotals(cart: Cart): Cart { /* ... */ }
function findItem(cart: Cart, productId: string): CartItem | undefined { /* ... */ }
```

---

## 8. Composición sobre Herencia

```typescript
// ❌ Herencia profunda — rígida, frágil
class Animal { move() {} }
class Bird extends Animal { fly() {} }
class Penguin extends Bird { fly() { throw new Error('Cannot fly'); } } // Viola LSP

// ✅ Composición — flexible, combinable
interface Movable { move(): void; }
interface Swimmable { swim(): void; }
interface Flyable { fly(): void; }

function createPenguin(): Movable & Swimmable {
  return {
    move: () => { /* waddle */ },
    swim: () => { /* swim */ },
  };
}

// En React: composición es el patrón por defecto
// Hooks = composición de comportamiento
// Children/slots = composición de UI
```

---

## 9. Inmutabilidad por Defecto

```typescript
// ✅ const siempre, let solo cuando sea necesario, var NUNCA
const user = { name: 'Ana', age: 30 };

// ✅ No mutar — crear nueva referencia
const updatedUser = { ...user, age: 31 };

// ✅ Arrays: métodos que retornan nuevo array
const withNewItem = [...items, newItem];
const without = items.filter((i) => i.id !== targetId);
const mapped = items.map((i) => (i.id === targetId ? { ...i, done: true } : i));

// ❌ Mutaciones
user.age = 31;           // Muta el original
items.push(newItem);     // Muta el array
items.splice(index, 1);  // Muta el array
items.sort();            // Muta el array — usar toSorted()

// ✅ Readonly para contratos
function processItems(items: ReadonlyArray<Item>): Result {
  // TypeScript previene .push(), .splice(), etc.
}

interface Config {
  readonly apiUrl: string;
  readonly maxRetries: number;
}
```

---

## 10. Naming Expresivo — El Código se Auto-documenta

El nombre de una variable, función o clase debe hacer innecesario un comentario.

```typescript
// ❌ Nombres crípticos + comentario compensatorio
const d = 86400; // Seconds in a day
function proc(u: any, f: boolean) { /* ... */ }

// ✅ Nombres que se explican solos
const SECONDS_IN_A_DAY = 86400;
function deactivateUser(user: User, notifyByEmail: boolean) { /* ... */ }

// ✅ Booleans con prefijo is/has/should/can
const isActive = true;
const hasPermission = user.roles.includes('admin');
const shouldRetry = attempt < MAX_RETRIES;
const canEdit = isOwner && !isLocked;

// ✅ Funciones: verbo + sustantivo
function fetchUserProfile(userId: string) {}
function calculateShippingCost(weight: number, destination: Address) {}
function formatCurrency(amount: number, locale: string) {}

// ✅ Evitar abreviaciones (excepto convenciones universales: i, j, e, _)
function getUsrPrf() {}    // ❌
function getUserProfile() {} // ✅
```

---

## 11. Documentación In-Code (JSDoc)

### Filosofía

> **Documentar el POR QUÉ y el QUÉ del negocio, no el CÓMO técnico.**
> Si una función necesita un comentario explicando cómo funciona, es demasiado compleja — refactorizarla.

### Cuándo SÍ documentar (JSDoc)

```typescript
/**
 * Calcula el costo de envío según peso y zona de destino.
 * Zona 1–3: tarifa estándar. Zona 4+: recargo por distancia.
 */
function calculateShippingCost(weight: number, zone: number): number {
  const baseCost = weight * COST_PER_KG;
  if (zone <= 3) return baseCost;
  return baseCost * (1 + DISTANCE_SURCHARGE * (zone - 3));
}

/** Días de gracia antes de suspender una cuenta impaga. */
const GRACE_PERIOD_DAYS = 15;

/**
 * Determina si un usuario califica para crédito fiscal.
 * Regla de negocio: ingresos anuales < $50,000 y sin deudas activas.
 */
function qualifiesForTaxCredit(user: User): boolean {
  return user.annualIncome < 50_000 && user.activeDebts === 0;
}
```

### Cuándo SÍ documentar — Interfaces y tipos públicos

```typescript
/** Evento emitido al completar un pago exitoso. */
interface PaymentCompletedEvent {
  /** Identificador único de la transacción. */
  transactionId: string;
  /** Monto cobrado en centavos (evita errores de punto flotante). */
  amountInCents: number;
  /** ISO 4217 currency code (e.g., "USD", "MXN"). */
  currency: string;
}

/** Resultado de la evaluación de riesgo crediticio. */
type RiskLevel = 'low' | 'medium' | 'high' | 'rejected';
```

### Cuándo NO documentar

```typescript
// ❌ Comentario que repite lo que el código ya dice
/** Returns the user name. */
function getUserName(user: User): string {
  return user.name;
}

// ❌ Comentario inline por cada línea
function calculateTotal(items: CartItem[]) {
  // Get the subtotal by reducing items ← INNECESARIO
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  // Calculate tax ← INNECESARIO
  const tax = subtotal * TAX_RATE;
  // Return the total ← INNECESARIO
  return subtotal + tax;
}

// ✅ El código limpio no necesita comentarios inline
function calculateTotal(items: CartItem[]) {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = subtotal * TAX_RATE;
  return subtotal + tax;
}

// ❌ Comentarios de "sección" — extraer a funciones
function processOrder(order: Order) {
  // --- Validate order --- ← Extraer a validateOrder()
  // ... 15 lines ...
  // --- Calculate totals --- ← Extraer a calculateTotals()
  // ... 10 lines ...
  // --- Save to DB --- ← Extraer a persistOrder()
  // ... 8 lines ...
}
```

### Reglas de documentación

| Regla | Detalle |
|-------|---------|
| **JSDoc en interfaces y tipos públicos** | Describir significado de negocio, no estructura técnica |
| **JSDoc en funciones no obvias** | Reglas de negocio, algoritmos, edge cases |
| **JSDoc en constantes de negocio** | Por qué ese valor, no qué es |
| **NO inline comments** | Si necesitas explicar una línea, el código es confuso |
| **NO comentarios TODO en main** | Crear issue en el tracker, no en el código |
| **NO código comentado** | Git es tu historial, borra sin miedo |
| **Máximo 1-2 líneas de JSDoc** | Si necesitas más, la función es muy compleja |

---

## 12. Separación de Concerns

```typescript
// ❌ UI + lógica de negocio + fetch mezclados en un componente
function ProductPage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        // Lógica de negocio en el componente
        const filtered = data.filter((p) => p.stock > 0 && p.price < budget);
        const sorted = filtered.sort((a, b) => b.rating - a.rating);
        setProducts(sorted);
      });
  }, []);

  return products.map((p) => <div>{p.name} - ${p.price}</div>);
}

// ✅ Cada capa con su responsabilidad
// Capa de datos (fetch)
function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => fetchProducts(filters),
  });
}

// Capa de negocio (lógica pura)
function filterAvailableProducts(products: Product[], budget: number): Product[] {
  return products
    .filter((p) => p.stock > 0 && p.price <= budget)
    .sort((a, b) => b.rating - a.rating);
}

// Capa de presentación (solo renderizar)
function ProductPage() {
  const { data: products } = useProducts(filters);
  const available = filterAvailableProducts(products ?? [], budget);
  return <ProductGrid products={available} />;
}
```

---

## 13. Manejo de Errores en Boundaries

Validar inputs en los bordes del sistema — no en cada función interna.

```typescript
// ❌ Validación defensiva en cada capa
function calculateTax(amount: number) {
  if (typeof amount !== 'number') throw new Error('Invalid');  // ❌ Ya validado arriba
  if (amount < 0) throw new Error('Negative');                  // ❌ Ya validado arriba
  return amount * TAX_RATE;
}

// ✅ Validar en el borde (API handler, form submit, etc.)
// Internamente, confiar en los tipos
async function handleCreateOrder(request: Request) {
  // === BOUNDARY: validar aquí ===
  const body = await request.json();
  const input = orderSchema.parse(body);  // Zod valida + tipa

  // === INTERNO: confiar en tipos ===
  const totals = calculateTotals(input.items);  // input.items es OrderItem[]
  const order = await persistOrder(input, totals);
  return Response.json(order);
}
```

---

## 14. Pure Functions

Preferir funciones puras: mismo input → mismo output, sin efectos secundarios.

```typescript
// ❌ Impura: depende y modifica estado externo
let globalDiscount = 0.1;
function applyDiscount(price: number) {
  return price * (1 - globalDiscount);  // Depende de variable global
}

// ✅ Pura: todo lo que necesita viene por parámetro
function applyDiscount(price: number, discountRate: number): number {
  return price * (1 - discountRate);
}

// ✅ Si necesitas side effects, aislarlos en capas específicas:
// Capa pura:  calculateTotal, formatCurrency, validateInput
// Capa impura: saveToDatabase, sendEmail, logEvent
```

---

## Checklist Pre-Commit Mental

Antes de hacer commit, preguntarse:

- [ ] ¿Cada función hace **una sola cosa**?
- [ ] ¿Los nombres describen la intención sin necesidad de comentarios?
- [ ] ¿Hay duplicación que debería extraerse?
- [ ] ¿Estoy construyendo solo lo que se necesita **hoy**?
- [ ] ¿Las dependencias se inyectan, no se instancian internamente?
- [ ] ¿Los datos público son de solo lectura donde sea posible?
- [ ] ¿La documentación describe el **negocio**, no la mecánica?
- [ ] ¿Hay comentarios inline que sobran?
- [ ] ¿Puedo leer la función de alto nivel como un resumen ejecutivo?

---

## Anti-patrones Universales

```typescript
// ❌ any — usar unknown + type guards
// ❌ Funciones de > 30 líneas — dividir
// ❌ Más de 3 parámetros — usar objeto de opciones
// ❌ Nested ternaries — usar early returns o variables con nombre
// ❌ Magic numbers — extraer a constantes con nombre de negocio
// ❌ God class / God function — violan SRP
// ❌ Herencia profunda (> 2 niveles) — usar composición
// ❌ Comentarios tipo "// TODO: fix later" en main
// ❌ Código comentado — eliminarlo (Git es tu historial)
// ❌ Defensive programming en capas internas — validar en boundaries
// ❌ Premature abstraction — abstraer en la 3ra repetición, no la 1ra
// ❌ Importar módulos enteros por una función — import { pick } from 'lodash-es'
```
