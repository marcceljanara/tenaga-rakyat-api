/*
  Warnings:

  - You are about to drop the column `location` on the `jobs` table. All the data in the column will be lost.
  - Added the required column `job_latitude` to the `jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `job_longitude` to the `jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location_label` to the `jobs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "location",
ADD COLUMN     "address_detail" VARCHAR(512),
ADD COLUMN     "job_latitude" DECIMAL(9,6) NOT NULL,
ADD COLUMN     "job_longitude" DECIMAL(9,6) NOT NULL,
ADD COLUMN     "location_label" VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "location_label" VARCHAR(255),
ADD COLUMN     "longitude" DECIMAL(9,6);
