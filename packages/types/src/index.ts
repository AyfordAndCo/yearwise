/**
 * Shared contract types.
 *
 * BOUNDARY RULE (docs/01-architecture/monorepo.md): this package imports no
 * other workspace package. It may depend on `zod`, because tech-stack.md places
 * the API contracts here and a schema is a runtime value, not a type.
 *
 * What lives here:
 *   - the Zod schemas for every API request and response
 *   - the TypeScript types inferred from those schemas
 *
 * Money crosses this boundary as a string of minor units (A1, M4).
 */

export * from './account';
