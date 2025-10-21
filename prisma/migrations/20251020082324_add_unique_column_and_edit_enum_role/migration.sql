/*
  Warnings:

  - The values [unverified,pending,verified,rejected] on the enum `VerificationStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[name]` on the table `roles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone_number]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "VerificationStatus_new" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
ALTER TABLE "public"."users" ALTER COLUMN "verification_status" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "verification_status" TYPE "VerificationStatus_new" USING ("verification_status"::text::"VerificationStatus_new");
ALTER TYPE "VerificationStatus" RENAME TO "VerificationStatus_old";
ALTER TYPE "VerificationStatus_new" RENAME TO "VerificationStatus";
DROP TYPE "public"."VerificationStatus_old";
ALTER TABLE "users" ALTER COLUMN "verification_status" SET DEFAULT 'UNVERIFIED';
COMMIT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "verification_status" SET DEFAULT 'UNVERIFIED';

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");
