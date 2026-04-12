---
name: a11y-rules
description: >
  Web accessibility rules for React/Next.js applications. Covers WCAG 2.2
  level AA, ARIA roles and attributes, focus management, keyboard navigation,
  landmarks, live regions, accessible forms, and testing with automated
  tools (axe-core, Lighthouse).
---

# ♿ Accessibility (a11y) — WCAG 2.2 AA Rules

## Guiding Principle

> **Accessibility is NOT optional.** Every component MUST be keyboard-navigable,
> understandable by screen readers, and meet a minimum contrast ratio of 4.5:1.

---

## 1. Semantic HTML — First Line of Defense

```tsx
// ✅ Use semantic HTML elements BEFORE ARIA
<header>...</header>           // Instead of <div role="banner">
<nav aria-label="Main">        // Instead of <div role="navigation">
<main>...</main>               // Instead of <div role="main">
<article>...</article>         // Standalone content
<aside>...</aside>             // Complementary content
<footer>...</footer>           // Instead of <div role="contentinfo">
<button onClick={fn}>          // NEVER <div onClick={fn}>
<a href="/page">               // NEVER <span onClick={navigate}>

// ✅ Hierarchical headings — DO NOT skip levels
<h1>Page title</h1>               // Only 1 per page
  <h2>Section</h2>
    <h3>Subsection</h3>
  <h2>Another section</h2>

// ❌ NEVER
<h1>Title</h1>
<h3>Skipping h2</h3>              // ❌ Screen readers use headings to navigate
<div className="text-2xl font-bold">Fake heading</div>  // ❌ Not a real heading
```

---

## 2. ARIA — Only When HTML Isn't Enough

```tsx
// ✅ ARIA Rule #1: Don't use ARIA if native HTML solves it
<button>Save</button>                    // ✅ No need for role="button"
<button aria-label="Close modal">✕</button> // ✅ Label for icon-only button

// ✅ aria-label: alternative text for elements without visible text
<button aria-label="Search products">
  <SearchIcon aria-hidden="true" />
</button>

// ✅ aria-labelledby: reference existing visible text
<dialog aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm deletion</h2>
  <p>Are you sure you want to delete this product?</p>
</dialog>

// ✅ aria-describedby: additional description (hints, errors)
<input
  id="email"
  type="email"
  aria-describedby="email-error email-hint"
/>
<p id="email-hint">We'll use this email for notifications</p>
<p id="email-error" role="alert">The email is not valid</p>

// ✅ aria-live: announce dynamic changes
<div aria-live="polite" aria-atomic="true">
  {notification && <p>{notification}</p>}
</div>

// ✅ aria-expanded: state of expandable elements
<button
  aria-expanded={isOpen}
  aria-controls="menu-items"
  onClick={() => setIsOpen(!isOpen)}
>
  Menu
</button>
<ul id="menu-items" hidden={!isOpen}>...</ul>

// ❌ NEVER: roles that contradict HTML semantics
<button role="link">...</button>           // ❌ Use <a>
<a role="button" onClick={fn}>...</a>      // ❌ Use <button>
```

---

## 3. Focus Management

```tsx
// ✅ Focus trap in modals
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

// ✅ Restore focus when closing modal
function Modal({ isOpen, onClose, children }: ModalProps) {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
    } else {
      triggerRef.current?.focus(); // Restore focus to original trigger
    }
  }, [isOpen]);

  // ...
}

// ✅ Skip navigation link
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4">
  Skip to main content
</a>
<main id="main-content" tabIndex={-1}>...</main>
```

---

## 4. Keyboard Navigation

```tsx
// ✅ All interactive elements MUST be reachable with Tab
// ✅ Actions with Enter/Space for buttons, Enter for links

// ✅ Keyboard patterns for complex widgets
// Tabs → Arrow keys to navigate, Tab to exit
// Menu → Arrow keys, Enter to select, Escape to close
// Dialog → Tab to navigate, Escape to close

// ✅ Visible focus indicators
// tailwind.config.ts or global CSS
// NEVER: outline-none without a visible replacement
<button className={cn(
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
  // ✅ focus-visible: only shows ring with keyboard, not with mouse
)}>
  Action
</button>

// ❌ NEVER remove outline without replacement
<button className="outline-none" />  // ❌ Keyboard users can't see the focus
```

---

## 5. Images and Media

```tsx
// ✅ Informative images — descriptive alt
<Image alt="Bar chart showing Q4 2025 sales with a 23% increase" src={chart} />

// ✅ Decorative images — empty alt + aria-hidden
<Image alt="" aria-hidden="true" src={decorativeLine} />
<SearchIcon aria-hidden="true" className="h-5 w-5" />

// ✅ Videos with captions
<video controls>
  <source src="demo.mp4" type="video/mp4" />
  <track kind="captions" src="captions-en.vtt" srcLang="en" label="English" default />
</video>

// ❌ NEVER generic alt
<Image alt="image" src={product} />     // ❌ Provides no information
<Image alt="photo" src={userAvatar} />  // ❌ Describe WHAT it shows
```

---

## 6. Accessible Forms

```tsx
// ✅ Associated label ALWAYS
<label htmlFor="email">Email address</label>
<input id="email" type="email" aria-required="true" />

// ✅ Group of related fields
<fieldset>
  <legend>Shipping address</legend>
  <label htmlFor="street">Street</label>
  <input id="street" />
  <label htmlFor="city">City</label>
  <input id="city" />
</fieldset>

// ✅ Accessible validation errors
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

// ❌ NEVER placeholder as the only label
<input placeholder="Email" />  // ❌ Disappears when typing, not accessible
```

---

## 7. Contrast and Color

```
WCAG 2.2 AA Requirements:
- Normal text: minimum ratio 4.5:1
- Large text (18px+ bold or 24px+): minimum ratio 3:1
- UI controls and graphics: minimum ratio 3:1
- NEVER convey information with color ONLY (use icon + text + color)
```

```tsx
// ✅ Error indicated with color + icon + text
<div className="flex items-center gap-2 text-red-600">
  <AlertCircleIcon aria-hidden="true" className="h-4 w-4" />
  <span>This field is required</span>
</div>

// ❌ Color only as indicator
<input className="border-red-500" />  // ❌ No visible error message
```

---

## 8. Accessibility Testing

```tsx
// ✅ axe-core in unit tests
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('LoginForm has no accessibility violations', async () => {
  const { container } = render(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

// ✅ Keyboard interaction testing
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

---

## a11y Checklist per Component

- [ ] Does it have a label/aria-label and is it descriptive?
- [ ] Is it navigable with Tab and activatable with Enter/Space?
- [ ] Does it have a visible focus indicator?
- [ ] Does the contrast meet 4.5:1 (text) / 3:1 (UI)?
- [ ] Are errors announced with role="alert"?
- [ ] Do images have a descriptive alt (or empty if decorative)?
- [ ] Do icons have aria-hidden="true" if decorative?
- [ ] Do modals handle focus trap and restore focus on close?
