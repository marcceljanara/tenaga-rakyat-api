/*
  Warnings:

  - The primary key for the `roles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `roles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `role_id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_role_id_fkey";

-- AlterTable
ALTER TABLE "roles" DROP CONSTRAINT "roles_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" BIGSERIAL NOT NULL,
ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role_id",
ADD COLUMN     "role_id" BIGINT NOT NULL;

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
