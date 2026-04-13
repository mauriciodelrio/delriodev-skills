---
name: i18n-rules
description: >
  Use this skill when implementing internationalization in React/Next.js:
  next-intl, ICU MessageFormat, pluralization, date/number/currency formatting,
  locale detection, RTL support, and translation file organization.
---

# Internationalization (i18n)

## Agent workflow

1. Configure next-intl with routing and message files (section 1).
2. Use `useTranslations` in Server/Client Components, `getTranslations` in Server Actions (section 2).
3. ICU MessageFormat for plurals and gender select (section 3).
4. `useFormatter` for dates, numbers, currency, and lists (section 4).
5. Split translations by feature in large projects (section 5).
6. Logical CSS properties (`ms-`, `ps-`, `text-start`) for RTL support (section 6).
7. Middleware for locale detection: URL → Cookie → Accept-Language → default (section 7).

## 1. Setup with next-intl (Recommended for Next.js)

```
messages/
├── es.json           # Español (default)
├── en.json           # English
├── pt.json           # Português
└── index.ts          # Typed re-export
```

```json
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
  localePrefix: 'as-needed',
});
```

## 2. Usage in Components

```tsx
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

'use client';
import { useTranslations } from 'next-intl';

export function AddToCartButton() {
  const t = useTranslations('common');
  return <Button>{t('save')}</Button>;
}

import { getTranslations } from 'next-intl/server';

export async function createProduct(formData: FormData) {
  const t = await getTranslations('products');
}
```

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
t('notifications.unread', { count: 0 });   // "You have no notifications"
t('notifications.unread', { count: 1 });   // "You have 1 unread notification"
t('notifications.unread', { count: 5 });   // "You have 5 unread notifications"
```

## 4. Date, Number, and Currency Formatting

```tsx
import { useFormatter } from 'next-intl';

export function ProductPrice({ price, date }: { price: number; date: Date }) {
  const format = useFormatter();

  return (
    <div>
      <p>{format.number(price, { style: 'currency', currency: 'USD' })}</p>
      <p>{format.relativeTime(date)}</p>
      <p>{format.dateTime(date, { dateStyle: 'long' })}</p>
      <p>{format.list(['React', 'Next.js', 'TypeScript'], { type: 'conjunction' })}</p>
    </div>
  );
}
```

## 5. Translation File Organization

```
messages/
├── es/
│   ├── common.json       # Shared texts
│   ├── auth.json         # Login, register, password
│   ├── products.json     # Catalog, prices
│   ├── checkout.json     # Cart, payment
│   └── errors.json       # Error messages
├── en/
│   └── ...

import deepmerge from 'deepmerge';

const messages = deepmerge.all([
  await import(`./messages/${locale}/common.json`),
  await import(`./messages/${locale}/auth.json`),
  await import(`./messages/${locale}/products.json`),
]);
```

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

// Tailwind RTL utilities (functional but verbose)
<div className="ml-4 rtl:mr-4 rtl:ml-0">
<div className="text-left rtl:text-right">

// Prefer logical properties
<div className="ms-4">
<div className="ps-4">
<div className="text-start">
```

## 7. Locale Detection

```tsx
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/', '/(es|en|pt)/:path*'],
};
```

## Gotchas

- Hardcoded strings in components break i18n — all visible text must go through `t()`.
- Ternaries for plurals (`count === 1 ? 'product' : 'products'`) fail in languages with >2 plural forms — use ICU MessageFormat.
- Concatenating translations (`t('greeting') + ' ' + name`) fails because word order varies by language — use interpolation `t('greeting', { name })`.
- `toLocaleDateString` is inconsistent across environments — use `useFormatter` from next-intl.
- Cryptic keys (`msg_42`) are impossible to maintain — use descriptive keys (`products.emptyState`).
- `ml-`/`mr-` don't adapt to RTL — use logical properties (`ms-`, `me-`, `ps-`, `pe-`).

## Related skills

- `a11y-rules` — `lang` attribute, aria-label translations, RTL layout
- `forms-and-validation-rules` — translated error messages, i18n labels
- `seo-rules` — hreflang, canonical URLs per locale
