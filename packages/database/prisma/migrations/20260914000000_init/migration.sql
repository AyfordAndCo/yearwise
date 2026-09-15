-- Yearwise Phase 1 initial migration.
--
-- Generated with `prisma migrate diff --from-empty --to-schema-datamodel`,
-- then hand-extended with the invariants Prisma cannot express. Those additions
-- are marked "hand-written" below and are documented in
-- packages/database/prisma/schema.prisma.

-- hand-written: email is CITEXT, so the extension must exist before "User".
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CURRENT', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'LOAN');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "TransactionKind" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('POSTED', 'PENDING');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "weekStartDay" SMALLINT NOT NULL DEFAULT 1,
    "dateFormat" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "onboardingCompletedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "workspaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("workspaceId","userId")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "openingBalanceMinor" BIGINT NOT NULL,
    "openingDate" DATE NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "includeInNetWorth" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMPTZ(6),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "parentId" UUID,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "icon" TEXT,
    "colour" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMPTZ(6),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "kind" "TransactionKind" NOT NULL,
    "date" DATE NOT NULL,
    "payee" TEXT,
    "notes" TEXT,
    "recurringRuleId" UUID,
    "periodKey" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'POSTED',
    "transferGroupId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE INDEX "Account_workspaceId_isArchived_sortOrder_idx" ON "Account"("workspaceId", "isArchived", "sortOrder");

-- CreateIndex
CREATE INDEX "Category_workspaceId_type_parentId_sortOrder_idx" ON "Category"("workspaceId", "type", "parentId", "sortOrder");

-- CreateIndex
-- hand-written: NULLS NOT DISTINCT, so two root categories (parentId IS NULL) in
-- one workspace cannot share a name. Postgres treats NULLs as distinct by
-- default, which would let them. Requires Postgres 15+, which Supabase runs.
CREATE UNIQUE INDEX "Category_workspaceId_parentId_name_key"
  ON "Category"("workspaceId", "parentId", "name") NULLS NOT DISTINCT;

-- CreateIndex
CREATE INDEX "Transaction_workspaceId_date_id_idx" ON "Transaction"("workspaceId", "date" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "Transaction_workspaceId_categoryId_date_idx" ON "Transaction"("workspaceId", "categoryId", "date");

-- CreateIndex
CREATE INDEX "Transaction_workspaceId_accountId_date_idx" ON "Transaction"("workspaceId", "accountId", "date");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- hand-written: invariants Prisma cannot express in the schema DSL.
-- ---------------------------------------------------------------------------

-- I7. The sign of a transaction is not a convention, it is a constraint, and
-- this is the reason the ledger can be trusted. Without it a row whose kind and
-- amount disagree is storable, and every aggregate downstream is quietly wrong.
-- TRANSFER is reserved (A3) and carries no sign rule until Phase 2.
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_kind_sign_check" CHECK (
  ("kind" = 'INCOME'  AND "amountMinor" > 0) OR
  ("kind" = 'EXPENSE' AND "amountMinor" < 0) OR
  ("kind" = 'TRANSFER')
);

-- The week start is a day-of-week index, 0 = Sunday through 6 = Saturday.
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_weekStartDay_check"
  CHECK ("weekStartDay" BETWEEN 0 AND 6);

-- I9. Scheduler idempotency. Job runners get retried, deployed twice, or
-- replayed; without this constraint occurrences double-post and the user loses
-- trust in the ledger permanently. Partial, because the columns are null until
-- recurrence lands in Phase 2.
CREATE UNIQUE INDEX "Transaction_recurringRuleId_periodKey_key"
  ON "Transaction"("recurringRuleId", "periodKey")
  WHERE "recurringRuleId" IS NOT NULL;

