/*
  Warnings:

  - Added the required column `fee_charged` to the `withdraw_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fee_type` to the `withdraw_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fee_value` to the `withdraw_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "withdraw_requests" ADD COLUMN     "fee_charged" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "fee_type" "FeeType" NOT NULL,
ADD COLUMN     "fee_value" DECIMAL(15,2) NOT NULL;
