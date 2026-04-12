---
name: forms-and-validation-rules
description: >
  Reglas para formularios en aplicaciones React. Cubre React Hook Form + Zod,
  validación client/server, formularios multi-step, file upload, UX de errores,
  formularios accesibles, y Server Actions con useActionState.
---

# 📝 Formularios y Validación

## Principio Rector

> **Validar en ambos lados.** Zod schema compartido entre client y server.
> React Hook Form para estado del form, Server Actions para mutaciones.

---

## 1. React Hook Form + Zod — Setup Base

```tsx
// features/products/schemas/product.schema.ts
// Schema compartido entre client y server
import { z } from 'zod';

export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(200, 'Máximo 200 caracteres'),
  price: z
    .number({ invalid_type_error: 'Debe ser un número' })
    .positive('El precio debe ser positivo')
    .multipleOf(0.01, 'Máximo 2 decimales'),
  description: z
    .string()
    .max(2000, 'Máximo 2000 caracteres')
    .optional(),
  category: z.enum(['electronics', 'clothing', 'food'], {
    errorMap: () => ({ message: 'Selecciona una categoría' }),
  }),
  tags: z
    .array(z.string().min(1))
    .min(1, 'Agrega al menos un tag')
    .max(10, 'Máximo 10 tags'),
});

export type ProductFormData = z.infer<typeof productSchema>;
```

```tsx
// features/products/components/ProductForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormData } from '../schemas/product.schema';

export function ProductForm({ onSubmit }: { onSubmit: (data: ProductFormData) => Promise<void> }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      price: 0,
      description: '',
      category: undefined,
      tags: [],
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Campo texto */}
      <FormField label="Nombre" htmlFor="name" error={errors.name?.message} required>
        <input
          id="name"
          {...register('name')}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className={cn('input', errors.name && 'border-red-500')}
        />
      </FormField>

      {/* Campo numérico */}
      <FormField label="Precio" htmlFor="price" error={errors.price?.message} required>
        <input
          id="price"
          type="number"
          step="0.01"
          {...register('price', { valueAsNumber: true })}
          aria-invalid={!!errors.price}
        />
      </FormField>

      {/* Select */}
      <FormField label="Categoría" htmlFor="category" error={errors.category?.message} required>
        <select id="category" {...register('category')} aria-invalid={!!errors.category}>
          <option value="">Seleccionar...</option>
          <option value="electronics">Electrónica</option>
          <option value="clothing">Ropa</option>
          <option value="food">Alimentos</option>
        </select>
      </FormField>

      <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
        Guardar producto
      </Button>
    </form>
  );
}
```

---

## 2. Server Action + useActionState

```tsx
// features/products/actions/createProduct.ts
'use server';

import { productSchema } from '../schemas/product.schema';
import { revalidatePath } from 'next/cache';

interface ActionState {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
}

export async function createProductAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = {
    name: formData.get('name'),
    price: Number(formData.get('price')),
    description: formData.get('description') || undefined,
    category: formData.get('category'),
    tags: formData.getAll('tags').filter(Boolean),
  };

  const parsed = productSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await db.product.create({ data: parsed.data });

  revalidatePath('/products');
  return { success: true, message: 'Producto creado exitosamente' };
}

// Componente
'use client';

import { useActionState } from 'react';
import { createProductAction } from '../actions/createProduct';

export function CreateProductForm() {
  const [state, action, isPending] = useActionState(createProductAction, {});

  return (
    <form action={action}>
      <input name="name" />
      {state.errors?.name && (
        <p className="text-red-600" role="alert">{state.errors.name[0]}</p>
      )}

      {state.success && (
        <p className="text-green-600" role="status">{state.message}</p>
      )}

      <Button type="submit" isLoading={isPending}>Crear</Button>
    </form>
  );
}
```

---

## 3. Formularios Multi-Step

