import { PrismaClient } from '@prisma/client';

/**
 * Single PrismaClient per process.
 *
 * Keeps one client alive across Next.js hot reloads and serverless warm
 * invocations instead of opening a connection per import. Postgres connection
 * limits are a known serverless failure mode - see
 * docs/01-architecture/tech-stack.md section 4.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from '@prisma/client';
