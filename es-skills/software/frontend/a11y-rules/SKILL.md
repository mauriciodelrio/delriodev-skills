---
name: a11y-rules
description: >
  Reglas de accesibilidad web para aplicaciones React/Next.js. Cubre WCAG 2.2
  nivel AA, roles y atributos ARIA, gestión de focus, navegación por teclado,
  landmarks, live regions, formularios accesibles, y testing con herramientas
  automatizadas (axe-core, Lighthouse).
---

# ♿ Accesibilidad (a11y) — Reglas WCAG 2.2 AA

## Principio Rector

> **La accesibilidad NO es opcional.** Todo componente DEBE ser navegable por teclado,
> comprensible por screen readers, y cumplir contrast ratio mínimo de 4.5:1.

---

## 1. Semántica HTML — Primera Línea de Defensa

```tsx
// ✅ Usar elementos HTML semánticos ANTES de ARIA
<header>...</header>           // En vez de <div role="banner">
<nav aria-label="Principal">   // En vez de <div role="navigation">
<main>...</main>               // En vez de <div role="main">
<article>...</article>         // Contenido independiente
<aside>...</aside>             // Contenido complementario
<footer>...</footer>           // En vez de <div role="contentinfo">
<button onClick={fn}>          // NUNCA <div onClick={fn}>
<a href="/page">               // NUNCA <span onClick={navigate}>

// ✅ Headings jerárquicos — NO saltar niveles
<h1>Título de página</h1>         // Solo 1 por página
  <h2>Sección</h2>
    <h3>Subsección</h3>
  <h2>Otra sección</h2>

// ❌ NUNCA
<h1>Título</h1>
<h3>Saltando h2</h3>              // ❌ Screen readers usan headings para navegar
<div className="text-2xl font-bold">Falso heading</div>  // ❌ No es heading real
```

---

## 2. ARIA — Solo Cuando HTML No Alcanza

```tsx
// ✅ Regla #1 de ARIA: No usar ARIA si HTML nativo lo resuelve
<button>Guardar</button>                    // ✅ No necesita role="button"
<button aria-label="Cerrar modal">✕</button> // ✅ Label para botón con solo ícono

// ✅ aria-label: texto alternativo para elementos sin texto visible
<button aria-label="Buscar productos">
  <SearchIcon aria-hidden="true" />
</button>

// ✅ aria-labelledby: referenciar texto visible existente
<dialog aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirmar eliminación</h2>
  <p>¿Estás seguro de que quieres eliminar este producto?</p>
</dialog>

// ✅ aria-describedby: descripción adicional (hints, errores)
<input
  id="email"
  type="email"
  aria-describedby="email-error email-hint"
/>
<p id="email-hint">Usaremos este email para notificaciones</p>
<p id="email-error" role="alert">El email no es válido</p>

// ✅ aria-live: anunciar cambios dinámicos
<div aria-live="polite" aria-atomic="true">
  {notification && <p>{notification}</p>}
</div>

// ✅ aria-expanded: estado de elementos expandibles
<button
  aria-expanded={isOpen}
  aria-controls="menu-items"
  onClick={() => setIsOpen(!isOpen)}
>
  Menú
</button>
<ul id="menu-items" hidden={!isOpen}>...</ul>

// ❌ NUNCA: roles que contradicen la semántica HTML
<button role="link">...</button>           // ❌ Usar <a>
<a role="button" onClick={fn}>...</a>      // ❌ Usar <button>
```

---

## 3. Gestión de Focus

```tsx
// ✅ Focus trap en modales
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

    // Focus primer elemento al abrir
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

// ✅ Restaurar focus al cerrar modal
function Modal({ isOpen, onClose, children }: ModalProps) {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
    } else {
      triggerRef.current?.focus(); // Restaurar focus al trigger original
    }
  }, [isOpen]);

  // ...
}

// ✅ Skip navigation link
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4">
  Saltar al contenido principal
</a>
<main id="main-content" tabIndex={-1}>...</main>
```

