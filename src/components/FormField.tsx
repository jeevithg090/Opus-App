import React, { useId } from 'react';

interface FormFieldProps {
  label: string;
  /** Marks the field as required in the label (the control still needs `required`/validation). */
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  /** Receives the generated id and aria attributes to spread onto the control. */
  children: (props: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }) => React.ReactNode;
}

/** Label + control + hint/error, wired together for assistive technology. */
const FormField: React.FC<FormFieldProps> = ({ label, required, hint, error, className = '', children }) => {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {required && (
          <span className="ml-0.5 text-danger-ink" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={errorId} className="field-error">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="field-hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
};

export default FormField;
