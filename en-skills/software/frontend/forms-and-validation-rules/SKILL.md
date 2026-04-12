---
name: forms-and-validation-rules
description: >
  Form rules for React applications. Covers React Hook Form + Zod,
  client/server validation, multi-step forms, file upload, error UX,
  accessible forms, and Server Actions with useActionState.
---

# 📝 Forms and Validation

## Guiding Principle

> **Validate on both sides.** Shared Zod schema between client and server.
> React Hook Form for form state, Server Actions for mutations.

---

## 1. React Hook Form + Zod — Base Setup

```tsx
// features/products/schemas/product.schema.ts
// Schema shared between client and server
import { z } from 'zod';

export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Maximum 200 characters'),
  price: z
    .number({ invalid_type_error: 'Must be a number' })
    .positive('Price must be positive')
    .multipleOf(0.01, 'Maximum 2 decimals'),
  description: z
    .string()
    .max(2000, 'Maximum 2000 characters')
    .optional(),
  category: z.enum(['electronics', 'clothing', 'food'], {
    errorMap: () => ({ message: 'Select a category' }),
  }),
  tags: z
    .array(z.string().min(1))
    .min(1, 'Add at least one tag')
    .max(10, 'Maximum 10 tags'),
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
      {/* Text field */}
      <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
        <input
          id="name"
          {...register('name')}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className={cn('input', errors.name && 'border-red-500')}
        />
      </FormField>

      {/* Numeric field */}
      <FormField label="Price" htmlFor="price" error={errors.price?.message} required>
        <input
          id="price"
          type="number"
          step="0.01"
          {...register('price', { valueAsNumber: true })}
          aria-invalid={!!errors.price}
        />
      </FormField>

      {/* Select */}
      <FormField label="Category" htmlFor="category" error={errors.category?.message} required>
        <select id="category" {...register('category')} aria-invalid={!!errors.category}>
          <option value="">Select...</option>
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
          <option value="food">Food</option>
        </select>
      </FormField>

      <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
        Save product
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
  return { success: true, message: 'Product created successfully' };
}

// Component
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

      <Button type="submit" isLoading={isPending}>Create</Button>
    </form>
  );
}
```

---

## 3. Multi-Step Forms

```tsx
// ✅ Multi-step with React Hook Form + stepper
'use client';

import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Schema per step
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
    mode: 'onTouched', // Validate when field is touched
  });

  async function handleNext() {
    const currentSchema = STEPS[currentStep]!.schema;
    const fields = Object.keys(currentSchema.shape) as (keyof FullFormData)[];

    // Validate only the current step's fields
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
            <Button variant="ghost" onClick={handleBack}>Previous</Button>
          )}
          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext}>Next</Button>
          ) : (
            <Button type="submit" isLoading={methods.formState.isSubmitting}>
              Confirm
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
// ✅ Upload with preview and validation
'use client';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const fileSchema = z
  .instanceof(File)
  .refine((f) => f.size <= MAX_FILE_SIZE, 'Maximum 5MB')
  .refine((f) => ACCEPTED_TYPES.includes(f.type), 'Only JPG, PNG, or WebP');

export function ImageUpload({ onUpload }: { onUpload: (url: string) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = fileSchema.safeParse(file);
    if (!result.success) {
      setError(result.error.errors[0]?.message ?? 'Invalid file');
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
          <p className="text-sm text-gray-500">Click or drag an image</p>
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

## 5. Validation UX — Rules

```tsx
// ✅ Validation: mode 'onTouched' — show error on field blur
useForm({ mode: 'onTouched' });

// ✅ Errors disappear when corrected (onChange by default)
// ✅ Server errors are mapped to specific fields
// ✅ Auto-focus on first field with error

function focusFirstError(errors: FieldErrors) {
  const firstError = Object.keys(errors)[0];
  if (firstError) {
    document.getElementById(firstError)?.focus();
  }
}

// ✅ Error summary for a11y
{Object.keys(errors).length > 0 && (
  <div role="alert" className="rounded-md bg-red-50 p-4">
    <p className="font-medium text-red-800">
      Fix {Object.keys(errors).length} error(s):
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

## Anti-patterns

```tsx
// ❌ Client-only validation (server blindly trusts)
// ❌ useState for each field (use React Hook Form)
// ❌ onSubmit without preventing double-submit
// ❌ Errors that don't disappear when corrected
// ❌ Validation on onBlur without immediate feedback
// ❌ Generic error messages ("Invalid field")
// ❌ Form without noValidate (mixes native + custom validation)
// ❌ File upload without size or type limits
```
