---
name: clean-code-principles
description: >
  Use this skill on ALL code generation. Apply SOLID, DRY, KISS, YAGNI,
  atomic functions, guard clauses, composition, immutability, encapsulation,
  expressive naming, business JSDoc documentation, boundary validation and
  separation of concerns. This skill is the mandatory core that precedes
  any other software skill.
---

# Clean Code Principles

## Agent workflow

1. Apply ALL principles in this skill to every generated code block
2. Use the ✅ patterns from each section as mandatory style reference
3. Default to atomic functions, guard clauses and composition
4. Validate against the Gotchas section before delivering code

---

## 1. SOLID

### S — Single Responsibility Principle

```typescript
// ❌ Does too much: validates, persists, notifies
class OrderService {
  createOrder(data: unknown) {
    // validate data
    if (!data.items?.length) throw new Error('Empty');
    // calculate total
    const total = data.items.reduce((s, i) => s + i.price * i.qty, 0);
    // save to DB
    db.orders.insert({ ...data, total });
    // send email
    mailer.send(data.email, 'Order created', `Total: ${total}`);
  }
}

// ✅ Each piece has one responsibility
function calculateOrderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

async function createOrder(input: CreateOrderInput): Promise<Order> {
  const validated = orderSchema.parse(input);
  const total = calculateOrderTotal(validated.items);
  return db.order.create({ data: { ...validated, total } });
}

async function notifyOrderCreated(order: Order): Promise<void> {
  await mailer.send(order.email, 'Order created', `Total: ${order.total}`);
}
```

### O — Open/Closed Principle

```typescript
// ❌ Switch that grows with each new type
function calculateDiscount(type: string, amount: number) {
  switch (type) {
    case 'student': return amount * 0.2;
    case 'senior': return amount * 0.15;
    case 'employee': return amount * 0.3;
    // New type? → modify this function
  }
}

// ✅ Extensible strategy — add type without touching existing code
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

```typescript
// ❌ Violates LSP: Square doesn't behave like Rectangle
class Rectangle {
  constructor(public width: number, public height: number) {}
  area() { return this.width * this.height; }
}
class Square extends Rectangle {
  set width(v: number) { this.width = v; this.height = v; } // Unexpected side effect
}

// ✅ Use composition or separate interfaces
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

```typescript
// ❌ Fat interface
interface Repository<T> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: T): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  bulkInsert(data: T[]): Promise<T[]>;
  aggregate(pipeline: unknown): Promise<unknown>;
}

// ✅ Segregated interfaces — implement only what's needed
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
interface ReportRepository extends Readable<Report> {} // Read-only
```

### D — Dependency Inversion Principle

```typescript
// ❌ Direct dependency on concrete implementation
class OrderService {
  private repository = new PostgresOrderRepository(); // Coupled to Postgres
  private mailer = new SendGridMailer();               // Coupled to SendGrid
}

// ✅ Dependency injection via constructor
class OrderService {
  constructor(
    private readonly repository: OrderRepository,  // Interface
    private readonly mailer: EmailSender,           // Interface
  ) {}

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const order = await this.repository.create(input);
    await this.mailer.send(order.email, 'Order created');
    return order;
  }
}

// At the composition root (entry point):
const orderService = new OrderService(
  new PostgresOrderRepository(db),
  new SendGridMailer(apiKey),
);

// In tests:
const orderService = new OrderService(
  new InMemoryOrderRepository(),
  new FakeMailer(),
);
```

---

## 2. DRY — Don't Repeat Yourself

```typescript
// ❌ Duplicated logic
function createUser(data: UserInput) {
  if (!data.email || !data.email.includes('@')) throw new Error('Invalid email');
  // ...
}
function updateUser(data: UserInput) {
  if (!data.email || !data.email.includes('@')) throw new Error('Invalid email');
  // ...
}

// ✅ Extract to a single source of truth
const emailSchema = z.string().email('Invalid email');

function createUser(data: UserInput) {
  const email = emailSchema.parse(data.email);
  // ...
}
```

**But be careful:** DRY is not "eliminate all textual duplication". If two fragments look the same but represent **different concepts** that will evolve independently, duplicating them is correct. Premature abstraction couples things that shouldn't be coupled.

