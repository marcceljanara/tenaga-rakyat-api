-- CreateEnum
CREATE TYPE "WithdrawType" AS ENUM ('BANK_TRANSFER', 'EWALLET');

-- CreateTable
CREATE TABLE "withdraw_methods" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "method" "WithdrawType" NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "account_name" VARCHAR(100) NOT NULL,
    "account_number" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdraw_methods_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "withdraw_methods" ADD CONSTRAINT "withdraw_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
