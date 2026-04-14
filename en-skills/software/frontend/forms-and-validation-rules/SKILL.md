---
name: forms-and-validation-rules
description: >
  Use this skill when implementing forms in React:
  React Hook Form + Zod, client/server validation, multi-step,
  file upload, error UX, accessibility, and Server Actions
  with useActionState.
---

# Forms and Validation

## Agent workflow

1. Define shared Zod schema for client/server (section 1).
2. Wire React Hook Form with zodResolver and accessible `FormField` component.
3. Server Action with useActionState for mutations (section 2).
4. Multi-step: schema per step, `trigger(fields)` for partial validation (section 3).
5. File upload: validate size/type with Zod, preview with `URL.createObjectURL` (section 4).
6. UX: mode `onTouched`, focus first error, accessible error summary (section 5).

## 1. React Hook Form + Zod — Base Setup

```tsx
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
      <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
        <input
          id="name"
          {...register('name')}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className={cn('input', errors.name && 'border-red-500')}
        />
      </FormField>

      <FormField label="Price" htmlFor="price" error={errors.price?.message} required>
        <input
          id="price"
          type="number"
          step="0.01"
          {...register('price', { valueAsNumber: true })}
          aria-invalid={!!errors.price}
        />
      </FormField>

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

## 2. Server Action + useActionState

```tsx
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

## 2B. SPA Mutation — React Hook Form + TanStack Query (Vite)

In an SPA without Server Actions, forms use `useMutation` from TanStack Query as the submit layer:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { personSchema, type PersonFormData } from '../schemas/person.schema';
import { personsApi } from '../services/persons.service';
import { personKeys } from '../hooks/usePersons';
import type { ApiError } from '@shared/lib/api-client';

export function CreatePersonForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
  });

  const mutation = useMutation({
    mutationFn: personsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.lists() });
      onSuccess?.();
    },
    onError: (error: ApiError) => {
      // Map backend validation errors to form fields
      if (error.errors) {
        for (const [field, messages] of Object.entries(error.errors)) {
          setError(field as keyof PersonFormData, { message: messages[0] });
        }
      }
    },
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} noValidate>
      <input {...register('name')} />
      {errors.name && <p className="text-red-600" role="alert">{errors.name.message}</p>}

      <input {...register('email')} type="email" />
      {errors.email && <p className="text-red-600" role="alert">{errors.email.message}</p>}

      {mutation.error && !mutation.error.errors && (
        <p className="text-red-600" role="alert">{mutation.error.message}</p>
      )}

      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Create person'}
      </button>
    </form>
  );
}
```

**Key rules:**
- Client-side validation with Zod + RHF (immediate UX), re-validation on server (security).
- `setError` maps 422 backend errors to individual fields.
- `isPending` disables the button to prevent double-submit.
- `invalidateQueries` automatically refreshes the list after creation.

## 3. Multi-Step Forms

```tsx
'use client';

import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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
    mode: 'onTouched',
  });

  async function handleNext() {
    const currentSchema = STEPS[currentStep]!.schema;
    const fields = Object.keys(currentSchema.shape) as (keyof FullFormData)[];

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

## 4. File Upload

```tsx
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

## 5. Validation UX

```tsx
useForm({ mode: 'onTouched' });

function focusFirstError(errors: FieldErrors) {
  const firstError = Object.keys(errors)[0];
  if (firstError) {
    document.getElementById(firstError)?.focus();
  }
}

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

## Gotchas

- Client-only validation without server revalidation allows malicious data — use the same Zod schema on both sides.
- `useState` per form field is a poor reimplementation of React Hook Form — use `useForm` + `register`.
- `onSubmit` without disabling the button allows double-submit — use `isSubmitting` for disabled.
- Errors that don’t clear when corrected frustrate users — RHF clears them on `onChange` by default.
- Generic messages ("Invalid field") are unhelpful — Zod supports specific messages per validation.
- Form without `noValidate` mixes browser native validation with custom — always add `noValidate`.
- File upload without size or type limits is a security risk — validate with Zod refine.

## Related skills

- [`testing-rules`](../testing-rules/SKILL.md) — tests with userEvent + queries by label
- [`a11y-rules`](../a11y-rules/SKILL.md) — labels, accessible error messages, fieldset
- [`i18n-react-rules`](../i18n-react-rules/SKILL.md) / [`i18n-nextjs-rules`](../i18n-nextjs-rules/SKILL.md) — translated validation messages
- [`security-rules`](../security-rules/SKILL.md) — input sanitization, XSS prevention