```tsx
// ✅ Multi-step con React Hook Form + stepper
'use client';

import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Schema por paso
const step1Schema = z.object({ name: z.string().min(1), email: z.string().email() });
const step2Schema = z.object({ address: z.string().min(1), city: z.string().min(1) });
const step3Schema = z.object({ cardNumber: z.string(), expiry: z.string() });

const fullSchema = step1Schema.merge(step2Schema).merge(step3Schema);
type FullFormData = z.infer<typeof fullSchema>;

const STEPS = [
  { schema: step1Schema, component: PersonalInfo },
  { schema: step2Schema, component: Address },
  { schema: step3Schema, component: Payment },
] as const;

export function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const methods = useForm<FullFormData>({
    resolver: zodResolver(fullSchema),
    mode: 'onTouched', // Validar al tocar el campo
  });

  async function handleNext() {
    const currentSchema = STEPS[currentStep]!.schema;
    const fields = Object.keys(currentSchema.shape) as (keyof FullFormData)[];

    // Validar solo los campos del paso actual
    const isValid = await methods.trigger(fields);
    if (isValid) setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handleBack() {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  const StepComponent = STEPS[currentStep]!.component;

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        {/* Progress indicator */}
        <StepIndicator current={currentStep} total={STEPS.length} />

        <StepComponent />

        <div className="flex justify-between mt-6">
          {currentStep > 0 && (
            <Button variant="ghost" onClick={handleBack}>Anterior</Button>
          )}
          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext}>Siguiente</Button>
          ) : (
            <Button type="submit" isLoading={methods.formState.isSubmitting}>
              Confirmar
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
```

---

## 4. File Upload

```tsx
// ✅ Upload con preview y validación
'use client';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const fileSchema = z
  .instanceof(File)
  .refine((f) => f.size <= MAX_FILE_SIZE, 'Máximo 5MB')
  .refine((f) => ACCEPTED_TYPES.includes(f.type), 'Solo JPG, PNG o WebP');

export function ImageUpload({ onUpload }: { onUpload: (url: string) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = fileSchema.safeParse(file);
    if (!result.success) {
      setError(result.error.errors[0]?.message ?? 'Archivo inválido');
      return;
    }

    setError(null);
    setPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    const { url } = await response.json();
    onUpload(url);
  }

  return (
    <div>
      <label
        htmlFor="file-upload"
        className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed p-8 hover:bg-gray-50"
      >
        {preview ? (
          <img src={preview} alt="Preview" className="h-32 w-32 rounded object-cover" />
        ) : (
          <p className="text-sm text-gray-500">Click o arrastra una imagen</p>
        )}
        <input
          id="file-upload"
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleChange}
          className="sr-only"
        />
      </label>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );
}
```

---

## 5. UX de Validación — Reglas

```tsx
// ✅ Validación: mode 'onTouched' — muestra error al salir del campo
useForm({ mode: 'onTouched' });

// ✅ Errores desaparecen al corregir (onChange por defecto)
// ✅ Errores de server se mapean a campos específicos
// ✅ Focus automático en primer campo con error

function focusFirstError(errors: FieldErrors) {
  const firstError = Object.keys(errors)[0];
  if (firstError) {
    document.getElementById(firstError)?.focus();
  }
}

// ✅ Resumen de errores para a11y
{Object.keys(errors).length > 0 && (
  <div role="alert" className="rounded-md bg-red-50 p-4">
    <p className="font-medium text-red-800">
      Corrige {Object.keys(errors).length} error(es):
    </p>
    <ul className="list-disc pl-5 text-sm text-red-700">
      {Object.entries(errors).map(([field, error]) => (
        <li key={field}>
          <a href={`#${field}`}>{error?.message}</a>
        </li>
      ))}
    </ul>
  </div>
)}
```

---

## Anti-patrones

```tsx
// ❌ Validación solo en client (server confía ciegamente)
// ❌ useState para cada campo (usar React Hook Form)
// ❌ onSubmit sin prevenir doble-submit
// ❌ Errores que no desaparecen al corregir
// ❌ Validación en onBlur sin feedback inmediato
// ❌ Mensajes de error genéricos ("Campo inválido")
// ❌ Form sin noValidate (mezcla validación nativa + custom)
// ❌ File upload sin límite de tamaño ni tipo
```

---

## Skills Relacionadas

> **Consultar el índice maestro [`frontend/SKILL.md`](../SKILL.md) → "Skills Obligatorias por Acción"** para formularios.

| Skill | Por qué |
|-------|--------|
| `testing-rules` | Tests de formularios con userEvent + queries por label |
| `a11y-rules` | Labels asociados, error messages accesibles, fieldset |
| `i18n-rules` | Mensajes de validación traducidos |
| `security-rules` | Sanitización de inputs, XSS prevention |
| `backend/data-validation` | Schemas Zod compartidos entre cliente y servidor |
