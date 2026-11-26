import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ensureCustomerColumns, normalizePhone, saveCustomer, textBulk } from "@/lib/customers";

function publicSmsFailure(error?: string) {
  if (error && error.includes("Sender ID")) {
    return "The SMS sender name is on hold with the provider. Numbers are still saved.";
  }
  return "The text could not be delivered.";
}

function allowed(role?: string) {
  return role === "admin" || role === "superadmin" || role === "manager";
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !allowed(session.user.role?.name)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await ensureCustomerColumns(prisma);
    const customers = await prisma.customer.findMany({
      where: { companyId: session.user.companyId, phone: { not: null } },
      orderBy: { updatedAt: "desc" },
      include: {
        sales: {
          select: { id: true, total: true, createdAt: true, receiptNumber: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    return NextResponse.json(
      customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        marketingOptIn: customer.marketingOptIn,
        lastSale: customer.sales[0] || null,
      }))
    );
  } catch (error) {
    console.error("Customers API Error:", error);
    return NextResponse.json({ error: "Failed to load customers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !allowed(session.user.role?.name)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    await ensureCustomerColumns(prisma);

    if (body.mode === "broadcast" || body.mode === "bulk") {
      const message = String(body.message || "").trim();
      if (message.length < 5) {
        return NextResponse.json({ error: "Write a short message first" }, { status: 400 });
      }
      const phones: string[] = [];
      const skipped: string[] = [];
      if (body.mode === "broadcast") {
        const customers = await prisma.customer.findMany({
          where: {
            companyId: session.user.companyId,
            marketingOptIn: true,
            phone: { not: null },
          },
        });
        for (const customer of customers) {
          if (customer.phone) phones.push(customer.phone);
        }
      } else {
        const ids = Array.isArray(body.customerIds) ? body.customerIds.filter((id: unknown) => typeof id === "string") : [];
        if (ids.length > 0) {
          const selected = await prisma.customer.findMany({
            where: { companyId: session.user.companyId, id: { in: ids }, phone: { not: null } },
          });
          for (const customer of selected) {
            if (customer.phone) phones.push(customer.phone);
          }
        }
        const extra = Array.isArray(body.phones)
          ? body.phones
          : String(body.phones || "").split(/[\s,;]+/);
        for (const raw of extra) {
          const typed = String(raw || "").trim();
          if (!typed) continue;
          const phone = normalizePhone(typed);
          if (!phone) {
            skipped.push(typed);
            continue;
          }
          phones.push(phone);
          await saveCustomer(prisma, {
            companyId: session.user.companyId,
            phone,
            name: "Customer",
            marketingOptIn: true,
          });
        }
      }
      const unique = Array.from(new Set(phones));
      if (unique.length === 0) {
        return NextResponse.json({ error: "Choose at least one phone number" }, { status: 400 });
      }
      const result = await textBulk(prisma, {
        companyId: session.user.companyId,
        phones: unique,
        message,
      });
      return NextResponse.json({
        ...result,
        detail: result.detail ? publicSmsFailure(result.detail) : "",
        skipped,
      });
    }

    const phone = normalizePhone(body.phone);
    if (!phone) {
      return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
    }
    const customer = await saveCustomer(prisma, {
      companyId: session.user.companyId,
      phone,
      name: body.name,
      marketingOptIn: body.marketingOptIn !== false,
    });
    return NextResponse.json(customer);
  } catch (error) {
    console.error("Customers API Error:", error);
    return NextResponse.json({ error: "Failed to save the customer" }, { status: 500 });
  }
}