---

## 4. Navegación por Teclado

```tsx
// ✅ Todos los interactivos DEBEN ser alcanzables con Tab
// ✅ Acciones con Enter/Space para buttons, Enter para links

// ✅ Keyboard patterns para widgets complejos
// Tabs → Arrow keys para navegar, Tab para salir
// Menu → Arrow keys, Enter para seleccionar, Escape para cerrar
// Dialog → Tab para navegar, Escape para cerrar

// ✅ Indicadores de focus visibles
// tailwind.config.ts o global CSS
// NUNCA: outline-none sin reemplazo visible
<button className={cn(
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
  // ✅ focus-visible: solo muestra ring con teclado, no con mouse
)}>
  Acción
</button>

// ❌ NUNCA quitar outline sin reemplazo
<button className="outline-none" />  // ❌ Usuarios de teclado no ven el focus
```

---

## 5. Imágenes y Media

```tsx
// ✅ Imágenes informativas — alt descriptivo
<Image alt="Gráfico de barras mostrando ventas Q4 2025 con aumento del 23%" src={chart} />

// ✅ Imágenes decorativas — alt vacío + aria-hidden
<Image alt="" aria-hidden="true" src={decorativeLine} />
<SearchIcon aria-hidden="true" className="h-5 w-5" />

// ✅ Videos con subtítulos
<video controls>
  <source src="demo.mp4" type="video/mp4" />
  <track kind="captions" src="captions-es.vtt" srcLang="es" label="Español" default />
</video>

// ❌ NUNCA alt genérico
<Image alt="imagen" src={product} />     // ❌ No aporta información
<Image alt="foto" src={userAvatar} />    // ❌ Describir QUÉ muestra
```

---

## 6. Formularios Accesibles

```tsx
// ✅ Label asociado SIEMPRE
<label htmlFor="email">Correo electrónico</label>
<input id="email" type="email" aria-required="true" />

// ✅ Grupo de campos relacionados
<fieldset>
  <legend>Dirección de envío</legend>
  <label htmlFor="street">Calle</label>
  <input id="street" />
  <label htmlFor="city">Ciudad</label>
  <input id="city" />
</fieldset>

// ✅ Errores de validación accesibles
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

// ❌ NUNCA placeholder como único label
<input placeholder="Email" />  // ❌ Desaparece al escribir, no accesible
```

---

## 7. Contraste y Color

```
Requisitos WCAG 2.2 AA:
- Texto normal: ratio mínimo 4.5:1
- Texto grande (18px+ bold o 24px+): ratio mínimo 3:1
- Controles de UI y gráficos: ratio mínimo 3:1
- NUNCA transmitir información SOLO con color (usar ícono + texto + color)
```

```tsx
// ✅ Error indicado con color + ícono + texto
<div className="flex items-center gap-2 text-red-600">
  <AlertCircleIcon aria-hidden="true" className="h-4 w-4" />
  <span>El campo es obligatorio</span>
</div>

// ❌ Solo color como indicador
<input className="border-red-500" />  // ❌ Sin mensaje de error visible
```

---

## 8. Testing de Accesibilidad

```tsx
// ✅ axe-core en tests unitarios
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('LoginForm no tiene violaciones de accesibilidad', async () => {
  const { container } = render(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

// ✅ Testing de interacción por teclado
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

---

## Checklist a11y por Componente

- [ ] ¿Tiene label/aria-label y es descriptivo?
- [ ] ¿Es navegable con Tab y activable con Enter/Space?
- [ ] ¿Tiene focus indicator visible?
- [ ] ¿El contraste cumple 4.5:1 (texto) / 3:1 (UI)?
- [ ] ¿Los errores se anuncian con role="alert"?
- [ ] ¿Las imágenes tienen alt descriptivo (o vacío si decorativas)?
- [ ] ¿Los íconos tienen aria-hidden="true" si son decorativos?
- [ ] ¿Los modales manejan focus trap y restauran focus al cerrar?
