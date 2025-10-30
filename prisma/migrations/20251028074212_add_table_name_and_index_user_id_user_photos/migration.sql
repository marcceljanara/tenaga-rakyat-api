/*
  Warnings:

  - You are about to drop the `UserPhotos` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."UserPhotos" DROP CONSTRAINT "UserPhotos_user_id_fkey";

-- DropTable
DROP TABLE "public"."UserPhotos";

-- CreateTable
CREATE TABLE "user_photos" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "photo_url" VARCHAR(512) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_photos_user_id_idx" ON "user_photos"("user_id");

-- AddForeignKey
ALTER TABLE "user_photos" ADD CONSTRAINT "user_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
