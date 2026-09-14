/**
 * Shared contract types.
 *
 * BOUNDARY RULE (docs/01-architecture/monorepo.md):
 * this package imports nothing. It is a leaf. If it needs a runtime value,
 * that value belongs in @yearwise/logic, not here.
 *
 * This package will hold:
 *   - the Zod schemas for every API request and response
 *   - TypeScript types inferred from those schemas
 *   - the shared enum unions: AccountType, TransactionKind, CategoryType
 *
 * They are not defined yet because no API exists. Defining them before the
 * data model is translated into schema.prisma would guarantee rework.
 */

export const TYPES_PACKAGE_PENDING = 'defined alongside the first API route';