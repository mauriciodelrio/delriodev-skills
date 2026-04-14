---
name: i18n-nextjs-rules
description: >
  Usa esta skill cuando implementes internacionalización en un proyecto Next.js
  App Router: next-intl, useTranslations, getTranslations, ICU MessageFormat,
  useFormatter, detección de locale vía middleware, soporte RTL con app/[locale]/layout.
---

# Internacionalización (i18n) — Next.js App Router

## Cross-references obligatorias

| Skill | Cuándo activar |
|-------|---------------|
| [`i18n-react-rules`](../i18n-react-rules/SKILL.md) | Si el proyecto es Vite SPA (detectar `vite.config.*` sin `next.config.*`). No usar esta skill en ese caso. |
| [`a11y-rules`](../a11y-rules/SKILL.md) | Siempre — atributo `lang`, traducciones de `aria-label`, layout RTL accesible. |
| [`forms-and-validation-rules`](../forms-and-validation-rules/SKILL.md) | Cuando el formulario necesite mensajes de error traducidos y labels i18n. |
| [`seo-rules`](../seo-rules/SKILL.md) | Siempre — hreflang, canonical URLs por locale. |

## Flujo de trabajo del agente

1. Configurar next-intl con routing y archivos de mensajes (sección 1).
2. Usar `useTranslations` en Server/Client Components, `getTranslations` en Server Actions (sección 2).
3. ICU MessageFormat para plurales y select por género (sección 3).
4. `useFormatter` para fechas, números, moneda y listas (sección 4).
5. Dividir traducciones por feature en proyectos grandes (sección 5).
6. Logical CSS properties (`ms-`, `ps-`, `text-start`) para soporte RTL (sección 6).
7. Middleware para detección de locale: URL → Cookie → Accept-Language → default (sección 7).

## 1. Setup con next-intl

```
messages/
├── es.json           # Español (default)
├── en.json           # English
├── pt.json           # Português
└── index.ts          # Re-export tipado
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
  locales: ['es', 'en', 'pt'],
  defaultLocale: 'es',
  localePrefix: 'as-needed',
});
```

## 2. Uso en Componentes

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

## 3. ICU MessageFormat — Plurales e Interpolación

```json
{
  "notifications": {
    "unread": "{count, plural, =0 {No tienes notificaciones} one {Tienes # notificación sin leer} other {Tienes # notificaciones sin leer}}",

    "lastSeen": "{gender, select, male {Última vez visto} female {Última vez vista} other {Última conexión}}: {date, date, medium}",

    "fileSize": "Tamaño: {size, number, ::compact-short} bytes"
  }
}
```

```tsx
t('notifications.unread', { count: 0 });   // "No tienes notificaciones"
t('notifications.unread', { count: 1 });   // "Tienes 1 notificación sin leer"
t('notifications.unread', { count: 5 });   // "Tienes 5 notificaciones sin leer"
```

## 4. Formateo de Fechas, Números y Moneda

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

## 5. Organización de Archivos de Traducción

```
messages/
├── es/
│   ├── common.json       # Textos compartidos
│   ├── auth.json         # Login, register, password
│   ├── products.json     # Catálogo, precios
│   ├── checkout.json     # Carrito, pago
│   └── errors.json       # Mensajes de error
├── en/
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

## 6. Soporte RTL (Right-to-Left)

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
// Tailwind RTL utilities (funcional pero verbose)
<div className="ml-4 rtl:mr-4 rtl:ml-0">
<div className="text-left rtl:text-right">

// Preferir logical properties — se adaptan automáticamente a RTL
<div className="ms-4">
<div className="ps-4">
<div className="text-start">
```

## 7. Detección de Locale — Middleware

```tsx
// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/', '/(es|en|pt)/:path*'],
};
```

Orden de detección: URL path → Cookie → Accept-Language header → defaultLocale.

## Gotchas

- Strings hardcodeadas en componentes rompen i18n — todo texto visible debe pasar por `t()`.
- Ternarios para plurales (`count === 1 ? 'producto' : 'productos'`) fallan en idiomas con >2 formas plurales — usar ICU MessageFormat.
- Concatenar traducciones (`t('greeting') + ' ' + name`) falla porque el orden de palabras varía por idioma — usar interpolación `t('greeting', { name })`.
- `toLocaleDateString` es inconsistente entre entornos — usar `useFormatter` de next-intl.
- Keys crípticas (`msg_42`) son imposibles de mantener — usar keys descriptivas (`products.emptyState`).
- `ml-`/`mr-` no se adaptan a RTL — usar logical properties (`ms-`, `me-`, `ps-`, `pe-`).
- Form sin `noValidate` mezcla validación nativa con custom — siempre agregar `noValidate`.

## Skills Relacionadas

- [`a11y-rules`](../a11y-rules/SKILL.md) — `lang` attribute, traducciones de aria-labels, RTL layout
- [`forms-and-validation-rules`](../forms-and-validation-rules/SKILL.md) — mensajes de error traducidos, labels i18n
- [`seo-rules`](../seo-rules/SKILL.md) — hreflang, canonical URLs por locale
- [`i18n-react-rules`](../i18n-react-rules/SKILL.md) — versión Vite SPA con react-i18next
