---
name: storybook
description: >
  Usa esta skill cuando configures o escribas stories en Storybook 8+.
  Cubre setup para Vite y Next.js, CSF3, controls, play functions,
  addon de accesibilidad, decorators de providers, integración de tokens
  de diseño, dark mode y testing visual con test-storybook en CI.
---

# Storybook — Configuración y Stories

## Flujo de trabajo del agente

1. Instalar Storybook y addons según tipo de proyecto (sección **Setup**).
2. Configurar `preview.ts` con decorators globales, CSS global y tokens (sección **Configuración**).
3. Escribir stories en CSF3 con `args` tipados y `tags: ['autodocs']` (sección **Estructura CSF3**).
4. Agregar `play` functions a todo componente interactivo (sección **Play Functions**).
5. Verificar que el addon `@storybook/addon-a11y` no reporta violaciones AA.
6. Cumplir las 10 reglas obligatorias antes de marcar la tarea como completada.

## Cross-referencias Obligatorias

| Skill | Cuándo activar |
|-------|----------------|
| [`design-system-build-components-rules`](../design-system-build-components-rules/SKILL.md) | Siempre — cada componente del DS requiere stories |
| [`a11y-rules`](../a11y-rules/SKILL.md) | Siempre — `addon-a11y` valida WCAG 2.2 AA en cada story |
| [`testing-rules`](../testing-rules/SKILL.md) | `play` functions son tests; mismos patrones que RTL (`userEvent`, `expect`) |
| [`css-rules`](../css-rules/SKILL.md) | Tokens y dark mode deben reflejarse en el preview de Storybook |
| [`i18n-react-rules`](../i18n-react-rules/SKILL.md) / [`i18n-nextjs-rules`](../i18n-nextjs-rules/SKILL.md) | Cuando los componentes usen `useTranslation` — agregar decorator de i18n provider |

## Setup

### Vite + React

```bash
pnpm dlx storybook@latest init --type react --builder vite
pnpm add -D @storybook/addon-a11y @storybook/test @storybook/addon-interactions \
  @storybook/addon-themes @storybook/test-runner
```

### Next.js

```bash
pnpm dlx storybook@latest init --type nextjs
pnpm add -D @storybook/addon-a11y @storybook/test @storybook/addon-interactions \
  @storybook/addon-themes @storybook/test-runner
```

### `.storybook/main.ts`

```typescript
import type { StorybookConfig } from '@storybook/react-vite'; // o @storybook/nextjs

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.{ts,tsx}'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
    '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/react-vite', // o @storybook/nextjs
    options: {},
  },
};

export default config;
```

## Configuración Global (`preview.ts`)

```typescript
import type { Preview } from '@storybook/react';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import '../src/index.css'; // CSS global: tokens, Tailwind base

const preview: Preview = {
  parameters: {
    a11y: {
      // Nivel mínimo AA — no reducir a A
      config: { rules: [{ id: 'color-contrast', enabled: true }] },
    },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/ } },
    layout: 'centered',
  },
  decorators: [
    withThemeByDataAttribute({
      themes: { light: '', dark: 'dark' },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
    // Agregar aquí providers globales (Router, i18n, QueryClient)
  ],
};

export default preview;
```

## Estructura CSF3

Formato estándar para toda story del proyecto:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

const meta = {
  title: 'Atoms/ComponentName',        // Categoría/Nombre (jerarquía DS)
  component: ComponentName,
  tags: ['autodocs'],                  // Genera documentación automática
  args: {                              // Args compartidos por todas las stories
    children: 'Texto de ejemplo',
  },
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

// Una story por estado semántico relevante
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Loading: Story = { args: { isLoading: true } };
export const Error: Story = { args: { state: 'error' } };
```

### Convención de `title`

```
Atoms/Button           → átomo individual
Molecules/FormField    → molécula
Organisms/DataTable    → organismo
Patterns/AuthModal     → patrón de negocio reutilizable
```

## ArgTypes — Controles Interactivos

Storybook infiere controles desde TypeScript. Sobreescribir solo cuando la inferencia no sea clara:

```typescript
argTypes: {
  variant: {
    control: 'select',
    options: ['primary', 'secondary', 'ghost', 'destructive'],
    description: 'Variante visual del botón',
    table: { defaultValue: { summary: 'primary' } },
  },
  size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  isLoading: { control: 'boolean' },
  onClick: { action: 'clicked' },  // Registra clicks en el panel Actions
},
```

## Play Functions — Testing Interactivo

Las `play` functions son tests que corren dentro de Storybook **y** en CI con `test-storybook`. Usar los mismos patrones que React Testing Library:

```typescript
import { expect, userEvent, within } from '@storybook/test';

export const OpensDropdown: Story = {
  args: { label: 'Opciones' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /opciones/i });
    await userEvent.click(trigger);

    const menu = canvas.getByRole('menu');
    await expect(menu).toBeVisible();

    // Navegación con teclado
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getAllByRole('menuitem')[0]).toHaveFocus();

    // Escape cierra y restaura focus
    await userEvent.keyboard('{Escape}');
    await expect(menu).not.toBeVisible();
    await expect(trigger).toHaveFocus();
  },
};

