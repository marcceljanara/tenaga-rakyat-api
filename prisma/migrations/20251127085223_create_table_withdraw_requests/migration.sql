-- CreateEnum
CREATE TYPE "WithdrawStatus" AS ENUM ('PENDING', 'PROCESSING', 'APPROVED', 'REJECTED', 'SENT');

-- AlterTable
ALTER TABLE "withdraw_methods" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "account_number" SET DATA TYPE VARCHAR(255);

-- CreateTable
CREATE TABLE "withdraw_requests" (
    "id" SERIAL NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "user_id" TEXT NOT NULL,
    "method_id" INT NOT NULL,
    "status" "WithdrawStatus" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" TEXT,
    "admin_locked_by" TEXT,
    "admin_approved_by" TEXT,
    "admin_rejected_by" TEXT,
    "admin_note" VARCHAR(255),
    "transfer_receipt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdraw_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "withdraw_requests_idempotency_key_key" ON "withdraw_requests"("idempotency_key");

-- AddForeignKey
ALTER TABLE "withdraw_requests" ADD CONSTRAINT "withdraw_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraw_requests" ADD CONSTRAINT "withdraw_requests_method_id_fkey" FOREIGN KEY ("method_id") REFERENCES "withdraw_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraw_requests" ADD CONSTRAINT "withdraw_requests_admin_locked_by_fkey" FOREIGN KEY ("admin_locked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraw_requests" ADD CONSTRAINT "withdraw_requests_admin_approved_by_fkey" FOREIGN KEY ("admin_approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraw_requests" ADD CONSTRAINT "withdraw_requests_admin_rejected_by_fkey" FOREIGN KEY ("admin_rejected_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
