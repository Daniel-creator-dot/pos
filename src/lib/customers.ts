import { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;
import { sendIntekSms } from "./sms/intek";

let ready: Promise<void> | null = null;

export const SMS_SENDER_HOLD =
  "Intek is holding the sender name Swiftpos. Log in at inteksms.top, open Sender IDs, add https://posbytz.onrender.com to Swiftpos, then send again.";

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

export async function ensureShopSms(prisma: Db, companyId: string) {
  const shop = await prisma.store.findFirst({
    where: { companyId, kind: "STORE" },
  });
  if (!shop) return null;
  if (shop.smsProvider) return shop;
  return prisma.store.update({
    where: { id: shop.id },
    data: {
      smsEnabled: true,
      smsProvider: "intek",
      smsSenderId: process.env.INTEK_SMS_SENDER || "Swiftpos",
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
  const shop = args.companyId ? await ensureShopSms(prisma, args.companyId) : null;
  const log = await prisma.smsLog.create({
    data: {
      storeId: shop?.id || args.storeId,
      companyId: args.companyId,
      recipient: args.phone,
      message: args.message,
      status: "pending",
      type: args.type,
      reference: args.reference || null,
    },
  });
  const result = await sendIntekSms(
    args.phone,
    args.message,
    shop?.smsSenderId || process.env.INTEK_SMS_SENDER || "Swiftpos",
    shop?.smsApiKey || undefined
  );
  await prisma.smsLog.update({
    where: { id: log.id },
    data: {
      status: result.success ? "sent" : "failed",
      error: result.error || null,
    },
  });
  return result;
}

export async function textBulk(
  prisma: PrismaClient,
  args: { companyId: string; phones: string[]; message: string }
) {
  const shop = await ensureShopSms(prisma, args.companyId);
  if (!shop) {
    return { sent: 0, failed: 0, total: 0, detail: "Shop location was not found", recipients: [] as { phone: string; success: boolean }[] };
  }
  const phones = Array.from(new Set(args.phones)).slice(0, 200);
  const logs = [];
  for (const phone of phones) {
    logs.push(
      await prisma.smsLog.create({
        data: {
          storeId: shop.id,
          companyId: args.companyId,
          recipient: phone,
          message: args.message,
          status: "pending",
          type: "campaign",
        },
      })
    );
  }
  const result = await sendIntekSms(
    phones,
    args.message,
    shop.smsSenderId || process.env.INTEK_SMS_SENDER || "Swiftpos",
    shop.smsApiKey || undefined
  );
  if (logs.length > 0) {
    await prisma.smsLog.updateMany({
      where: { id: { in: logs.map((log) => log.id) } },
      data: {
        status: result.success ? "sent" : "failed",
        error: result.error || null,
      },
    });
  }
  return {
    sent: result.success ? phones.length : 0,
    failed: result.success ? 0 : phones.length,
    total: phones.length,
    detail: result.success ? "" : result.error || "The text could not be delivered",
    recipients: phones.map((phone) => ({ phone, success: result.success })),
  };
}