export const SubmitsForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(canvas.getByLabelText(/contraseña/i), 'password123');
    await userEvent.click(canvas.getByRole('button', { name: /iniciar sesión/i }));
    await expect(canvas.getByText(/bienvenido/i)).toBeInTheDocument();
  },
};
```

### Correr en CI

```bash
# build + test-runner en pipeline
pnpm storybook build
pnpm concurrently -k -s first \
  "pnpm http-server storybook-static --port 6006 --silent" \
  "pnpm wait-on tcp:6006 && pnpm test-storybook"
```

## A11y Addon

El addon corre axe-core en cada story automáticamente. El panel "Accessibility" muestra las violaciones. Nunca deshabilitar `color-contrast` — si falla, corregir el token de color.

```typescript
// Sobreescribir por story solo con razón documentada
export const WithException: Story = {
  parameters: {
    a11y: {
      config: {
        rules: [
          // Este patrón es correcto en contexto; axe no soporta el caso
          { id: 'aria-required-parent', enabled: false },
        ],
      },
    },
  },
};
```

## Decorators de Providers

Providers globales en `preview.ts`. Providers específicos en el campo `decorators` de la story.

```typescript
// .storybook/preview.ts — providers globales
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../src/config/i18n';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

export const decorators = [
  (Story) => (
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      </I18nextProvider>
    </MemoryRouter>
  ),
];
```

```typescript
// Story con ruta específica
export const SettingsPage: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/dashboard/settings']}>
        <Story />
      </MemoryRouter>
    ),
  ],
};
```

## Tokens de Diseño en Storybook

Importar `index.css` en `preview.ts` es suficiente para las CSS custom properties. Para una story de tokens visuales:

```typescript
// src/shared/components/ui/tokens.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { TokensGrid } from './TokensGrid';

export default {
  title: 'Design Tokens/Colors',
  component: TokensGrid,
  tags: ['autodocs'],
} satisfies Meta<typeof TokensGrid>;
```

Para que el theme de Docs use los mismos colores del DS:

```typescript
// preview.ts
parameters: {
  docs: {
    theme: {
      colorPrimary: 'var(--color-primary)',
      colorSecondary: 'var(--color-muted)',
    },
  },
},
```

## Reglas Obligatorias

1. **`tags: ['autodocs']`** en todo `meta` — genera tab Docs con tabla de props y controles.
2. **Una story por estado semántico** — `Default`, `Disabled`, `Loading`, `Error` son historias separadas.
3. **`play` function en todo componente interactivo** — dropdowns, modals, formularios, tabs, accordions.
4. **`addon-a11y` sin violaciones AA** — no mergear stories con violaciones activas.
5. **Nunca deshabilitar `color-contrast`** — corregir el token de color, no la regla.
6. **Providers en decorators, nunca en `render`** — mantener stories declarativas.
7. **No lógica de negocio en stories** — stories visualizan props, no simulan flujos de app.
8. **`args` compartidos en `meta.args`** — no repetir el mismo arg en cada story.
9. **`title` sigue jerarquía DS** — `Atoms/`, `Molecules/`, `Organisms/`, `Patterns/`.
10. **Eventos como `action`** — registrar `onClick`, `onChange`, `onSubmit` en `argTypes` para el panel Actions.

## Gotchas

- **No usar `@storybook/testing-library`** (deprecated) — migrar a la API unificada `@storybook/test` de Storybook 8.
- **`document.querySelector` en `play` functions** — usar siempre `within(canvasElement)` para evitar colisiones entre stories.
- **CSS global no importado en `preview.ts`** — los tokens y el reset de Tailwind no se aplican; la story se ve diferente a la app.
- **`autodocs` ausente** — la tab Docs no aparece para ese componente en el Storybook publicado.
- **Providers hardcodeados en `render`** — dificulta sobreescribir el provider en tests de interacción.
- **Test-runner no configurado en CI** — las `play` functions solo corren localmente; el pipeline no detecta regresiones.
