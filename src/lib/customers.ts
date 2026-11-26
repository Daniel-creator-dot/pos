import { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;
import { sendIntekSms } from "./sms/intek";

let ready: Promise<void> | null = null;

export function normalizePhone(raw: string | null | undefined) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length < 9 || digits.length > 15) return null;
  if (digits.startsWith("0") && digits.length === 10) return `233${digits.slice(1)}`;
  return digits;
}

export function receiptText(args: {
  receiptNumber: string;
  items: { name: string; qty: number }[];
  total: number;
}) {
  const lines = args.items
    .slice(0, 5)
    .map((item) => `${item.name} x${item.qty}`)
    .join(", ");
  const more = args.items.length > 5 ? ` +${args.items.length - 5} more` : "";
  return `SwiftPOS ${args.receiptNumber}. ${lines}${more}. Total ${args.total.toFixed(2)}. Thank you.`;
}

export async function ensureCustomerColumns(prisma: PrismaClient) {
  if (!ready) {
    ready = apply(prisma).catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

async function apply(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "marketingOptIn" BOOLEAN NOT NULL DEFAULT true`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "customerId" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Sale_customerId_idx" ON "Sale"("customerId")`
  );
}

export async function saveCustomer(
  prisma: Db,
  args: {
    companyId: string;
    phone: string;
    name?: string | null;
    marketingOptIn: boolean;
  }
) {
  const existing = await prisma.customer.findFirst({
    where: { companyId: args.companyId, phone: args.phone },
  });
  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: args.name?.trim() || existing.name,
        marketingOptIn: args.marketingOptIn,
      },
    });
  }
  return prisma.customer.create({
    data: {
      companyId: args.companyId,
      phone: args.phone,
      name: args.name?.trim() || "Customer",
      marketingOptIn: args.marketingOptIn,
    },
  });
}

export async function textCustomer(
  prisma: PrismaClient,
  args: {
    storeId: string;
    companyId: string | null;
    phone: string;
    message: string;
    type: "receipt" | "campaign";
    reference?: string | null;
  }
) {
  const log = await prisma.smsLog.create({
    data: {
      storeId: args.storeId,
      companyId: args.companyId,
      recipient: args.phone,
      message: args.message,
      status: "pending",
      type: args.type,
      reference: args.reference || null,
    },
  });
  const result = await sendIntekSms(args.phone, args.message, process.env.INTEK_SMS_SENDER || "Swiftpos");
  await prisma.smsLog.update({
    where: { id: log.id },
    data: {
      status: result.success ? "sent" : "failed",
      error: result.error || null,
    },
  });
  return result;
}
