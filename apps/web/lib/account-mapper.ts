import type { AccountDto, AccountInputDto } from '@yearwise/types';
import type { AccountInput, AccountView } from '@/lib/workspace-store';

/**
 * The API boundary, in one place.
 *
 * Money crosses it as a **string** of minor units (A1, M4) and is a `bigint`
 * everywhere inside the application. The conversion happens here and nowhere
 * else, so no component has to remember which side of the boundary it is on.
 */

export function toAccountView(dto: AccountDto): AccountView {
  return {
    id: dto.id,
    name: dto.name,
    type: dto.type,
    openingBalanceMinor: BigInt(dto.openingBalanceMinor),
    openingDate: dto.openingDate,
    includeInNetWorth: dto.includeInNetWorth,
    isArchived: dto.isArchived,
    balanceMinor: BigInt(dto.balanceMinor),
  };
}

export function toAccountInputDto(input: AccountInput): AccountInputDto {
  return {
    name: input.name,
    type: input.type,
    openingBalanceMinor: input.openingBalanceMinor.toString(),
    openingDate: input.openingDate,
    includeInNetWorth: input.includeInNetWorth,
  };
}

/** A field-level error from the API, ready to show on the matching input. */
export interface ApiFailure {
  error: string;
  fields?: Record<string, string>;
}

export async function readApiFailure(response: Response): Promise<ApiFailure> {
  try {
    const body = (await response.json()) as Partial<ApiFailure>;
    return {
      error: typeof body.error === 'string' ? body.error : 'Something went wrong',
      ...(body.fields === undefined ? {} : { fields: body.fields }),
    };
  } catch {
    return { error: 'Something went wrong' };
  }
}
