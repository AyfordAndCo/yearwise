import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';
import type { ApiErrorDto } from '@yearwise/types';

/**
 * The single error shape every route handler returns, so a client has one thing
 * to parse and a form can attach messages to the right input.
 */
export function badRequest(error: ZodError): NextResponse<ApiErrorDto> {
  const fieldErrors = error.flatten().fieldErrors;

  const fields: Record<string, string> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    const first = Array.isArray(messages) ? messages[0] : undefined;
    fields[key] = first ?? 'Invalid';
  }

  return NextResponse.json({ error: 'Invalid request', fields }, { status: 400 });
}

export function notFound(message: string): NextResponse<ApiErrorDto> {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(): NextResponse<ApiErrorDto> {
  // Never leak a driver message to the client.
  return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
}
