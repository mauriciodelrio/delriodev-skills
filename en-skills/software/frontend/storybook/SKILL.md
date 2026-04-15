---
name: storybook
description: >
  Use this skill when configuring or writing stories in Storybook 8+.
  Covers setup for Vite and Next.js, CSF3, controls, play functions,
  accessibility addon, provider decorators, design token integration,
  dark mode, and visual testing with test-storybook in CI.
---

# Storybook — Configuration and Stories

## Agent workflow

1. Install Storybook and addons based on project type (section **Setup**).
2. Configure `preview.ts` with global decorators, global CSS, and tokens (section **Configuration**).
3. Write stories in CSF3 with typed `args` and `tags: ['autodocs']` (section **CSF3 Structure**).
4. Add `play` functions to every interactive component (section **Play Functions**).
5. Verify that `@storybook/addon-a11y` reports no AA violations.
6. Satisfy all 10 mandatory rules before marking the task complete.

## Mandatory Cross-references

| Skill | When to activate |
|-------|-----------------|
| [`design-system-build-components-rules`](../design-system-build-components-rules/SKILL.md) | Always — every DS component requires stories |
| [`a11y-rules`](../a11y-rules/SKILL.md) | Always — `addon-a11y` validates WCAG 2.2 AA on each story |
| [`testing-rules`](../testing-rules/SKILL.md) | `play` functions are tests; same patterns as RTL (`userEvent`, `expect`) |
| [`css-rules`](../css-rules/SKILL.md) | Tokens and dark mode must be reflected in the Storybook preview |
| [`i18n-react-rules`](../i18n-react-rules/SKILL.md) / [`i18n-nextjs-rules`](../i18n-nextjs-rules/SKILL.md) | When components use `useTranslation` — add i18n provider decorator |

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
import type { StorybookConfig } from '@storybook/react-vite'; // or @storybook/nextjs

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.{ts,tsx}'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
    '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/react-vite', // or @storybook/nextjs
    options: {},
  },
};

export default config;
```

## Global Configuration (`preview.ts`)

```typescript
import type { Preview } from '@storybook/react';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import '../src/index.css'; // Global CSS: tokens, Tailwind base

const preview: Preview = {
  parameters: {
    a11y: {
      // Minimum level AA — do not downgrade to A
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
    // Add global providers here (Router, i18n, QueryClient)
  ],
};

export default preview;
```

## CSF3 Structure

Standard format for every story in the project:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

const meta = {
  title: 'Atoms/ComponentName',        // Category/Name (DS hierarchy)
  component: ComponentName,
  tags: ['autodocs'],                  // Generates automatic documentation
  args: {                              // Args shared across all stories
    children: 'Example text',
  },
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

// One story per meaningful semantic state
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Loading: Story = { args: { isLoading: true } };
export const Error: Story = { args: { state: 'error' } };
```

### `title` Naming Convention

```
Atoms/Button           → individual atom
Molecules/FormField    → molecule
Organisms/DataTable    → organism
Patterns/AuthModal     → reusable business pattern
```

## ArgTypes — Interactive Controls

Storybook infers controls from TypeScript. Override only when inference is unclear:

```typescript
argTypes: {
  variant: {
    control: 'select',
    options: ['primary', 'secondary', 'ghost', 'destructive'],
    description: 'Visual variant of the button',
    table: { defaultValue: { summary: 'primary' } },
  },
  size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  isLoading: { control: 'boolean' },
  onClick: { action: 'clicked' },  // Records clicks in the Actions panel
},
```

## Play Functions — Interaction Testing

`play` functions are tests that run inside Storybook **and** in CI with `test-storybook`. Use the same patterns as React Testing Library:

```typescript
import { expect, userEvent, within } from '@storybook/test';

export const OpensDropdown: Story = {
  args: { label: 'Options' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /options/i });
    await userEvent.click(trigger);

    const menu = canvas.getByRole('menu');
    await expect(menu).toBeVisible();

    // Keyboard navigation
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getAllByRole('menuitem')[0]).toHaveFocus();

    // Escape closes and restores focus
    await userEvent.keyboard('{Escape}');
    await expect(menu).not.toBeVisible();
    await expect(trigger).toHaveFocus();
  },
};

export const SubmitsForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(canvas.getByLabelText(/password/i), 'password123');
    await userEvent.click(canvas.getByRole('button', { name: /sign in/i }));
    await expect(canvas.getByText(/welcome/i)).toBeInTheDocument();
  },
};
```

### Running in CI

```bash
# build + test-runner in pipeline
pnpm storybook build
pnpm concurrently -k -s first \
  "pnpm http-server storybook-static --port 6006 --silent" \
  "pnpm wait-on tcp:6006 && pnpm test-storybook"
```

## A11y Addon

The addon runs axe-core on each story automatically. The "Accessibility" panel shows violations. Never disable `color-contrast` — if it fails, fix the color token.

```typescript
// Override per story only with documented reason
export const WithException: Story = {
  parameters: {
    a11y: {
      config: {
        rules: [
          // This pattern is correct in context; axe doesn't support the case
          { id: 'aria-required-parent', enabled: false },
        ],
      },
    },
  },
};
```

## Provider Decorators

Global providers go in `preview.ts`. Story-specific providers go in the story's `decorators` field.

```typescript
// .storybook/preview.ts — global providers
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
// Story with specific route
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

## Design Tokens in Storybook

Importing `index.css` in `preview.ts` is enough for CSS custom properties. For a visual tokens story:

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

To make the Docs theme use the same DS colors:

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

## Mandatory Rules

1. **`tags: ['autodocs']`** on every `meta` — generates a Docs tab with props table and live controls.
2. **One story per semantic state** — `Default`, `Disabled`, `Loading`, `Error` are separate stories.
3. **`play` function on every interactive component** — dropdowns, modals, forms, tabs, accordions.
4. **`addon-a11y` with no AA violations** — do not merge stories with active violations.
5. **Never disable `color-contrast`** — fix the color token, not the rule.
6. **Providers in decorators, never in `render`** — keep stories declarative.
7. **No business logic in stories** — stories render props, they do not simulate app flows.
8. **`args` shared in `meta.args`** — do not repeat the same arg in every story.
9. **`title` follows DS hierarchy** — `Atoms/`, `Molecules/`, `Organisms/`, `Patterns/`.
10. **Events as `action`** — register `onClick`, `onChange`, `onSubmit` in `argTypes` for the Actions panel.

## Gotchas

- **Using `@storybook/testing-library`** (deprecated) — migrate to the unified `@storybook/test` API in Storybook 8.
- **`document.querySelector` in `play` functions** — always use `within(canvasElement)` to avoid story cross-contamination.
- **Global CSS not imported in `preview.ts`** — tokens and Tailwind reset won't apply; stories look different from the app.
- **`autodocs` tag missing** — the Docs tab won't appear for that component in the published Storybook.
- **Providers hardcoded in `render`** — makes it impossible to override the provider in interaction tests.
- **Test-runner not configured in CI** — `play` functions only run locally; the pipeline won't catch regressions.
