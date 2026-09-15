import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormField } from '../src/form-field';
import { Input } from '../src/input';
import { ThemeProvider } from '../src/theme';

function renderField(props: Partial<React.ComponentProps<typeof FormField>> = {}) {
  return render(
    <ThemeProvider>
      <FormField label="Payee" {...props}>
        {(field) => <Input {...field} defaultValue="" />}
      </FormField>
    </ThemeProvider>,
  );
}

describe('FormField', () => {
  it('associates the label with the control it renders', () => {
    renderField();
    // getByLabelText only succeeds if htmlFor and the control's id agree.
    expect(screen.getByLabelText('Payee')).toBeInTheDocument();
  });

  it('describes the control with its hint', () => {
    renderField({ hint: 'Who was paid' });

    const input = screen.getByLabelText('Payee');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(document.getElementById(describedBy!)).toHaveTextContent('Who was paid');
  });

  it('marks the control invalid and announces the error', () => {
    renderField({ error: 'Enter a payee' });

    const input = screen.getByLabelText('Payee');
    expect(input).toHaveAttribute('aria-invalid', 'true');

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Enter a payee');
    expect(input.getAttribute('aria-describedby')).toContain(alert.id);
  });

  it('links both the hint and the error when both are present', () => {
    renderField({ hint: 'Who was paid', error: 'Enter a payee' });

    const describedBy = screen.getByLabelText('Payee').getAttribute('aria-describedby') ?? '';
    expect(describedBy.split(' ')).toHaveLength(2);
  });

  it('reports required to assistive technology, and marks it visually', () => {
    renderField({ required: true });

    expect(screen.getByLabelText(/Payee/)).toHaveAttribute('aria-required', 'true');
    // The asterisk is decorative; the requirement is carried by aria-required.
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });

  it('omits the invalid state when there is no error', () => {
    renderField({ hint: 'Who was paid' });

    expect(screen.getByLabelText('Payee')).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('passes a stable id to the control so a caller can target it', () => {
    renderField();
    expect(screen.getByLabelText('Payee').id).not.toBe('');
  });
});
