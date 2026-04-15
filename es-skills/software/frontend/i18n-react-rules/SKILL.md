---
name: i18n-react-rules
description: >
  Usa esta skill cuando implementes internacionalización en un proyecto
  Vite SPA con React: react-i18next + i18next, ICU MessageFormat, pluralización,
  formateo de fechas/números/moneda con Intl API, organización de archivos de
  traducción, soporte RTL y detección de locale del navegador.
---

# Internacionalización (i18n) — React / Vite SPA

## Cross-references obligatorias

| Skill | Cuándo activar |
|-------|---------------|
| [`i18n-nextjs-rules`](../i18n-nextjs-rules/SKILL.md) | Si el proyecto es Next.js (detectar `next.config.*`). No usar esta skill en ese caso. |
| [`a11y-rules`](../a11y-rules/SKILL.md) | Siempre — atributo `lang`, traducciones de `aria-label`, layout RTL accesible. |
| [`forms-and-validation-rules`](../forms-and-validation-rules/SKILL.md) | Cuando el formulario necesite mensajes de error traducidos y labels i18n. |
| [`design-system-build-components-rules`](../design-system-build-components-rules/SKILL.md) | Cuando construyas componentes DS — todos los strings visibles como props, `aria-label` traducible. |

## Flujo de trabajo del agente

1. Instalar `react-i18next` + `i18next` + `i18next-browser-languagedetector` + `i18next-http-backend` (sección 1).
2. Configurar i18next con interpolación, detección de idioma y namespaces (sección 1).
3. Usar `useTranslation` en componentes (sección 2).
4. ICU MessageFormat para plurales y select por género (sección 3).
5. Formateo de fechas, números y moneda con `Intl` API nativa (sección 4).
6. Dividir traducciones por feature en namespaces (sección 5).
7. Logical CSS properties (`ms-`, `ps-`, `text-start`) para soporte RTL (sección 6).
8. Detección de locale: navegador → cookie → default (sección 7).

## 1. Setup con react-i18next (Vite SPA)

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
// public/locales/es/translation.json
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
    "welcome": "Hola, {{name}}"
  },
  "products": {
    "title": "Productos",
    "count_one": "{{count}} producto",
    "count_other": "{{count}} productos",
    "count_zero": "Sin productos",
    "price": "Precio: {{price}}"
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
    fallbackLng: 'es',
    supportedLngs: ['es', 'en', 'pt'],
    interpolation: {
      escapeValue: false, // React ya escapa por defecto
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
import './app/i18n'; // Importar antes del render

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

## 2. Uso en Componentes

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

// Con namespace específico
export function AuthHeader() {
  const { t } = useTranslation('auth');
  return <h2>{t('welcome', { name: user.name })}</h2>;
}

// Cambiar idioma
export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
    >
      <option value="es">Español</option>
      <option value="en">English</option>
      <option value="pt">Português</option>
    </select>
  );
}
```

## 3. ICU MessageFormat — Plurales e Interpolación

i18next usa un formato propio para plurales (sufijos `_one`, `_other`, `_zero`):

```json
{
  "notifications": {
    "unread_zero": "No tienes notificaciones",
    "unread_one": "Tienes {{count}} notificación sin leer",
    "unread_other": "Tienes {{count}} notificaciones sin leer"
  }
}
```

```tsx
t('notifications.unread', { count: 0 });   // "No tienes notificaciones"
t('notifications.unread', { count: 1 });   // "Tienes 1 notificación sin leer"
t('notifications.unread', { count: 5 });   // "Tienes 5 notificaciones sin leer"
```

Para proyectos que necesiten ICU MessageFormat completo (select por género, etc.), agregar el plugin:

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

Con ICU habilitado, los JSON usan el formato estándar:

```json
{
  "notifications": {
    "unread": "{count, plural, =0 {No tienes notificaciones} one {Tienes # notificación sin leer} other {Tienes # notificaciones sin leer}}",
    "lastSeen": "{gender, select, male {Última vez visto} female {Última vez vista} other {Última conexión}}: {date, date, medium}"
  }
}
```

## 4. Formateo de Fechas, Números y Moneda

En Vite SPA, usar la API `Intl` nativa del navegador (no depender de next-intl):

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
// Uso en componentes — obtener locale de i18next
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

## 5. Organización de Archivos de Traducción

```
public/
└── locales/
    ├── es/
    │   ├── translation.json   # Textos compartidos (namespace default)
    │   ├── auth.json          # Login, register, password
    │   ├── products.json      # Catálogo, precios
    │   ├── checkout.json      # Carrito, pago
    │   └── errors.json        # Mensajes de error
    ├── en/
    │   └── ...
    └── pt/
        └── ...
```

Configurar namespaces en i18next:

```tsx
i18n.init({
  fallbackLng: 'es',
  ns: ['translation', 'auth', 'products', 'checkout', 'errors'],
  defaultNS: 'translation',
  backend: {
    loadPath: '/locales/{{lng}}/{{ns}}.json',
  },
});
```

```tsx
// Usar namespace específico
const { t } = useTranslation('products');
t('title'); // Lee de products.json
```

## 6. Soporte RTL (Right-to-Left)

```tsx
// src/app/App.tsx o layout principal
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
// Tailwind RTL utilities (funcional pero verbose)
<div className="ml-4 rtl:mr-4 rtl:ml-0">
<div className="text-left rtl:text-right">

// Preferir logical properties — se adaptan automáticamente a RTL
<div className="ms-4">
<div className="ps-4">
<div className="text-start">
```

## 7. Detección de Locale

`i18next-browser-languagedetector` detecta en este orden (configurable):

1. **Query string** — `?lng=en`
2. **Cookie** — `i18next=en`
3. **Navigator** — `navigator.language`
4. **HTML tag** — `<html lang="en">`

```tsx
i18n.init({
  detection: {
    order: ['cookie', 'navigator', 'htmlTag'],
    caches: ['cookie'],
    cookieMinutes: 60 * 24 * 365, // 1 año
  },
});
```

## Gotchas

- Strings hardcodeadas en componentes rompen i18n — todo texto visible debe pasar por `t()`.
- Ternarios para plurales (`count === 1 ? 'producto' : 'productos'`) fallan en idiomas con >2 formas plurales — usar sufijos de pluralización o ICU MessageFormat.
- Concatenar traducciones (`t('greeting') + ' ' + name`) falla porque el orden de palabras varía por idioma — usar interpolación `t('greeting', { name })`.
- `toLocaleDateString` es inconsistente entre entornos — usar helpers basados en `Intl` API.
- Keys crípticas (`msg_42`) son imposibles de mantener — usar keys descriptivas (`products.emptyState`).
- `ml-`/`mr-` no se adaptan a RTL — usar logical properties (`ms-`, `me-`, `ps-`, `pe-`).
- `i18next-http-backend` carga JSONs via HTTP — los archivos deben estar en `public/`.

## Skills Relacionadas

- [`a11y-rules`](../a11y-rules/SKILL.md) — `lang` attribute, traducciones de aria-labels, RTL layout
- [`forms-and-validation-rules`](../forms-and-validation-rules/SKILL.md) — mensajes de error traducidos, labels i18n
- [`i18n-nextjs-rules`](../i18n-nextjs-rules/SKILL.md) — versión Next.js con next-intl
