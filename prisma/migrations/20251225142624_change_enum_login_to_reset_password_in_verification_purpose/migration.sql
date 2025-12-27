/*
  Warnings:

  - The values [LOGIN] on the enum `VerificationPurpose` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "VerificationPurpose_new" AS ENUM ('REGISTER', 'CHANGE_EMAIL', 'RESET_PASSWORD');
ALTER TABLE "email_verifications" ALTER COLUMN "purpose" TYPE "VerificationPurpose_new" USING ("purpose"::text::"VerificationPurpose_new");
ALTER TYPE "VerificationPurpose" RENAME TO "VerificationPurpose_old";
ALTER TYPE "VerificationPurpose_new" RENAME TO "VerificationPurpose";
DROP TYPE "public"."VerificationPurpose_old";
COMMIT;
