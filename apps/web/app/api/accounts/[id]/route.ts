import { NextResponse } from 'next/server';
import { z } from 'zod';
import { accountInputSchema } from '@yearwise/types';
import { badRequest, notFound, serverError } from '@/lib/server/api';
import { setAccountArchived, updateAccount } from '@/lib/server/accounts';

export const dynamic = 'force-dynamic';

const archiveSchema = z.object({ isArchived: z.boolean() });

/**
 * One PATCH for both mutations, because they are both "change this account" and
 * a client should not need two endpoints for one resource.
 *
 *   { isArchived: true }   archive or unarchive - flips a flag only (I10)
 *   { name, type, ... }    full field update
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 });
  }

  const archive = archiveSchema.safeParse(body);

  try {
    if (archive.success) {
      return NextResponse.json(await setAccountArchived(id, archive.data.isArchived));
    }

    const parsed = accountInputSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error);

    return NextResponse.json(await updateAccount(id, parsed.data));
  } catch (error) {
    if (error instanceof Error && error.message === 'Account not found') {
      return notFound('Account not found');
    }
    return serverError();
  }
}
