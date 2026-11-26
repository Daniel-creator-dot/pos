ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "marketingOptIn" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
CREATE INDEX IF NOT EXISTS "Sale_customerId_idx" ON "Sale"("customerId");
DO $$ BEGIN
  ALTER TABLE "Sale"
    ADD CONSTRAINT "Sale_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
