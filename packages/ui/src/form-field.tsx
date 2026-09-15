'use client';

import { useId } from 'react';
import type { ReactNode } from 'react';
import { useTheme } from './theme';
import { tokens } from './tokens';

/** The wiring a control must spread onto itself to be correctly described. */
export interface FormFieldControlProps {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
  'aria-required': true | undefined;
}

export interface FormFieldProps {
  label: string;
  /**
   * Receives the wiring props. Spread them onto the control:
   *
   * ```tsx
   * <FormField label="Payee" error={errors.payee}>
   *   {(field) => <Input {...field} value={payee} onChange={...} />}
   * </FormField>
   * ```
   *
   * A render prop rather than a child element, because it is the only way to
   * guarantee the label, error and hint are linked on whatever control is used.
   * Hand-wiring `aria-describedby` per screen is precisely the failure this
   * component exists to prevent.
   */
  children: (control: FormFieldControlProps) => ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
}

/**
 * Label, control, hint and error in one component.
 *
 * Owns the accessibility contract for every field: a visible label at all times
 * (never placeholder-as-label), `aria-describedby` linking both the hint and the
 * error, `aria-invalid` on failure, and `role="alert"` so a validation message
 * is announced when it appears.
 */
export function FormField({
  label,
  children,
  hint,
  error,
  required = false,
}: FormFieldProps) {
  const { colours } = useTheme();
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [
    error === undefined ? undefined : errorId,
    hint === undefined ? undefined : hintId,
  ]
    .filter((value): value is string => value !== undefined)
    .join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
      <label
        htmlFor={id}
        style={{
          fontSize: tokens.typeScale.xs,
          fontWeight: 500,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: colours.muted,
        }}
      >
        {label}
        {required && (
          <span aria-hidden="true" style={{ color: colours.danger }}>
            {' *'}
          </span>
        )}
      </label>

      {children({
        id,
        'aria-describedby': describedBy === '' ? undefined : describedBy,
        'aria-invalid': error === undefined ? undefined : true,
        'aria-required': required ? true : undefined,
      })}

      {hint !== undefined && (
        <span id={hintId} style={{ fontSize: tokens.typeScale.sm, color: colours.muted }}>
          {hint}
        </span>
      )}

      {error !== undefined && (
        <span
          id={errorId}
          role="alert"
          style={{ fontSize: tokens.typeScale.sm, color: colours.danger }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
