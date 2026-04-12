---
name: i18n-rules
description: >
  Reglas de internacionalización para aplicaciones React/Next.js. Cubre next-intl,
  react-i18next, ICU MessageFormat, pluralización, formateo de fechas/números/moneda,
  detección de locale, soporte RTL, y organización de archivos de traducción.
---

# 🌍 Internacionalización (i18n)

## Principio Rector

> **i18n desde el día 1.** Nunca hardcodear strings visibles al usuario.
> Todo texto DEBE pasar por el sistema de traducciones, incluso si hoy solo hay un idioma.

---

## 1. Setup con next-intl (Recomendado para Next.js)

```
messages/
├── es.json           # Español (default)
├── en.json           # English
├── pt.json           # Português
└── index.ts          # Re-export tipado
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
// i18n/request.ts — Configuración de next-intl
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
  localePrefix: 'as-needed', // Solo prefijo para no-default: /en/products
});
```

---

## 2. Uso en Componentes

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

// ✅ Client Component — igual sintaxis
'use client';
import { useTranslations } from 'next-intl';

export function AddToCartButton() {
  const t = useTranslations('common');
  return <Button>{t('save')}</Button>;
}

// ✅ Server-side (fuera de componentes): API routes, Server Actions
import { getTranslations } from 'next-intl/server';

export async function createProduct(formData: FormData) {
  const t = await getTranslations('products');
  // Usar t() en validaciones, mensajes de error, etc.
}
```

---

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
// Uso
t('notifications.unread', { count: 0 });   // "No tienes notificaciones"
t('notifications.unread', { count: 1 });   // "Tienes 1 notificación sin leer"
t('notifications.unread', { count: 5 });   // "Tienes 5 notificaciones sin leer"
```

---

## 4. Formateo de Fechas, Números y Moneda

```tsx
import { useFormatter } from 'next-intl';

export function ProductPrice({ price, date }: { price: number; date: Date }) {
  const format = useFormatter();

  return (
    <div>
      {/* Moneda — se adapta al locale */}
      <p>{format.number(price, { style: 'currency', currency: 'USD' })}</p>
      {/* es: US$1.234,56 | en: $1,234.56 */}

      {/* Fecha relativa */}
      <p>{format.relativeTime(date)}</p>
      {/* es: "hace 3 días" | en: "3 days ago" */}

      {/* Fecha formateada */}
      <p>{format.dateTime(date, { dateStyle: 'long' })}</p>
      {/* es: "11 de abril de 2026" | en: "April 11, 2026" */}

      {/* Listas */}
      <p>{format.list(['React', 'Next.js', 'TypeScript'], { type: 'conjunction' })}</p>
      {/* es: "React, Next.js y TypeScript" | en: "React, Next.js, and TypeScript" */}
    </div>
  );
}
```

---

## 5. Organización de Archivos de Traducción

```
// ✅ Para proyectos grandes: dividir por feature
messages/
├── es/
│   ├── common.json       # Textos compartidos
│   ├── auth.json         # Login, register, password
│   ├── products.json     # Catálogo, precios
│   ├── checkout.json     # Carrito, pago
│   └── errors.json       # Mensajes de error
├── en/
│   └── ...

// ✅ Merge en config
import deepmerge from 'deepmerge';

const messages = deepmerge.all([
  await import(`./messages/${locale}/common.json`),
  await import(`./messages/${locale}/auth.json`),
  await import(`./messages/${locale}/products.json`),
]);
```

---

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

// ✅ Tailwind RTL utilities
<div className="ml-4 rtl:mr-4 rtl:ml-0">  {/* Margen derecho en RTL */}
<div className="text-left rtl:text-right">  {/* Alineación adaptada */}

// ✅ Mejor: usar logical properties (no necesitan rtl: prefix)
<div className="ms-4">          {/* margin-inline-start */}
<div className="ps-4">          {/* padding-inline-start */}
<div className="text-start">    {/* Automáticamente se adapta */}
```

---

## 7. Detección de Locale

```tsx
// middleware.ts — detección y redirect
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/', '/(es|en|pt)/:path*'],
};

// Orden de prioridad de detección:
// 1. URL prefix (/en/products)
// 2. Cookie (NEXT_LOCALE)
// 3. Accept-Language header
// 4. Default locale
```

---

## Reglas Obligatorias

1. **NUNCA** hardcodear strings visibles al usuario en componentes
2. **SIEMPRE** usar ICU MessageFormat para plurales (no ternarios manuales)
3. **SIEMPRE** formatear fechas/números con el formatter del i18n (no `toLocaleDateString`)
4. **NUNCA** concatenar strings para formar oraciones (`t('hello') + name`) — usar interpolación
5. **SIEMPRE** proveer context a los traductores con comments en el JSON
6. Las **keys DEBEN** ser descriptivas: `products.emptyState` no `msg_42`
7. Usar **logical CSS properties** (`ms-`, `me-`, `ps-`, `pe-`) sobre `ml-`/`mr-`

---

## Anti-patrones

```tsx
// ❌ Strings hardcodeadas
<button>Save</button>                        // ❌
<button>{t('common.save')}</button>          // ✅

// ❌ Ternarios para plurales
{count === 1 ? 'producto' : 'productos'}     // ❌ No funciona en idiomas con >2 formas plurales
{t('products.count', { count })}             // ✅

// ❌ Concatenar strings traducidas
t('greeting') + ' ' + name                   // ❌ El orden de palabras varía por idioma
t('greeting', { name })                      // ✅

// ❌ Dates con toLocaleDateString
new Date().toLocaleDateString('es')          // ❌ Inconsistente
format.dateTime(date, { dateStyle: 'long' }) // ✅

// ❌ Keys numéricas o crípticas
{ "msg_1": "Hola", "msg_2": "Adiós" }       // ❌ Imposible de mantener
```
