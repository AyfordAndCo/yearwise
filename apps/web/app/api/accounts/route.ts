import { NextResponse } from 'next/server';
import { accountInputSchema } from '@yearwise/types';
import { badRequest, serverError } from '@/lib/server/api';
import { createAccount, listAccounts } from '@/lib/server/accounts';

// Balances are derived per request, so this route is never statically rendered.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await listAccounts());
  } catch {
    return serverError();
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 });
  }

  const parsed = accountInputSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  try {
    return NextResponse.json(await createAccount(parsed.data), { status: 201 });
  } catch {
    return serverError();
  }
}
