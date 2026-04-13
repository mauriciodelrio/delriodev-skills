---
name: animations-and-transitions
description: >
  Use this skill when implementing animations or transitions in React/Next.js:
  Framer Motion, CSS transitions, View Transitions API, loading skeletons,
  micro-interactions, prefers-reduced-motion, and performant animation
  patterns (transform/opacity).
---

# Animations and Transitions

## Agent Workflow

1. Determine if animation needs Framer Motion or CSS transition suffices (sections 1-2).
2. For page navigation evaluate View Transitions API (section 3).
3. Implement skeletons that replicate the real content structure (section 4).
4. Add prefers-reduced-motion support (section 5).
5. Animate ONLY composite properties: transform, opacity, filter (section 6).

## 1. Framer Motion

```tsx
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

// Reusable variants
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

### List Animations

```tsx
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

## 2. CSS Transitions — Simple Interactions

```tsx
<button
  className={cn(
    'transform rounded-lg bg-blue-600 px-4 py-2 text-white',
    'transition-all duration-200 ease-out',
    'hover:bg-blue-700 hover:shadow-md',
    'active:scale-[0.98]',
    'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
  )}
>
  Save
</button>

// Accordion with CSS grid transition (no Framer Motion)
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

## 3. View Transitions API

```tsx
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
```

```css
::view-transition-old(root) {
  animation: fade-out 200ms ease-out;
}
::view-transition-new(root) {
  animation: fade-in 200ms ease-in;
}

.product-image {
  view-transition-name: product-hero;
}
```

## 4. Loading Skeletons

```tsx
function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border bg-white p-4" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-200" />
        <div className="space-y-1.5">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-3 w-20 rounded bg-gray-200" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-3/4 rounded bg-gray-200" />
      </div>
    </div>
  );
}

// Accessible skeleton with role="status"
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading data">
      <span className="sr-only">Loading...</span>
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

## 5. prefers-reduced-motion

```tsx
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

// Framer Motion: use useReducedMotion or globally <MotionConfig reducedMotion="user">
import { useReducedMotion } from 'framer-motion';

// CSS: disable animations globally
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## 6. Performance

```tsx
// ONLY composite properties (GPU): transform, opacity, filter
// NEVER: width, height, top, left, margin, padding — cause layout reflow

// will-change only on elements that will animate
<div className="transition-transform will-change-transform hover:scale-105" />
```

## Gotchas

- `transition-all` animates ALL properties including reflow-causing ones — use `transition-[transform]` or `transition-opacity` specifically.
- Framer Motion for simple hover/focus is unnecessary overhead — CSS transitions are sufficient and more performant.
- `will-change` on many elements simultaneously consumes GPU memory — apply only on the element being animated, not parent containers.
- Animations > 300ms for direct interactions (click, hover) feel slow — use ~150-200ms for instant feedback.
- `height: auto` is not animatable with CSS — use `grid-rows-[0fr]/[1fr]` (accordion pattern from section 2) or Framer Motion.
- Autoplay animations on mobile drain battery — avoid infinite loops on elements outside viewport.
