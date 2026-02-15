-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'FAILED');

-- CreateTable
CREATE TABLE "user_posting_quota" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "free_quota" INTEGER NOT NULL DEFAULT 3,
    "paid_credit" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_posting_quota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostingCreditPurchase" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "package_id" INTEGER NOT NULL,
    "credit_amount" INTEGER NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "payment_reference" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostingCreditPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posting_credit_packages" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "credit_amount" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posting_credit_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_posting_quota_user_id_key" ON "user_posting_quota"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "PostingCreditPurchase_payment_reference_key" ON "PostingCreditPurchase"("payment_reference");

-- CreateIndex
CREATE INDEX "PostingCreditPurchase_user_id_idx" ON "PostingCreditPurchase"("user_id");

-- AddForeignKey
ALTER TABLE "user_posting_quota" ADD CONSTRAINT "user_posting_quota_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostingCreditPurchase" ADD CONSTRAINT "PostingCreditPurchase_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostingCreditPurchase" ADD CONSTRAINT "PostingCreditPurchase_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "posting_credit_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
