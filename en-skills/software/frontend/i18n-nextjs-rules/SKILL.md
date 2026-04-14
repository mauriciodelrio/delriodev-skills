---
name: i18n-nextjs-rules
description: >
  Use this skill when implementing internationalization in a Next.js
  App Router project: next-intl, useTranslations, getTranslations, ICU MessageFormat,
  useFormatter, locale detection via middleware, RTL support with app/[locale]/layout.
---

# Internationalization (i18n) — Next.js App Router

## Mandatory cross-references

| Skill | When to activate |
|-------|-----------------|
| [`i18n-react-rules`](../i18n-react-rules/SKILL.md) | If the project is a Vite SPA (detect `vite.config.*` without `next.config.*`). Do not use this skill in that case. |
| [`a11y-rules`](../a11y-rules/SKILL.md) | Always — `lang` attribute, `aria-label` translations, accessible RTL layout. |
| [`forms-and-validation-rules`](../forms-and-validation-rules/SKILL.md) | When the form needs translated error messages and i18n labels. |
| [`seo-rules`](../seo-rules/SKILL.md) | Always — hreflang, canonical URLs per locale. |

## Agent workflow

1. Configure next-intl with routing and message files (section 1).
2. Use `useTranslations` in Server/Client Components, `getTranslations` in Server Actions (section 2).
3. ICU MessageFormat for plurals and gender select (section 3).
4. `useFormatter` for dates, numbers, currency, and lists (section 4).
5. Split translations by feature in large projects (section 5).
6. Logical CSS properties (`ms-`, `ps-`, `text-start`) for RTL support (section 6).
7. Middleware for locale detection: URL → Cookie → Accept-Language → default (section 7).

## 1. Setup with next-intl

```
messages/
├── en.json           # English (default)
├── es.json           # Español
├── pt.json           # Português
└── index.ts          # Typed re-export
```

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "loading": "Loading...",
    "error": "An error occurred"
  },
  "auth": {
    "login": "Sign in",
    "logout": "Sign out",
    "welcome": "Hello, {name}"
  },
  "products": {
    "title": "Products",
    "count": "{count, plural, =0 {No products} one {# product} other {# products}}",
    "price": "Price: {price, number, ::currency/USD}",
    "addedDate": "Added {date, date, medium}"
  }
}
```

```tsx
// i18n/request.ts
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
  locales: ['en', 'es', 'pt'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
});
```

## 2. Usage in Components

```tsx
// Server Component
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

// Client Component
'use client';
import { useTranslations } from 'next-intl';

export function AddToCartButton() {
  const t = useTranslations('common');
  return <Button>{t('save')}</Button>;
}

// Server Action
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

    "lastSeen": "{gender, select, male {Last seen} female {Last seen} other {Last connected}}: {date, date, medium}",

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
├── en/
│   ├── common.json       # Shared texts
│   ├── auth.json         # Login, register, password
│   ├── products.json     # Catalog, prices
│   ├── checkout.json     # Cart, payment
│   └── errors.json       # Error messages
├── es/
│   └── ...
```

```tsx
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
```

```tsx
// Tailwind RTL utilities (functional but verbose)
<div className="ml-4 rtl:mr-4 rtl:ml-0">
<div className="text-left rtl:text-right">

// Prefer logical properties — they adapt automatically to RTL
<div className="ms-4">
<div className="ps-4">
<div className="text-start">
```

## 7. Locale Detection — Middleware

```tsx
// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/', '/(en|es|pt)/:path*'],
};
```

Detection order: URL path → Cookie → Accept-Language header → defaultLocale.

## Gotchas

- Hardcoded strings in components break i18n — all visible text must go through `t()`.
- Ternaries for plurals (`count === 1 ? 'product' : 'products'`) fail in languages with >2 plural forms — use ICU MessageFormat.
- Concatenating translations (`t('greeting') + ' ' + name`) fails because word order varies by language — use interpolation `t('greeting', { name })`.
- `toLocaleDateString` is inconsistent across environments — use `useFormatter` from next-intl.
- Cryptic keys (`msg_42`) are impossible to maintain — use descriptive keys (`products.emptyState`).
- `ml-`/`mr-` don't adapt to RTL — use logical properties (`ms-`, `me-`, `ps-`, `pe-`).
- Form without `noValidate` mixes native validation with custom — always add `noValidate`.

## Related Skills

- [`a11y-rules`](../a11y-rules/SKILL.md) — `lang` attribute, aria-label translations, RTL layout
- [`forms-and-validation-rules`](../forms-and-validation-rules/SKILL.md) — translated error messages, i18n labels
- [`seo-rules`](../seo-rules/SKILL.md) — hreflang, canonical URLs per locale
- [`i18n-react-rules`](../i18n-react-rules/SKILL.md) — Vite SPA version with react-i18next
