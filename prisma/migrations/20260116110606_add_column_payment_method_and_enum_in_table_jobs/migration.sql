-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('ESCROW_SYSTEM', 'CASH_OFFLINE');

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "payment_method" "PaymentMethod" NOT NULL DEFAULT 'ESCROW_SYSTEM';
