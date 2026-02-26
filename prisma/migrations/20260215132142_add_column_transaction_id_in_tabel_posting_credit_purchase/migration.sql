/*
  Warnings:

  - You are about to drop the `PostingCreditPurchase` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PostingCreditPurchase" DROP CONSTRAINT "PostingCreditPurchase_package_id_fkey";

-- DropForeignKey
ALTER TABLE "PostingCreditPurchase" DROP CONSTRAINT "PostingCreditPurchase_user_id_fkey";

-- DropTable
DROP TABLE "PostingCreditPurchase";

-- CreateTable
CREATE TABLE "posting_credit_purchase" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "package_id" INTEGER NOT NULL,
    "credit_amount" INTEGER NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "payment_reference" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "transaction_id" INTEGER NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posting_credit_purchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "posting_credit_purchase_payment_reference_key" ON "posting_credit_purchase"("payment_reference");

-- CreateIndex
CREATE UNIQUE INDEX "posting_credit_purchase_transaction_id_key" ON "posting_credit_purchase"("transaction_id");

-- CreateIndex
CREATE INDEX "posting_credit_purchase_user_id_idx" ON "posting_credit_purchase"("user_id");

-- AddForeignKey
ALTER TABLE "posting_credit_purchase" ADD CONSTRAINT "posting_credit_purchase_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posting_credit_purchase" ADD CONSTRAINT "posting_credit_purchase_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "posting_credit_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posting_credit_purchase" ADD CONSTRAINT "posting_credit_purchase_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