```
The rule of three:
1st time → write it
2nd time → note the duplication
3rd time → extract abstractions
```

---

## 3. KISS — Keep It Simple

```typescript
// ❌ Over-engineering for a simple case
class StringValidator {
  private strategy: ValidationStrategy;
  constructor(strategyFactory: ValidatorFactory) {
    this.strategy = strategyFactory.create('string');
  }
  validate(input: unknown): boolean {
    return this.strategy.execute(input);
  }
}

// ✅ Simple and direct
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
```

---

## 4. YAGNI — You Aren't Gonna Need It

```typescript
// ❌ Building for "the future" without concrete requirements
interface Repository<T> {
  find(query: ComplexQueryBuilder): Promise<T[]>;  // You only need findById today
  findWithJoins(joins: JoinSpec[]): Promise<T[]>;  // Nobody asked for this
  cache(ttl: number): this;                         // Maybe someday
}

// ✅ Implement what's needed TODAY
interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  findByCategory(category: string): Promise<Product[]>;
}
// When you need more, add it then — not before.
```

---

## 5. Atomic Functions

```typescript
// ❌ Long function with multiple levels of abstraction
async function processOrder(input: RawOrderInput) {
  // validate
  if (!input.items) throw new Error('No items');
  if (input.items.some(i => i.price < 0)) throw new Error('Invalid price');
  const email = input.email?.trim().toLowerCase();
  if (!email || !email.includes('@')) throw new Error('Bad email');
  // calculate
  let subtotal = 0;
  for (const item of input.items) {
    subtotal += item.price * item.quantity;
  }
  const tax = subtotal * 0.16;
  const total = subtotal + tax;
  // save
  const order = await db.order.create({ data: { email, subtotal, tax, total } });
  for (const item of input.items) {
    await db.orderItem.create({ data: { orderId: order.id, ...item } });
  }
  // notify
  await fetch('https://api.mailer.com/send', {
    method: 'POST',
    body: JSON.stringify({ to: email, subject: 'Order', body: `Total: ${total}` }),
  });
  return order;
}

// ✅ Atomic functions — each one does one thing
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

**Newspaper rule:** the high-level function reads like a headline; the functions it calls are the details.

---

## 6. Guard Clauses — Early Returns

```typescript
// ❌ Excessive nesting
function processPayment(order: Order | null, user: User | null) {
  if (order) {
    if (user) {
      if (order.status === 'pending') {
        if (user.balance >= order.total) {
          // ... main logic buried at 4 levels deep
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

// ✅ Guard clauses — flat and readable
function processPayment(order: Order | null, user: User | null) {
  if (!order) throw new Error('Order not found');
  if (!user) throw new Error('User not found');
  if (order.status !== 'pending') throw new Error('Order not pending');
  if (user.balance < order.total) throw new Error('Insufficient balance');

  // Main logic without nesting
  // ...
}
```

---

## 7. Encapsulation and Exposure

```typescript
// ❌ Everything public — consumer can break invariants
class ShoppingCart {
  public items: CartItem[] = [];
  public total: number = 0;
}
// cart.items.push(item);  ← Doesn't recalculate total
// cart.total = -100;      ← Invalid state

// ✅ Minimal public API — internals protected
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
    return this.items; // Read-only exposure
  }
}
```

In modules/functions (not just classes):

```typescript
// cart.ts — Export only the public API
export function createCart(): Cart { /* ... */ }
export function addItem(cart: Cart, item: CartItem): Cart { /* ... */ }
export function getTotal(cart: Cart): number { /* ... */ }

// Internal helpers — DO NOT export
function recalculateTotals(cart: Cart): Cart { /* ... */ }
function findItem(cart: Cart, productId: string): CartItem | undefined { /* ... */ }
```

---

## 8. Composition over Inheritance

```typescript
// ❌ Deep inheritance — rigid, fragile
class Animal { move() {} }
class Bird extends Animal { fly() {} }
class Penguin extends Bird { fly() { throw new Error('Cannot fly'); } } // Violates LSP

// ✅ Composition — flexible, combinable
interface Movable { move(): void; }
interface Swimmable { swim(): void; }
interface Flyable { fly(): void; }

function createPenguin(): Movable & Swimmable {
  return {
    move: () => { /* waddle */ },
    swim: () => { /* swim */ },
  };
}

// In React: composition is the default pattern
// Hooks = behavior composition
// Children/slots = UI composition
```

---

## 9. Immutability by Default

```typescript
// ✅ Always const, let only when necessary, var NEVER
const user = { name: 'Ana', age: 30 };

// ✅ Don't mutate — create new reference
const updatedUser = { ...user, age: 31 };

// ✅ Arrays: methods that return a new array
const withNewItem = [...items, newItem];
const without = items.filter((i) => i.id !== targetId);
const mapped = items.map((i) => (i.id === targetId ? { ...i, done: true } : i));

// ❌ Mutations
user.age = 31;           // Mutates the original
items.push(newItem);     // Mutates the array
items.splice(index, 1);  // Mutates the array
items.sort();            // Mutates the array — use toSorted()

// ✅ Readonly for contracts
function processItems(items: ReadonlyArray<Item>): Result {
  // TypeScript prevents .push(), .splice(), etc.
}

interface Config {
  readonly apiUrl: string;
  readonly maxRetries: number;
}
```

---

## 10. Expressive Naming

```typescript
// ❌ Cryptic names + compensatory comment
const d = 86400; // Seconds in a day
function proc(u: any, f: boolean) { /* ... */ }

// ✅ Names that explain themselves
const SECONDS_IN_A_DAY = 86400;
function deactivateUser(user: User, notifyByEmail: boolean) { /* ... */ }

// ✅ Booleans with is/has/should/can prefix
const isActive = true;
const hasPermission = user.roles.includes('admin');
const shouldRetry = attempt < MAX_RETRIES;
const canEdit = isOwner && !isLocked;

// ✅ Functions: verb + noun
function fetchUserProfile(userId: string) {}
function calculateShippingCost(weight: number, destination: Address) {}
function formatCurrency(amount: number, locale: string) {}

// ✅ Avoid abbreviations (except universal conventions: i, j, e, _)
function getUsrPrf() {}    // ❌
function getUserProfile() {} // ✅
```

---

## 11. In-Code Documentation (JSDoc)

Document the WHY and the business WHAT, not the technical HOW. If you need to explain how it works, refactor.

### When TO document (JSDoc)

```typescript
/**
 * Calculates shipping cost based on weight and destination zone.
 * Zones 1–3: standard rate. Zone 4+: distance surcharge.
 */
function calculateShippingCost(weight: number, zone: number): number {
  const baseCost = weight * COST_PER_KG;
  if (zone <= 3) return baseCost;
  return baseCost * (1 + DISTANCE_SURCHARGE * (zone - 3));
}

/** Grace days before suspending an unpaid account. */
const GRACE_PERIOD_DAYS = 15;

/**
 * Determines if a user qualifies for a tax credit.
 * Business rule: annual income < $50,000 and no active debts.
 */
function qualifiesForTaxCredit(user: User): boolean {
  return user.annualIncome < 50_000 && user.activeDebts === 0;
}
```

### When TO document — Public interfaces and types

```typescript
/** Event emitted when a payment is successfully completed. */
interface PaymentCompletedEvent {
  /** Unique transaction identifier. */
  transactionId: string;
  /** Amount charged in cents (avoids floating-point errors). */
  amountInCents: number;
  /** ISO 4217 currency code (e.g., "USD", "MXN"). */
  currency: string;
}

/** Result of the credit risk assessment. */
type RiskLevel = 'low' | 'medium' | 'high' | 'rejected';
```

### When NOT to document

```typescript
// ❌ Comment that repeats what the code already says
/** Returns the user name. */
function getUserName(user: User): string {
  return user.name;
}

// ❌ Inline comment for every line
function calculateTotal(items: CartItem[]) {
  // Get the subtotal by reducing items ← UNNECESSARY
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  // Calculate tax ← UNNECESSARY
  const tax = subtotal * TAX_RATE;
  // Return the total ← UNNECESSARY
  return subtotal + tax;
}

// ✅ Clean code doesn't need inline comments
function calculateTotal(items: CartItem[]) {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = subtotal * TAX_RATE;
  return subtotal + tax;
}

// ❌ "Section" comments — extract to functions
function processOrder(order: Order) {
  // --- Validate order --- ← Extract to validateOrder()
  // ... 15 lines ...
  // --- Calculate totals --- ← Extract to calculateTotals()
  // ... 10 lines ...
  // --- Save to DB --- ← Extract to persistOrder()
  // ... 8 lines ...
}
```

### Documentation rules

| Rule | Detail |
|------|--------|
| **JSDoc on public interfaces and types** | Describe business meaning, not technical structure |
| **JSDoc on non-obvious functions** | Business rules, algorithms, edge cases |
| **JSDoc on business constants** | Why that value, not what it is |
| **NO inline comments** | If you need to explain a line, the code is confusing |
| **NO TODO comments on main** | Create an issue in the tracker, not in the code |
| **NO commented-out code** | Git is your history, delete without fear |
| **Maximum 1-2 lines of JSDoc** | If you need more, the function is too complex |

---

## 12. Separation of Concerns

```typescript
// ❌ UI + business logic + fetch mixed in a component
function ProductPage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        // Business logic in the component
        const filtered = data.filter((p) => p.stock > 0 && p.price < budget);
        const sorted = filtered.sort((a, b) => b.rating - a.rating);
        setProducts(sorted);
      });
  }, []);

  return products.map((p) => <div>{p.name} - ${p.price}</div>);
}

