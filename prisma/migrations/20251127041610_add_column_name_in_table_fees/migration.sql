/*
  Warnings:

  - Added the required column `namae` to the `fees` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "fees" ADD COLUMN     "namae" VARCHAR(50) NOT NULL;
