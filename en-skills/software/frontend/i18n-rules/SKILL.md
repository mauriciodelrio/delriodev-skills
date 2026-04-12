---
name: i18n-rules
description: >
  Internationalization rules for React/Next.js applications. Covers next-intl,
  react-i18next, ICU MessageFormat, pluralization, date/number/currency formatting,
  locale detection, RTL support, and translation file organization.
---

# 🌍 Internationalization (i18n)

## Guiding Principle

> **i18n from day 1.** Never hardcode user-visible strings.
> All text MUST go through the translation system, even if there's only one language today.

---

## 1. Setup with next-intl (Recommended for Next.js)

```
messages/
├── es.json           # Español (default)
├── en.json           # English
├── pt.json           # Português
└── index.ts          # Typed re-export
```

```json
// messages/es.json
{
  "common": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "loading": "Cargando...",
    "error": "Ha ocurrido un error"
  },
  "auth": {
    "login": "Iniciar sesión",
    "logout": "Cerrar sesión",
    "welcome": "Hola, {name}"
  },
  "products": {
    "title": "Productos",
    "count": "{count, plural, =0 {Sin productos} one {# producto} other {# productos}}",
    "price": "Precio: {price, number, ::currency/USD}",
    "addedDate": "Agregado {date, date, medium}"
  }
}
```

```tsx
// i18n/request.ts — next-intl configuration
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

// i18n/routing.ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['es', 'en', 'pt'],
  defaultLocale: 'es',
  localePrefix: 'as-needed', // Only prefix for non-default: /en/products
});
```

---

## 2. Usage in Components

```tsx
// ✅ Server Component — useTranslations
import { useTranslations } from 'next-intl';

export default function ProductsPage() {
  const t = useTranslations('products');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('count', { count: products.length })}</p>
    </div>
  );
}

// ✅ Client Component — same syntax
'use client';
import { useTranslations } from 'next-intl';

export function AddToCartButton() {
  const t = useTranslations('common');
  return <Button>{t('save')}</Button>;
}

// ✅ Server-side (outside components): API routes, Server Actions
import { getTranslations } from 'next-intl/server';

export async function createProduct(formData: FormData) {
  const t = await getTranslations('products');
  // Use t() in validations, error messages, etc.
}
```

---

## 3. ICU MessageFormat — Plurals and Interpolation

```json
{
  "notifications": {
    "unread": "{count, plural, =0 {You have no notifications} one {You have # unread notification} other {You have # unread notifications}}",

    "lastSeen": "{gender, select, male {Last seen} female {Last seen} other {Last connection}}: {date, date, medium}",

    "fileSize": "Size: {size, number, ::compact-short} bytes"
  }
}
```

```tsx
// Usage
t('notifications.unread', { count: 0 });   // "You have no notifications"
t('notifications.unread', { count: 1 });   // "You have 1 unread notification"
t('notifications.unread', { count: 5 });   // "You have 5 unread notifications"
```

---

## 4. Date, Number, and Currency Formatting

```tsx
import { useFormatter } from 'next-intl';

export function ProductPrice({ price, date }: { price: number; date: Date }) {
  const format = useFormatter();

  return (
    <div>
      {/* Currency — adapts to locale */}
      <p>{format.number(price, { style: 'currency', currency: 'USD' })}</p>
      {/* es: US$1.234,56 | en: $1,234.56 */}

      {/* Relative date */}
      <p>{format.relativeTime(date)}</p>
      {/* es: "hace 3 días" | en: "3 days ago" */}

      {/* Formatted date */}
      <p>{format.dateTime(date, { dateStyle: 'long' })}</p>
      {/* es: "11 de abril de 2026" | en: "April 11, 2026" */}

      {/* Lists */}
      <p>{format.list(['React', 'Next.js', 'TypeScript'], { type: 'conjunction' })}</p>
      {/* es: "React, Next.js y TypeScript" | en: "React, Next.js, and TypeScript" */}
    </div>
  );
}
```

---

## 5. Translation File Organization

```
// ✅ For large projects: split by feature
messages/
├── es/
│   ├── common.json       # Shared texts
│   ├── auth.json         # Login, register, password
│   ├── products.json     # Catalog, prices
│   ├── checkout.json     # Cart, payment
│   └── errors.json       # Error messages
├── en/
│   └── ...

// ✅ Merge in config
import deepmerge from 'deepmerge';

const messages = deepmerge.all([
  await import(`./messages/${locale}/common.json`),
  await import(`./messages/${locale}/auth.json`),
  await import(`./messages/${locale}/products.json`),
]);
```

---

## 6. RTL (Right-to-Left) Support

```tsx
// app/[locale]/layout.tsx
import { getLocale } from 'next-intl/server';

const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

export default async function LocaleLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body>{children}</body>
    </html>
  );
}

// ✅ Tailwind RTL utilities
<div className="ml-4 rtl:mr-4 rtl:ml-0">  {/* Right margin in RTL */}
<div className="text-left rtl:text-right">  {/* Adapted alignment */}

// ✅ Better: use logical properties (no rtl: prefix needed)
<div className="ms-4">          {/* margin-inline-start */}
<div className="ps-4">          {/* padding-inline-start */}
<div className="text-start">    {/* Automatically adapts */}
```

---

## 7. Locale Detection

```tsx
// middleware.ts — detection and redirect
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/', '/(es|en|pt)/:path*'],
};

// Detection priority order:
// 1. URL prefix (/en/products)
// 2. Cookie (NEXT_LOCALE)
// 3. Accept-Language header
// 4. Default locale
```

---

## Mandatory Rules

1. **NEVER** hardcode user-visible strings in components
2. **ALWAYS** use ICU MessageFormat for plurals (no manual ternaries)
3. **ALWAYS** format dates/numbers with the i18n formatter (not `toLocaleDateString`)
4. **NEVER** concatenate strings to form sentences (`t('hello') + name`) — use interpolation
5. **ALWAYS** provide context for translators with comments in the JSON
6. **Keys MUST** be descriptive: `products.emptyState` not `msg_42`
7. Use **logical CSS properties** (`ms-`, `me-`, `ps-`, `pe-`) over `ml-`/`mr-`

---

## Anti-patterns

```tsx
// ❌ Hardcoded strings
<button>Save</button>                        // ❌
<button>{t('common.save')}</button>          // ✅

// ❌ Ternaries for plurals
{count === 1 ? 'product' : 'products'}       // ❌ Doesn't work in languages with >2 plural forms
{t('products.count', { count })}             // ✅

// ❌ Concatenating translated strings
t('greeting') + ' ' + name                   // ❌ Word order varies by language
t('greeting', { name })                      // ✅

// ❌ Dates with toLocaleDateString
new Date().toLocaleDateString('es')          // ❌ Inconsistent
format.dateTime(date, { dateStyle: 'long' }) // ✅

// ❌ Numeric or cryptic keys
{ "msg_1": "Hello", "msg_2": "Goodbye" }    // ❌ Impossible to maintain
```

---

## Related Skills

> **Consult the master index [`frontend/SKILL.md`](../SKILL.md) → "Mandatory Skills by Action"** for the full chain.

| Skill | Why |
|-------|-----|
| `a11y-rules` | `lang` attribute, translations of aria-labels, RTL layout |
| `forms-and-validation-rules` | Translated error messages, i18n labels |
| `error-handling-rules` | Translated error messages and toasts |
| `seo-rules` | hreflang, canonical URLs per locale |