// ✅ Each layer with its own responsibility
// Data layer (fetch)
function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => fetchProducts(filters),
  });
}

// Business layer (pure logic)
function filterAvailableProducts(products: Product[], budget: number): Product[] {
  return products
    .filter((p) => p.stock > 0 && p.price <= budget)
    .sort((a, b) => b.rating - a.rating);
}

// Presentation layer (render only)
function ProductPage() {
  const { data: products } = useProducts(filters);
  const available = filterAvailableProducts(products ?? [], budget);
  return <ProductGrid products={available} />;
}
```

---

## 13. Error Handling at Boundaries

```typescript
// ❌ Defensive validation at every layer
function calculateTax(amount: number) {
  if (typeof amount !== 'number') throw new Error('Invalid');  // ❌ Already validated above
  if (amount < 0) throw new Error('Negative');                  // ❌ Already validated above
  return amount * TAX_RATE;
}

// ✅ Validate at the boundary (API handler, form submit, etc.)
// Internally, trust the types
async function handleCreateOrder(request: Request) {
  // === BOUNDARY: validate here ===
  const body = await request.json();
  const input = orderSchema.parse(body);  // Zod validates + types

  // === INTERNAL: trust types ===
  const totals = calculateTotals(input.items);  // input.items is OrderItem[]
  const order = await persistOrder(input, totals);
  return Response.json(order);
}
```

---

## 14. Pure Functions

Prefer pure functions: same input → same output, no side effects.

```typescript
// ❌ Impure: depends on and modifies external state
let globalDiscount = 0.1;
function applyDiscount(price: number) {
  return price * (1 - globalDiscount);  // Depends on global variable
}

