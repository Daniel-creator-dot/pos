import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { stockAdjustment } from "@/lib/checkout";
import { changeLocationStock, ensureCompanyLocations, locationQty } from "@/lib/locations";

// GET /api/stock - Get all stock movements
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const movements = await prisma.stockMovement.findMany({
      where: session.user.role.name !== "superadmin"
        ? {
            product: {
              companyId: session.user.companyId || "",
            },
          }
        : {},
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            kind: true,
          },
        },
      },
    });

    return NextResponse.json(movements);
  } catch (error) {
    console.error("Stock API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock movements" },
      { status: 500 }
    );
  }
}

// POST /api/stock - Create a stock adjustment
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions - only admin, manager, storekeeper, or superadmin can adjust stock
    if (
      session.user.role.name !== "admin" &&
      session.user.role.name !== "manager" &&
      session.user.role.name !== "storekeeper" &&
      session.user.role.name !== "superadmin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { productId, type, qty, reason, storeId } = body;

    if (type !== "IN" && type !== "OUT" && type !== "ADJUSTMENT") {
      return NextResponse.json(
        { error: "Type must be IN, OUT, or ADJUSTMENT" },
        { status: 400 }
      );
    }

    if (!productId || qty === undefined || qty === null || qty === "") {
      return NextResponse.json(
        { error: "Product ID, type, and quantity are required" },
        { status: 400 }
      );
    }

    // Verify product exists and belongs to the user's company (if not superadmin)
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        ...(session.user.role.name !== "superadmin"
          ? { companyId: session.user.companyId || "" }
          : {}),
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const companyId =
      session.user.role.name === "superadmin"
        ? product.companyId
        : session.user.companyId;

    const movement = await prisma.$transaction(async (tx) => {
      if (!companyId) {
        const adjustment = stockAdjustment(product.stockQty, type, Number(qty));
        if ("error" in adjustment) {
          throw new Error(adjustment.error);
        }
        await tx.product.update({
          where: { id: productId },
          data: { stockQty: adjustment.nextQty },
        });
        return tx.stockMovement.create({
          data: {
            productId,
            type,
            qty: adjustment.movementQty,
            reason,
            userId: session.user.id,
          },
          include: {
            product: true,
            user: { select: { id: true, name: true } },
          },
        });
      }

      const locations = await ensureCompanyLocations(tx, companyId);
      const targetId = storeId || locations.shop.id;
      if (targetId !== locations.shop.id && targetId !== locations.warehouse.id) {
        throw new Error("Choose the shop or the warehouse");
      }

      const current = await locationQty(tx, productId, targetId);
      const adjustment = stockAdjustment(current, type, Number(qty));
      if ("error" in adjustment) {
        throw new Error(adjustment.error);
      }

      return changeLocationStock(tx, {
        productId,
        storeId: targetId,
        delta: adjustment.nextQty - current,
        movementType: type,
        movementQty: adjustment.movementQty,
        reason,
        userId: session.user.id,
      });
    });

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    console.error("Stock API Error:", error);
    const message = error instanceof Error ? error.message : "Failed to create stock movement";
    const clientError = /Insufficient|Quantity|Type must|already|Choose the shop/.test(message);
    return NextResponse.json(
      { error: clientError ? message : "Failed to create stock movement" },
      { status: clientError ? 400 : 500 }
    );
  }
}