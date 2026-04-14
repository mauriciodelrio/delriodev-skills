---
name: i18n-react-rules
description: >
  Use this skill when implementing internationalization in a Vite SPA
  with React: react-i18next + i18next, ICU MessageFormat, pluralization,
  date/number/currency formatting with Intl API, translation file
  organization, RTL support, and browser locale detection.
---

# Internationalization (i18n) — React / Vite SPA

## Mandatory cross-references

| Skill | When to activate |
|-------|-----------------|
| [`i18n-nextjs-rules`](../i18n-nextjs-rules/SKILL.md) | If the project is Next.js (detect `next.config.*`). Do not use this skill in that case. |
| [`a11y-rules`](../a11y-rules/SKILL.md) | Always — `lang` attribute, `aria-label` translations, accessible RTL layout. |
| [`forms-and-validation-rules`](../forms-and-validation-rules/SKILL.md) | When the form needs translated error messages and i18n labels. |

## Agent workflow

1. Install `react-i18next` + `i18next` + `i18next-browser-languagedetector` + `i18next-http-backend` (section 1).
2. Configure i18next with interpolation, language detection, and namespaces (section 1).
3. Use `useTranslation` in components (section 2).
4. ICU MessageFormat for plurals and gender select (section 3).
5. Date, number, and currency formatting with native `Intl` API (section 4).
6. Split translations by feature into namespaces (section 5).
7. Logical CSS properties (`ms-`, `ps-`, `text-start`) for RTL support (section 6).
8. Locale detection: browser → cookie → default (section 7).

## 1. Setup with react-i18next (Vite SPA)

```bash
pnpm add react-i18next i18next i18next-browser-languagedetector i18next-http-backend
```

```
public/
└── locales/
    ├── es/
    │   └── translation.json
    ├── en/
    │   └── translation.json
    └── pt/
        └── translation.json
```

```json
// public/locales/en/translation.json
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
    "welcome": "Hello, {{name}}"
  },
  "products": {
    "title": "Products",
    "count_one": "{{count}} product",
    "count_other": "{{count}} products",
    "count_zero": "No products",
    "price": "Price: {{price}}"
  }
}
```

```tsx
// src/app/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'pt'],
    interpolation: {
      escapeValue: false, // React escapes by default
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['navigator', 'cookie', 'htmlTag'],
      caches: ['cookie'],
    },
  });

export default i18n;
```

```tsx
// src/main.tsx
import './app/i18n'; // Import before render

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

## 2. Usage in Components

```tsx
import { useTranslation } from 'react-i18next';

export function ProductsPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('products.title')}</h1>
      <p>{t('products.count', { count: products.length })}</p>
    </div>
  );
}

// With specific namespace
export function AuthHeader() {
  const { t } = useTranslation('auth');
  return <h2>{t('welcome', { name: user.name })}</h2>;
}

// Change language
export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
    >
      <option value="en">English</option>
      <option value="es">Español</option>
      <option value="pt">Português</option>
    </select>
  );
}
```

## 3. ICU MessageFormat — Plurals and Interpolation

i18next uses its own format for plurals (`_one`, `_other`, `_zero` suffixes):

```json
{
  "notifications": {
    "unread_zero": "You have no notifications",
    "unread_one": "You have {{count}} unread notification",
    "unread_other": "You have {{count}} unread notifications"
  }
}
```

```tsx
t('notifications.unread', { count: 0 });   // "You have no notifications"
t('notifications.unread', { count: 1 });   // "You have 1 unread notification"
t('notifications.unread', { count: 5 });   // "You have 5 unread notifications"
```

For projects that need full ICU MessageFormat (gender select, etc.), add the plugin:

```bash
pnpm add i18next-icu intl-messageformat
```

```tsx
import ICU from 'i18next-icu';

i18n
  .use(ICU)
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({ /* ... */ });
```

With ICU enabled, JSONs use the standard format:

```json
{
  "notifications": {
    "unread": "{count, plural, =0 {You have no notifications} one {You have # unread notification} other {You have # unread notifications}}",
    "lastSeen": "{gender, select, male {Last seen} female {Last seen} other {Last connected}}: {date, date, medium}"
  }
}
```

## 4. Date, Number, and Currency Formatting

In Vite SPA, use the native browser `Intl` API (don't depend on next-intl):

```tsx
// shared/lib/formatters.ts
export function formatCurrency(amount: number, locale: string, currency = 'USD'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

export function formatDate(date: Date, locale: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, options ?? { dateStyle: 'long' }).format(date);
}