// ✅ Pure: everything it needs comes via parameter
function applyDiscount(price: number, discountRate: number): number {
  return price * (1 - discountRate);
}

// ✅ If you need side effects, isolate them in specific layers:
// Pure layer:   calculateTotal, formatCurrency, validateInput
// Impure layer: saveToDatabase, sendEmail, logEvent
```

---

## Gotchas

- Never use `any` — always `unknown` + type guards. The agent must generate strict types.
- Functions > 30 lines indicate they should be split. More than 3 parameters → options object.
- Nested ternaries are unreadable — use early returns or descriptively named variables.
- Magic numbers must be constants with business names (`GRACE_PERIOD_DAYS`, not `15`).
- Never inherit > 2 levels deep — prefer composition.
- Never leave `// TODO` on main or commented-out code — Git is the history.
- No defensive validation in internal layers — only at boundaries (API handlers, form submits).
- Don't abstract prematurely — rule of three: abstract on the 3rd repetition, not the 1st.
- Import specific functions, not entire modules: `import { pick } from 'lodash-es'`.

---

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `frontend/testing-rules` | Well-written tests follow clean code (naming, AAA, builders) |
| `backend/testing` | Same principles in backend tests |
| `typescript-patterns` | Strict typing complements naming and encapsulation |
| `agent-workflow/iteration-rules` | Post-implementation checklist requires clean code |
