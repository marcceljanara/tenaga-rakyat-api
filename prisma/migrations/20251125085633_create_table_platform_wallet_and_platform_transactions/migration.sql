-- CreateEnum
CREATE TYPE "PlatformTransactionType" AS ENUM ('ESCROW_FEE', 'WITHDRAW_FEE', 'SERVICE_FEE');

-- CreateTable
CREATE TABLE "platform_wallet" (
    "id" SERIAL NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_transactions" (
    "id" SERIAL NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "type" "PlatformTransactionType" NOT NULL,
    "reference_id" INT,
    "description" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_transactions_pkey" PRIMARY KEY ("id")
);
