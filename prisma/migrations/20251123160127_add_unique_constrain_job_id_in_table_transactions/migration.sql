/*
  Warnings:

  - A unique constraint covering the columns `[job_id]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "transactions_job_id_key" ON "transactions"("job_id");