export function formatRelativeTime(date: Date, locale: string): string {
  const diff = date.getTime() - Date.now();
  const seconds = Math.round(diff / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(days) >= 1) return rtf.format(days, 'day');
  if (Math.abs(hours) >= 1) return rtf.format(hours, 'hour');
  if (Math.abs(minutes) >= 1) return rtf.format(minutes, 'minute');
  return rtf.format(seconds, 'second');
}

export function formatList(items: string[], locale: string): string {
  return new Intl.ListFormat(locale, { type: 'conjunction' }).format(items);
}
```

```tsx
// Usage in components — get locale from i18next
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate } from '@/shared/lib/formatters';

export function ProductPrice({ price, date }: { price: number; date: Date }) {
  const { i18n } = useTranslation();
  const locale = i18n.language;

  return (
    <div>
      <p>{formatCurrency(price, locale)}</p>
      <p>{formatDate(date, locale, { dateStyle: 'long' })}</p>
    </div>
  );
}
```

## 5. Translation File Organization

```
public/
└── locales/
    ├── en/
    │   ├── translation.json   # Shared texts (default namespace)
    │   ├── auth.json          # Login, register, password
    │   ├── products.json      # Catalog, prices
    │   ├── checkout.json      # Cart, payment
    │   └── errors.json        # Error messages
    ├── es/
    │   └── ...
    └── pt/
        └── ...
```

Configure namespaces in i18next:

```tsx
i18n.init({
  fallbackLng: 'en',
  ns: ['translation', 'auth', 'products', 'checkout', 'errors'],
  defaultNS: 'translation',
  backend: {
    loadPath: '/locales/{{lng}}/{{ns}}.json',
  },
});
```

```tsx
// Use specific namespace
const { t } = useTranslation('products');
t('title'); // Reads from products.json
```

## 6. RTL (Right-to-Left) Support

```tsx
// src/app/App.tsx or main layout
import { useTranslation } from 'react-i18next';

const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

export function App() {
  const { i18n } = useTranslation();
  const dir = RTL_LOCALES.has(i18n.language) ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = dir;
  }, [i18n.language, dir]);

  // ...
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

## 7. Locale Detection

`i18next-browser-languagedetector` detects in this order (configurable):

1. **Query string** — `?lng=en`
2. **Cookie** — `i18next=en`
3. **Navigator** — `navigator.language`
4. **HTML tag** — `<html lang="en">`

```tsx
i18n.init({
  detection: {
    order: ['cookie', 'navigator', 'htmlTag'],
    caches: ['cookie'],
    cookieMinutes: 60 * 24 * 365, // 1 year
  },
});
```

## Gotchas

- Hardcoded strings in components break i18n — all visible text must go through `t()`.
- Ternaries for plurals (`count === 1 ? 'product' : 'products'`) fail in languages with >2 plural forms — use pluralization suffixes or ICU MessageFormat.
- Concatenating translations (`t('greeting') + ' ' + name`) fails because word order varies by language — use interpolation `t('greeting', { name })`.
- `toLocaleDateString` is inconsistent across environments — use helpers based on `Intl` API.
- Cryptic keys (`msg_42`) are impossible to maintain — use descriptive keys (`products.emptyState`).
- `ml-`/`mr-` don't adapt to RTL — use logical properties (`ms-`, `me-`, `ps-`, `pe-`).
- `i18next-http-backend` loads JSONs via HTTP — files must be in `public/`.

## Related Skills

- [`a11y-rules`](../a11y-rules/SKILL.md) — `lang` attribute, aria-label translations, RTL layout
- [`forms-and-validation-rules`](../forms-and-validation-rules/SKILL.md) — translated error messages, i18n labels
- [`i18n-nextjs-rules`](../i18n-nextjs-rules/SKILL.md) — Next.js version with next-intl
