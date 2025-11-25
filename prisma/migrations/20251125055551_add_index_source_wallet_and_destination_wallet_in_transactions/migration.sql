-- CreateIndex
CREATE INDEX "transactions_source_wallet_id_destination_wallet_id_idx" ON "transactions"("source_wallet_id", "destination_wallet_id");
