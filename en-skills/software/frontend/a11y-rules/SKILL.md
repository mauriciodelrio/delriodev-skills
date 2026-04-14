---
name: a11y-rules
description: >
  Use this skill when building or reviewing React/Next.js components that
  require WCAG 2.2 level AA compliance: ARIA roles and attributes, focus
  management, keyboard navigation, landmarks, live regions, accessible
  forms, and automated testing (axe-core, Lighthouse).
---

# Accessibility (a11y) — WCAG 2.2 AA

## Agent workflow

1. Verify semantic HTML before adding ARIA (section 1-2).
2. Implement focus management and keyboard navigation (section 3-4).
3. Ensure descriptive alt on images and captions on video (section 5).
4. Apply labels, fieldset/legend, and accessible errors in forms (section 6).
5. Validate minimum contrast 4.5:1 and don't rely on color alone (section 7).
6. Write tests with axe-core and validate keyboard interaction (section 8).
7. Pass a11y checklist per component before commit.

## 1. Semantic HTML

```tsx
<header>...</header>
<nav aria-label="Main">...</nav>
<main>...</main>
<article>...</article>
<aside>...</aside>
<footer>...</footer>
<button onClick={fn}>          // NEVER <div onClick={fn}>
<a href="/page">               // NEVER <span onClick={navigate}>

// Headings: DO NOT skip levels — screen readers use them to navigate
<h1>Page title</h1>            // Only 1 per page
  <h2>Section</h2>
    <h3>Subsection</h3>

// ❌ Fake heading — invisible to screen readers
<div className="text-2xl font-bold">Fake heading</div>
```

## 2. ARIA — Only When HTML Isn't Enough

```tsx
// Icon-only button — needs aria-label
<button aria-label="Close modal">✕</button>

<button aria-label="Search products">
  <SearchIcon aria-hidden="true" />
</button>

// aria-labelledby: reference visible text (DO NOT duplicate with aria-label)
<dialog aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm deletion</h2>
</dialog>

// aria-describedby: hints and errors
<input id="email" type="email" aria-describedby="email-error email-hint" />
<p id="email-hint">We'll use this email for notifications</p>
<p id="email-error" role="alert">The email is not valid</p>

// aria-live: dynamic changes
<div aria-live="polite" aria-atomic="true">
  {notification && <p>{notification}</p>}
</div>

// aria-expanded + aria-controls
<button aria-expanded={isOpen} aria-controls="menu-items">
  Menu
</button>
<ul id="menu-items" hidden={!isOpen}>...</ul>

// NEVER contradict semantics: <button role="link"> → use <a>
```

## 3. Focus Management

```tsx
import { useEffect, useRef } from 'react';

function useFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on open
    firstElement?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return containerRef;
}

// Restore focus when closing modal
function Modal({ isOpen, onClose, children }: ModalProps) {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
    } else {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  // ...
}

// Skip navigation link
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4">
  Skip to main content
</a>
<main id="main-content" tabIndex={-1}>...</main>
```

## 4. Keyboard Navigation

```tsx
// Keyboard patterns per widget:
// Tabs → Arrow keys to navigate, Tab to exit
// Menu → Arrow keys, Enter to select, Escape to close
// Dialog → Tab to navigate, Escape to close

// Focus indicator — focus-visible shows ring only with keyboard, not mouse
<button className={cn(
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
)}>
  Action
</button>
```

## 5. Images and Media

```tsx
// Informative: alt describes the content
<Image alt="Bar chart showing Q4 2025 sales with a 23% increase" src={chart} />

// Decorative: empty alt + aria-hidden
<Image alt="" aria-hidden="true" src={decorativeLine} />
<SearchIcon aria-hidden="true" className="h-5 w-5" />

// Video with captions
<video controls>
  <source src="demo.mp4" type="video/mp4" />
  <track kind="captions" src="captions-en.vtt" srcLang="en" label="English" default />
</video>

// ❌ alt="image" or alt="photo" provide nothing — describe WHAT it shows
```

## 6. Accessible Forms

