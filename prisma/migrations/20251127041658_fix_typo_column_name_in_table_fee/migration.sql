/*
  Warnings:

  - You are about to drop the column `namae` on the `fees` table. All the data in the column will be lost.
  - Added the required column `name` to the `fees` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "fees" DROP COLUMN "namae",
ADD COLUMN     "name" VARCHAR(50) NOT NULL;
