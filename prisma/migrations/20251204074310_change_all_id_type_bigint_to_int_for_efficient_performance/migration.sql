/*
  Warnings:

  - You are about to alter the column `reference_id` on the `platform_transactions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterTable
ALTER TABLE "platform_transactions" ALTER COLUMN "reference_id" SET DATA TYPE INTEGER;
