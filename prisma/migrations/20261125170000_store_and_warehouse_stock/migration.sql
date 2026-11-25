-- CreateEnum
CREATE TYPE "LocationKind" AS ENUM ('STORE', 'WAREHOUSE');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN "kind" "LocationKind" NOT NULL DEFAULT 'STORE';

-- CreateTable
CREATE TABLE "StockLevel" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StockLevel_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN "storeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StockLevel_productId_storeId_key" ON "StockLevel"("productId", "storeId");

-- CreateIndex
CREATE INDEX "StockLevel_storeId_idx" ON "StockLevel"("storeId");

-- CreateIndex
CREATE INDEX "StockMovement_storeId_idx" ON "StockMovement"("storeId");

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- One shop and one warehouse for every company
INSERT INTO "Store" ("id", "name", "companyId", "kind", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "name" || ' - Shop', "id", 'STORE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Company"
WHERE NOT EXISTS (
    SELECT 1 FROM "Store" WHERE "Store"."companyId" = "Company"."id" AND "Store"."kind" = 'STORE'
);

INSERT INTO "Store" ("id", "name", "companyId", "kind", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "name" || ' - Warehouse', "id", 'WAREHOUSE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Company"
WHERE NOT EXISTS (
    SELECT 1 FROM "Store" WHERE "Store"."companyId" = "Company"."id" AND "Store"."kind" = 'WAREHOUSE'
);

-- Existing quantity stays sellable on the shop floor
INSERT INTO "StockLevel" ("id", "productId", "storeId", "qty")
SELECT gen_random_uuid()::text, "Product"."id", shop."id", "Product"."stockQty"
FROM "Product"
JOIN LATERAL (
    SELECT "id" FROM "Store"
    WHERE "Store"."companyId" = "Product"."companyId" AND "Store"."kind" = 'STORE'
    ORDER BY "createdAt" ASC
    LIMIT 1
) AS shop ON TRUE
WHERE "Product"."companyId" IS NOT NULL;
