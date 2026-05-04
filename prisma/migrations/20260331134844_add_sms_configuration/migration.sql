-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "smsApiKey" TEXT,
ADD COLUMN     "smsApiSecret" TEXT,
ADD COLUMN     "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsEndpoint" TEXT,
ADD COLUMN     "smsProvider" TEXT,
ADD COLUMN     "smsSenderId" TEXT;

-- CreateTable
CREATE TABLE "SMSLog" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reference" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SMSLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SMSLog_storeId_idx" ON "SMSLog"("storeId");

-- CreateIndex
CREATE INDEX "SMSLog_createdAt_idx" ON "SMSLog"("createdAt");

-- CreateIndex
CREATE INDEX "SMSLog_type_idx" ON "SMSLog"("type");

-- AddForeignKey
ALTER TABLE "SMSLog" ADD CONSTRAINT "SMSLog_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
