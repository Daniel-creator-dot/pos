import { PrismaClient, RoleName } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const superadminEmail = process.env.SEED_SUPERADMIN_EMAIL || "superadmin@pos.com";
const superadminPassword = process.env.SEED_SUPERADMIN_PASSWORD || "ChangeMe123!";

async function main() {
  console.log("🌱 Resetting database for a new company...");

  console.log("🧹 Removing existing company data...");
  await prisma.receipt.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.smsLog.deleteMany();
  await prisma.deletionRequest.deleteMany();
  await prisma.otpToken.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();
  await prisma.company.deleteMany();
  await prisma.role.deleteMany();

  console.log("📋 Creating roles...");
  const superadminRole = await prisma.role.create({
    data: {
      name: RoleName.superadmin,
      description: "Platform administrator. Creates companies and does not belong to one.",
      permissions: JSON.stringify(["*"]),
    },
  });

  await prisma.role.create({
    data: {
      name: RoleName.admin,
      description: "Full access inside one company",
      permissions: JSON.stringify(["*"]),
    },
  });

  await prisma.role.create({
    data: {
      name: RoleName.manager,
      description: "Store management access",
      permissions: JSON.stringify(["dashboard", "pos", "products", "stock", "purchases", "reports", "sales_history"]),
    },
  });

  await prisma.role.create({
    data: {
      name: RoleName.cashier,
      description: "POS and own sales only",
      permissions: JSON.stringify(["pos", "sales_history_own"]),
    },
  });

  await prisma.role.create({
    data: {
      name: RoleName.storekeeper,
      description: "Stock and purchases access",
      permissions: JSON.stringify(["products_view", "stock", "purchases"]),
    },
  });

  const passwordHash = await bcrypt.hash(superadminPassword, 10);
  await prisma.user.create({
    data: {
      name: "Platform Superadmin",
      email: superadminEmail,
      passwordHash,
      roleId: superadminRole.id,
    },
  });

  console.log("\n✅ Database is empty and ready for a new company.");
  console.log("   No companies, stores, products, suppliers, or sales were created.");
  console.log(`   Sign in as ${superadminEmail} and create the company from the admin screen.`);
  if (!process.env.SEED_SUPERADMIN_PASSWORD) {
    console.log("   Default password is ChangeMe123!. Change it after the first login.");
  }
}

main()
  .catch((e) => {
    console.error("❌ Reset failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
