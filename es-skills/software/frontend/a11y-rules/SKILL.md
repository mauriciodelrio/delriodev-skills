---
name: a11y-rules
description: >
  Usa esta skill cuando construyas o revises componentes React/Next.js que
  requieran cumplimiento WCAG 2.2 nivel AA: roles y atributos ARIA, gestión
  de focus, navegación por teclado, landmarks, live regions, formularios
  accesibles y testing automatizado (axe-core, Lighthouse).
---

# Accesibilidad (a11y) — WCAG 2.2 AA

## Flujo de trabajo del agente

1. Verificar semántica HTML antes de agregar ARIA (sección 1-2).
2. Implementar gestión de focus y navegación por teclado (sección 3-4).
3. Asegurar alt descriptivo en imágenes y captions en video (sección 5).
4. Aplicar labels, fieldset/legend y errores accesibles en formularios (sección 6).
5. Validar contraste mínimo 4.5:1 y no depender solo de color (sección 7).
6. Escribir tests con axe-core y validar interacción por teclado (sección 8).
7. Pasar checklist a11y por componente antes de commit.

## 1. Semántica HTML

```tsx
<header>...</header>
<nav aria-label="Principal">...</nav>
<main>...</main>
<article>...</article>
<aside>...</aside>
<footer>...</footer>
<button onClick={fn}>          // NUNCA <div onClick={fn}>
<a href="/page">               // NUNCA <span onClick={navigate}>

// Headings: NO saltar niveles — screen readers los usan para navegar
<h1>Título de página</h1>      // Solo 1 por página
  <h2>Sección</h2>
    <h3>Subsección</h3>

// ❌ Heading falso — invisible para screen readers
<div className="text-2xl font-bold">Falso heading</div>
```

## 2. ARIA — Solo Cuando HTML No Alcanza

```tsx
// Botón con solo ícono — necesita aria-label
<button aria-label="Cerrar modal">✕</button>

<button aria-label="Buscar productos">
  <SearchIcon aria-hidden="true" />
</button>

// aria-labelledby: referenciar texto visible (NO duplicar con aria-label)
<dialog aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirmar eliminación</h2>
</dialog>

// aria-describedby: hints y errores
<input id="email" type="email" aria-describedby="email-error email-hint" />
<p id="email-hint">Usaremos este email para notificaciones</p>
<p id="email-error" role="alert">El email no es válido</p>

// aria-live: cambios dinámicos
<div aria-live="polite" aria-atomic="true">
  {notification && <p>{notification}</p>}
</div>

// aria-expanded + aria-controls
<button aria-expanded={isOpen} aria-controls="menu-items">
  Menú
</button>
<ul id="menu-items" hidden={!isOpen}>...</ul>

// NUNCA contradecir semántica: <button role="link"> → usar <a>
```

## 3. Gestión de Focus

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

// Restaurar focus al cerrar modal
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
  Saltar al contenido principal
</a>
<main id="main-content" tabIndex={-1}>...</main>
```

## 4. Navegación por Teclado

```tsx
// Keyboard patterns por widget:
// Tabs → Arrow keys para navegar, Tab para salir
// Menu → Arrow keys, Enter para seleccionar, Escape para cerrar
// Dialog → Tab para navegar, Escape para cerrar

// Focus indicator — focus-visible muestra ring solo con teclado, no mouse
<button className={cn(
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
)}>
  Acción
</button>
```

## 5. Imágenes y Media

```tsx
// Informativa: alt describe el contenido
<Image alt="Gráfico de barras mostrando ventas Q4 2025 con aumento del 23%" src={chart} />

// Decorativa: alt vacío + aria-hidden
<Image alt="" aria-hidden="true" src={decorativeLine} />
<SearchIcon aria-hidden="true" className="h-5 w-5" />

// Video con captions
<video controls>
  <source src="demo.mp4" type="video/mp4" />
  <track kind="captions" src="captions-es.vtt" srcLang="es" label="Español" default />
</video>

// ❌ alt="imagen" o alt="foto" no aportan — describir QUÉ muestra
```

## 6. Formularios Accesibles

```tsx
<label htmlFor="email">Correo electrónico</label>
<input id="email" type="email" aria-required="true" />

// Grupo de campos relacionados
<fieldset>
  <legend>Dirección de envío</legend>
  <label htmlFor="street">Calle</label>
  <input id="street" />
  <label htmlFor="city">Ciudad</label>
  <input id="city" />
