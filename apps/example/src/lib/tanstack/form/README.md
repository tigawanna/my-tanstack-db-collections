# TanStack Form Implementation

This directory contains the modern TanStack Form implementation using the **Form Composition** pattern.

## Architecture

The form system follows TanStack Form's recommended composition pattern, providing:

- Type-safe, reusable field components
- Centralized form context
- Pre-bound field and form components
- Minimal boilerplate

## File Structure

```
form/
├── form-context.ts          # Creates form and field contexts
├── field-components.tsx     # Reusable field components (TextField, PasswordField, etc.)
├── form-components.tsx      # Form-level components (SubmitButton, etc.)
└── index.ts                 # Main export file with createFormHook
```

## Core Concepts

### 1. Form Context (`form-context.ts`)

Creates the shared contexts for forms and fields across your application:

```typescript
export const { fieldContext, useFieldContext, formContext, useFormContext } =
  createFormHookContexts();
```

### 2. Field Components (`field-components.tsx`)

Pre-bound field components that use `useFieldContext` to access field state:

- `TextField` - Standard text input
- `PasswordField` - Password input with show/hide toggle
- `EmailField` - Email input with validation
- `TextAreaField` - Multi-line text input

Each component:

- Automatically handles value binding, onChange, and onBlur
- Displays validation errors
- Supports custom labels and placeholders
- Accepts all standard HTML input props

### 3. Form Components (`form-components.tsx`)

Form-level components that use `useFormContext`:

- `SubmitButton` - Reactive submit button that disables when form is invalid or submitting

### 4. Form Hook (`index.ts`)

Creates the `useAppForm` hook with all components registered:

```typescript
export const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    PasswordField,
    TextAreaField,
    EmailField,
  },
  formComponents: {
    SubmitButton,
  },
});
```

## Usage

### Basic Form

```typescript
import { useAppForm } from "@/lib/tanstack/form";
import { formOptions } from "@tanstack/react-form";
import { z } from "zod";

interface LoginForm {
  email: string;
  password: string;
}

const formOpts = formOptions({
  defaultValues: {
    email: "",
    password: "",
  } satisfies LoginForm,
});

function LoginForm() {
  const form = useAppForm({
    ...formOpts,
    onSubmit: async ({ value }) => {
      const data = value as LoginForm;
      await api.login(data);
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      form.handleSubmit();
    }}>
      {/* Use AppField instead of Field for pre-bound components */}
      <form.AppField
        name="email"
        validators={{
          onChange: z.string().email("Invalid email"),
        }}
      >
        {(field) => <field.EmailField />}
      </form.AppField>

      <form.AppField
        name="password"
        validators={{
          onChange: z.string().min(8, "Password must be at least 8 characters"),
        }}
      >
        {(field) => <field.PasswordField showPassword={showPassword} />}
      </form.AppField>

      {/* Use AppForm wrapper for form-level components */}
      <form.AppForm>
        <form.SubmitButton label="Sign in" />
      </form.AppForm>
    </form>
  );
}
```

### Field Component Props

All field components accept these base props:

```typescript
interface BaseFieldProps {
  label?: string;           // Custom label (defaults to field name)
  placeholder?: string;     // Custom placeholder
  className?: string;       // Additional CSS classes
  ...inputProps            // All standard HTML input props
}
```

### Custom Field Components

Create your own field components using `useFieldContext`:

```typescript
import { useFieldContext } from "@/lib/tanstack/form";

function CustomField({ label }: { label: string }) {
  const field = useFieldContext<string>();

  return (
    <div>
      <label>{label}</label>
      <input
        value={field.state.value ?? ""}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
      {field.state.meta.errors.length > 0 && (
        <span className="error">{field.state.meta.errors.join(", ")}</span>
      )}
    </div>
  );
}
```

Then register it in `index.ts`:

```typescript
export const { useAppForm } = createFormHook({
  fieldComponents: {
    TextField,
    CustomField, // Add your component
  },
  // ...
});
```

## Benefits

1. **Less Boilerplate**: No need to repeat onChange, onBlur, value binding, or error display logic
2. **Type Safety**: Full TypeScript support with inferred types
3. **Reusability**: Write field UI once, use everywhere
4. **Consistency**: All forms use the same field components
5. **Maintainability**: Easy to update field styling or behavior globally

## Migration from Old Pattern

The old pattern (TextFormField, etc.) required:

- Passing `field`, `fieldKey`, `fieldlabel`, `inputOptions` as props
- Manual onChange handlers
- Repetitive field configuration

The new pattern simplifies this to:

```typescript
// Old way
<form.Field name="email" validators={{ ... }}>
  {(field) => (
    <TextFormField
      field={field}
      fieldKey="email"
      inputOptions={{
        onBlur: field.handleBlur,
        onChange: (e) => field.handleChange(e.target.value),
      }}
    />
  )}
</form.Field>

// New way
<form.AppField name="email" validators={{ ... }}>
  {(field) => <field.EmailField />}
</form.AppField>
```

## Resources

- [TanStack Form Documentation](https://tanstack.com/form/latest)
- [Form Composition Guide](https://tanstack.com/form/latest/docs/framework/react/guides/form-composition)
