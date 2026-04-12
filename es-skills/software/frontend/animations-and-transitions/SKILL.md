---
name: animations-and-transitions
description: >
  Reglas para animaciones y transiciones en aplicaciones React. Cubre Framer Motion,
  CSS transitions/animations, View Transitions API, loading skeletons,
  micro-interacciones, respeto a prefers-reduced-motion, y patrones de
  animación performantes (transform/opacity).
---

# ✨ Animaciones y Transiciones

## Principio Rector

> **Animación con propósito.** Cada animación DEBE comunicar un cambio de estado,
> guiar la atención o dar feedback. Respetar SIEMPRE `prefers-reduced-motion`.

---

## 1. Framer Motion — Patrones Base

```tsx
// ✅ Animación de entrada/salida con AnimatePresence
import { motion, AnimatePresence } from 'framer-motion';

function NotificationToast({ notifications }: { notifications: Notification[] }) {
  return (
    <div className="fixed bottom-4 right-4 space-y-2">
      <AnimatePresence mode="popLayout">
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="rounded-lg bg-white p-4 shadow-lg"
          >
            {n.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ✅ Variants reutilizables
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function PageSection({ children }: { children: ReactNode }) {
  return (
    <motion.section
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  );
}
```

### Animaciones de Lista

```tsx
// ✅ Stagger animation para listas
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

function AnimatedList({ items }: { items: Item[] }) {
  return (
    <motion.ul variants={containerVariants} initial="hidden" animate="visible">
      {items.map((item) => (
        <motion.li key={item.id} variants={itemVariants}>
          {item.name}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

### Layout Animations

```tsx
// ✅ Shared layout animation (expand/collapse, reorder)
function ExpandableCard({ item }: { item: Item }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      layout
      onClick={() => setIsExpanded(!isExpanded)}
      className="cursor-pointer rounded-lg bg-white p-4 shadow"
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
    >
      <motion.h3 layout="position">{item.title}</motion.h3>
      <AnimatePresence>
        {isExpanded && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {item.description}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

---

## 2. CSS Transitions — Para Interacciones Simples

```tsx
// ✅ Hover, focus, active — usar CSS transitions puras
<button
  className={cn(
    'transform rounded-lg bg-blue-600 px-4 py-2 text-white',
    'transition-all duration-200 ease-out',
    'hover:bg-blue-700 hover:shadow-md',
    'active:scale-[0.98]',
    'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
  )}
>
  Guardar
</button>

// ✅ Accordion con CSS transition (sin Framer Motion)
function Accordion({ isOpen, children }: { isOpen: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows] duration-300 ease-out',
        isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}
```

---

## 3. View Transitions API — Navegación Suave

```tsx
// ✅ View Transitions en Next.js (experimental)
'use client';

import { useRouter } from 'next/navigation';

export function TransitionLink({ href, children }: { href: string; children: ReactNode }) {
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();

    if (!document.startViewTransition) {
      router.push(href);
      return;
    }

    document.startViewTransition(() => {
      router.push(href);
    });
  }

  return <a href={href} onClick={handleClick}>{children}</a>;
}

// CSS para View Transitions
/* globals.css */
::view-transition-old(root) {
  animation: fade-out 200ms ease-out;
}
::view-transition-new(root) {
  animation: fade-in 200ms ease-in;
}

/* Transición específica para imágenes de producto */
.product-image {
  view-transition-name: product-hero;
}
```

---

## 4. Loading Skeletons

```tsx
// ✅ Skeleton que replica la estructura del contenido real
function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border bg-white p-4" aria-hidden="true">
      {/* Avatar + nombre */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-200" />
        <div className="space-y-1.5">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-3 w-20 rounded bg-gray-200" />
        </div>
      </div>
      {/* Contenido */}
      <div className="mt-4 space-y-2">
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-3/4 rounded bg-gray-200" />
      </div>
    </div>
  );
}

// ✅ Skeleton accesible con aria
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Cargando datos">
      <span className="sr-only">Cargando...</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b py-3" aria-hidden="true">
          <div className="h-4 w-1/4 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-1/4 animate-pulse rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
```

---

## 5. Respeto a prefers-reduced-motion

```tsx
// ✅ OBLIGATORIO: respetar preferencia del usuario
// Hook para detectar
function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);

    function handler(e: MediaQueryListEvent) { setPrefersReduced(e.matches); }
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

// ✅ Framer Motion respeta automáticamente con:
import { useReducedMotion } from 'framer-motion';
// O globalmente:
// <MotionConfig reducedMotion="user">

// ✅ CSS: desactivar animaciones para usuarios que lo piden
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## Reglas de Performance de Animaciones

```tsx
// ✅ SOLO animar propiedades compositas (GPU-accelerated)
// transform (translate, scale, rotate)
// opacity
// filter

// ❌ NUNCA animar directamente:
// width, height, top, left, margin, padding, border
// Estos causan layout reflow = jank

// ✅ Usar will-change con moderación
<div className="transition-transform will-change-transform hover:scale-105" />
// Solo en elementos que SABES que se van a animar

// ❌ NUNCA will-change en muchos elementos simultáneamente
```

---

## Anti-patrones

```tsx
// ❌ Animación sin propósito (solo decorativa)
// ❌ Animaciones > 300ms para interacciones (hover, click)
// ❌ Animar width/height directamente (usar transform: scale)
// ❌ Ignorar prefers-reduced-motion
// ❌ Framer Motion para hover simple (usar CSS transition)
// ❌ will-change en todo el DOM
// ❌ Autoplaying animations en mobile (consume batería)
```