</fieldset>

// Patrón de errores accesibles
<label htmlFor="password">Contraseña</label>
<input
  id="password"
  type="password"
  aria-invalid={!!error}
  aria-describedby={error ? 'password-error' : 'password-hint'}
  aria-required="true"
/>
<p id="password-hint" className="text-sm text-gray-500">
  Mínimo 8 caracteres
</p>
{error && (
  <p id="password-error" className="text-sm text-red-600" role="alert">
    {error}
  </p>
)}

// NUNCA placeholder como único label — desaparece al escribir
<input placeholder="Email" />
```

## 7. Contraste y Color

```
Requisitos WCAG 2.2 AA:
- Texto normal: ratio mínimo 4.5:1
- Texto grande (18px+ bold o 24px+): ratio mínimo 3:1
- Controles de UI y gráficos: ratio mínimo 3:1
- NUNCA transmitir información SOLO con color (usar ícono + texto + color)
```

```tsx
// SIEMPRE: color + ícono + texto
<div className="flex items-center gap-2 text-red-600">
  <AlertCircleIcon aria-hidden="true" className="h-4 w-4" />
  <span>El campo es obligatorio</span>
</div>
```

## 8. Testing de Accesibilidad

```tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('LoginForm no tiene violaciones de accesibilidad', async () => {
  const { container } = render(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('modal cierra con Escape', async () => {
  const user = userEvent.setup();
  render(<Modal isOpen onClose={mockClose}>Contenido</Modal>);

  await user.keyboard('{Escape}');
  expect(mockClose).toHaveBeenCalled();
});

test('tab navega entre botones del modal', async () => {
  const user = userEvent.setup();
  render(<Modal isOpen><button>Cancelar</button><button>Aceptar</button></Modal>);

  await user.tab();
  expect(screen.getByText('Cancelar')).toHaveFocus();

  await user.tab();
  expect(screen.getByText('Aceptar')).toHaveFocus();
});
```

## Checklist a11y por Componente

- [ ] label/aria-label descriptivo
- [ ] Navegable con Tab, activable con Enter/Space
- [ ] Focus indicator visible
- [ ] Contraste 4.5:1 (texto) / 3:1 (UI)
- [ ] Errores con role="alert"
- [ ] Imágenes: alt descriptivo o vacío si decorativas
- [ ] Íconos decorativos: aria-hidden="true"
- [ ] Modales: focus trap + restaurar focus al cerrar

## Gotchas

- `aria-label` en elementos con texto visible crea doble lectura en screen readers — usa `aria-labelledby` referenciando el texto existente.
- `tabindex="0"` hace focusable un `<div>`, pero NO le da semántica de botón — necesitas también `role="button"` y handler de `Enter`/`Space`. Preferir `<button>` siempre.
- `outline-none` en Tailwind sin `ring-*` de reemplazo rompe la navegación por teclado silenciosamente — no hay error, simplemente el usuario no ve dónde está el focus.
- `aria-live="assertive"` interrumpe al usuario — reservar para errores críticos. Para notificaciones generales usar `"polite"`.
- `role="alert"` dispara anuncio inmediato al renderizar — si se renderiza condicionalmente con `{error && ...}` funciona bien, pero si el texto cambia dentro de un alert existente el screen reader puede ignorar el cambio.
- Un `<dialog>` nativo con `showModal()` maneja focus trap automáticamente — no reimplementar `useFocusTrap` si usas el elemento nativo.

## Skills Relacionadas

| Skill | Por qué |
|-------|--------|
| [`testing-rules`](../testing-rules/SKILL.md) | Tests de accesibilidad (queries por role, axe-core) |
| [`component-patterns`](../component-patterns/SKILL.md) | Compound components con roles semánticos |
| [`css-rules`](../css-rules/SKILL.md) | Contraste, focus indicators, prefers-reduced-motion |
| [`forms-and-validation-rules`](../forms-and-validation-rules/SKILL.md) | Labels, error messages accesibles, fieldset/legend |
| [`i18n-react-rules`](../i18n-react-rules/SKILL.md) / [`i18n-nextjs-rules`](../i18n-nextjs-rules/SKILL.md) | `lang` attribute, traducciones de aria-labels |
| [`design-system-build-components-rules`](../design-system-build-components-rules/SKILL.md) | A11y integrada en átomos, moléculas y organismos del DS |
