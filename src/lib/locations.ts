import { Prisma, StockMovementType } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function ensureCompanyLocations(tx: Tx, companyId: string) {
  const stores = await tx.store.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" },
  });

  let shop = stores.find((store) => store.kind === "STORE");
  if (!shop) {
    shop = await tx.store.create({
      data: {
        name: "Shop",
        companyId,
        kind: "STORE",
      },
    });
  }

  let warehouse = stores.find((store) => store.kind === "WAREHOUSE");
  if (!warehouse) {
    warehouse = await tx.store.create({
      data: {
        name: "Warehouse",
        companyId,
        kind: "WAREHOUSE",
      },
    });
  }

  const products = await tx.product.findMany({
    where: { companyId, stockLevels: { none: {} } },
    select: { id: true, stockQty: true },
  });

  if (products.length > 0) {
    await tx.stockLevel.createMany({
      data: products.map((product) => ({
        productId: product.id,
        storeId: shop.id,
        qty: product.stockQty,
      })),
    });
  }

  return { shop, warehouse };
}

export async function changeLocationStock(
  tx: Tx,
  args: {
    productId: string;
    storeId: string;
    delta: number;
    movementType: StockMovementType;
    movementQty: number;
    reason?: string | null;
    userId: string;
    reference?: string | null;
  }
) {
  if (args.delta === 0) return null;

  const existing = await tx.stockLevel.findUnique({
    where: {
      productId_storeId: {
        productId: args.productId,
        storeId: args.storeId,
      },
    },
  });

  if (!existing && args.delta < 0) {
    throw new Error("Insufficient stock at this location");
  }

  const level = existing
    ? await tx.stockLevel.update({
        where: { id: existing.id },
        data: { qty: { increment: args.delta } },
      })
    : await tx.stockLevel.create({
        data: {
          productId: args.productId,
          storeId: args.storeId,
          qty: args.delta,
        },
      });

  if (level.qty < 0) {
    throw new Error("Insufficient stock at this location");
  }

  await tx.product.update({
    where: { id: args.productId },
    data: { stockQty: { increment: args.delta } },
  });

  return tx.stockMovement.create({
    data: {
      productId: args.productId,
      storeId: args.storeId,
      type: args.movementType,
      qty: args.movementQty,
      reason: args.reason,
      userId: args.userId,
      reference: args.reference,
    },
    include: {
      product: true,
      store: { select: { id: true, name: true, kind: true } },
      user: { select: { id: true, name: true } },
    },
  });
}

export async function locationQty(tx: Tx, productId: string, storeId: string) {
  const level = await tx.stockLevel.findUnique({
    where: { productId_storeId: { productId, storeId } },
    select: { qty: true },
  });
  return level?.qty ?? 0;
}
