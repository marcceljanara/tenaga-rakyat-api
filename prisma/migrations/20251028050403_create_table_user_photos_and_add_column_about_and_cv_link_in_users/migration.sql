-- AlterTable
ALTER TABLE "users" ADD COLUMN     "about" TEXT,
ADD COLUMN     "cv_url" VARCHAR(512);

-- CreateTable
CREATE TABLE "UserPhotos" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "photo_url" VARCHAR(512) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPhotos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserPhotos" ADD CONSTRAINT "UserPhotos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