```tsx
<label htmlFor="email">Email address</label>
<input id="email" type="email" aria-required="true" />

// Group of related fields
<fieldset>
  <legend>Shipping address</legend>
  <label htmlFor="street">Street</label>
  <input id="street" />
  <label htmlFor="city">City</label>
  <input id="city" />
</fieldset>

// Accessible error pattern
<label htmlFor="password">Password</label>
<input
  id="password"
  type="password"
  aria-invalid={!!error}
  aria-describedby={error ? 'password-error' : 'password-hint'}
  aria-required="true"
/>
<p id="password-hint" className="text-sm text-gray-500">
  Minimum 8 characters
</p>
{error && (
  <p id="password-error" className="text-sm text-red-600" role="alert">
    {error}
  </p>
)}

// NEVER placeholder as only label — disappears when typing
<input placeholder="Email" />
```

## 7. Contrast and Color

```
WCAG 2.2 AA Requirements:
- Normal text: minimum ratio 4.5:1
- Large text (18px+ bold or 24px+): minimum ratio 3:1
- UI controls and graphics: minimum ratio 3:1
- NEVER convey information with color ONLY (use icon + text + color)
```

```tsx
// ALWAYS: color + icon + text
<div className="flex items-center gap-2 text-red-600">
  <AlertCircleIcon aria-hidden="true" className="h-4 w-4" />
  <span>This field is required</span>
</div>
```

## 8. Accessibility Testing

```tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('LoginForm has no accessibility violations', async () => {
  const { container } = render(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('modal closes with Escape', async () => {
  const user = userEvent.setup();
  render(<Modal isOpen onClose={mockClose}>Content</Modal>);

  await user.keyboard('{Escape}');
  expect(mockClose).toHaveBeenCalled();
});

test('tab navigates between modal buttons', async () => {
  const user = userEvent.setup();
  render(<Modal isOpen><button>Cancel</button><button>Accept</button></Modal>);

  await user.tab();
  expect(screen.getByText('Cancel')).toHaveFocus();

  await user.tab();
  expect(screen.getByText('Accept')).toHaveFocus();
});
```

## a11y Checklist per Component

- [ ] Descriptive label/aria-label
- [ ] Navigable with Tab, activatable with Enter/Space
- [ ] Visible focus indicator
- [ ] Contrast 4.5:1 (text) / 3:1 (UI)
- [ ] Errors with role="alert"
- [ ] Images: descriptive alt or empty if decorative
- [ ] Decorative icons: aria-hidden="true"
- [ ] Modals: focus trap + restore focus on close

## Gotchas

- `aria-label` on elements with visible text creates double reading in screen readers — use `aria-labelledby` referencing the existing text instead.
- `tabindex="0"` makes a `<div>` focusable, but does NOT give it button semantics — you also need `role="button"` and `Enter`/`Space` handler. Prefer `<button>` always.
- `outline-none` in Tailwind without a `ring-*` replacement silently breaks keyboard navigation — no error, the user just can't see where focus is.
- `aria-live="assertive"` interrupts the user — reserve for critical errors. For general notifications use `"polite"`.
- `role="alert"` triggers immediate announcement on render — conditional rendering with `{error && ...}` works fine, but changing text inside an existing alert may be ignored by the screen reader.
- A native `<dialog>` with `showModal()` handles focus trap automatically — don't reimplement `useFocusTrap` if using the native element.

## Related Skills

| Skill | Why |
|-------|-----|
| [`testing-rules`](../testing-rules/SKILL.md) | Accessibility tests (queries by role, axe-core) |
| [`component-patterns`](../component-patterns/SKILL.md) | Compound components with semantic roles |
| [`css-rules`](../css-rules/SKILL.md) | Contrast, focus indicators, prefers-reduced-motion |
| [`forms-and-validation-rules`](../forms-and-validation-rules/SKILL.md) | Labels, accessible error messages, fieldset/legend |
| [`i18n-react-rules`](../i18n-react-rules/SKILL.md) / [`i18n-nextjs-rules`](../i18n-nextjs-rules/SKILL.md) | `lang` attribute, translations of aria-labels |
