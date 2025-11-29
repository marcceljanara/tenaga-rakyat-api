/*
  Warnings:

  - You are about to drop the column `idempotency_key` on the `withdraw_requests` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "withdraw_requests_idempotency_key_key";

-- AlterTable
ALTER TABLE "withdraw_requests" DROP COLUMN "idempotency_key";
