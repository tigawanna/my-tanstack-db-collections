import { formOptions } from "@tanstack/react-form";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAppForm } from "@/lib/tanstack/form";

export type NoteFormValues = {
  title: string;
  status: "pending" | "complete";
};

const defaultNoteFormValues: NoteFormValues = {
  title: "",
  status: "pending",
};

const noteFormOptions = formOptions({
  defaultValues: defaultNoteFormValues,
});

interface NotesFormProps {
  defaultValues?: NoteFormValues;
  onSave: (values: NoteFormValues) => void | Promise<void>;
  isPending?: boolean;
  submitLabel?: string;
}

export function NotesForm({
  defaultValues = defaultNoteFormValues,
  onSave,
  isPending = false,
  submitLabel = "Save",
}: NotesFormProps) {
  const form = useAppForm({
    ...noteFormOptions,
    defaultValues,
    onSubmit: async ({ value }) => {
      await onSave(value);
    },
  });

  return (
    <form
      className="flex w-full flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.AppField
        name="title"
        validators={{
          onChange: ({ value }) => (!value.trim() ? "Title is required" : undefined),
        }}
      >
        {(field) => <field.TextField label="Title" />}
      </form.AppField>

      <form.AppField name="status">
        {(field) => (
          <field.SelectField
            label="Status"
            items={[
              { label: "Pending", value: "pending" },
              { label: "Complete", value: "complete" },
            ]}
          />
        )}
      </form.AppField>

      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ canSubmit, isSubmitting }) => {
          const disabled = isPending || isSubmitting || !canSubmit;
          const showSpinner = isPending || isSubmitting;

          return (
            <Button type="submit" disabled={disabled} className="w-full sm:w-auto">
              {showSpinner ? <Spinner /> : null}
              {submitLabel}
            </Button>
          );
        }}
      </form.Subscribe>
    </form>
  );
}
