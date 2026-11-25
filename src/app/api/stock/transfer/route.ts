import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { transferQuantity } from "@/lib/checkout";
import { changeLocationStock, ensureCompanyLocations, locationQty } from "@/lib/locations";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      session.user.role.name !== "admin" &&
      session.user.role.name !== "manager" &&
      session.user.role.name !== "storekeeper" &&
      session.user.role.name !== "superadmin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { productId, qty, direction } = body;
    const amount = Number(qty);

    if (!productId) {
      return NextResponse.json({ error: "Product is required" }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        ...(session.user.role.name !== "superadmin"
          ? { companyId: session.user.companyId || "" }
          : {}),
      },
    });

    if (!product?.companyId) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const toShop = direction !== "TO_WAREHOUSE";

    const result = await prisma.$transaction(async (tx) => {
      const locations = await ensureCompanyLocations(tx, product.companyId as string);
      const source = toShop ? locations.warehouse : locations.shop;
      const destination = toShop ? locations.shop : locations.warehouse;
      const available = await locationQty(tx, product.id, source.id);
      const transfer = transferQuantity(available, amount);
      if ("error" in transfer) {
        throw new Error(transfer.error);
      }

      const reference = `transfer:${crypto.randomUUID()}`;
      await changeLocationStock(tx, {
        productId: product.id,
        storeId: source.id,
        delta: -transfer.qty,
        movementType: "OUT",
        movementQty: transfer.qty,
        reason: `Transfer to ${destination.name}`,
        userId: session.user.id,
        reference,
      });
      await changeLocationStock(tx, {
        productId: product.id,
        storeId: destination.id,
        delta: transfer.qty,
        movementType: "IN",
        movementQty: transfer.qty,
        reason: `Transfer from ${source.name}`,
        userId: session.user.id,
        reference,
      });

      return { reference, qty: transfer.qty, from: source.name, to: destination.name };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Stock transfer error:", error);
    const message = error instanceof Error ? error.message : "Failed to transfer stock";
    const clientError = /Not enough|Quantity|Insufficient/.test(message);
    return NextResponse.json(
      { error: clientError ? message : "Failed to transfer stock" },
      { status: clientError ? 400 : 500 }
    );
  }
}
