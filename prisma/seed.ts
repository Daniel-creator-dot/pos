import { PrismaClient, RoleName, StockMovementType, PurchaseStatus, PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean up existing data (in reverse order of dependencies)
  console.log("🧹 Cleaning existing data...");
  await prisma.receipt.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.store.deleteMany();
  await prisma.customer.deleteMany();

  // Create Roles
  console.log("📋 Creating roles...");
  const adminRole = await prisma.role.create({
    data: {
      name: RoleName.admin,
      description: "Full system access",
      permissions: JSON.stringify(["*"]),
    },
  });

  const managerRole = await prisma.role.create({
    data: {
      name: RoleName.manager,
      description: "Store management access",
      permissions: JSON.stringify(["dashboard", "pos", "products", "stock", "purchases", "reports", "sales_history"]),
    },
  });

  const cashierRole = await prisma.role.create({
    data: {
      name: RoleName.cashier,
      description: "POS and own sales only",
      permissions: JSON.stringify(["pos", "sales_history_own"]),
    },
  });

  const storekeeperRole = await prisma.role.create({
    data: {
      name: RoleName.storekeeper,
      description: "Stock and purchases access",
      permissions: JSON.stringify(["products_view", "stock", "purchases"]),
    },
  });

  console.log(`✅ Created ${adminRole.name}, ${managerRole.name}, ${cashierRole.name}, ${storekeeperRole.name} roles`);

  // Create Store
  console.log("🏪 Creating store...");
  const store = await prisma.store.create({
    data: {
      name: "Main Branch",
      address: "123 Business St, Tech City",
      phone: "555-0123",
    },
  });
  console.log(`✅ Created store: ${store.name}`);

  // Create Users
  console.log("👥 Creating users...");
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      name: "System Admin",
      email: "admin@swiftpos.com",
      passwordHash: adminPassword,
      roleId: adminRole.id,
      storeId: store.id,
    },
  });

  const managerPassword = await bcrypt.hash("manager123", 10);
  const manager = await prisma.user.create({
    data: {
      name: "Store Manager",
      email: "manager@swiftpos.com",
      passwordHash: managerPassword,
      roleId: managerRole.id,
      storeId: store.id,
    },
  });

  const cashierPassword = await bcrypt.hash("cashier123", 10);
  const cashier = await prisma.user.create({
    data: {
      name: "Main Cashier",
      email: "cashier@swiftpos.com",
      passwordHash: cashierPassword,
      roleId: cashierRole.id,
      storeId: store.id,
    },
  });

  const storekeeperPassword = await bcrypt.hash("storekeeper123", 10);
  const storekeeper = await prisma.user.create({
    data: {
      name: "Store Keeper",
      email: "storekeeper@swiftpos.com",
      passwordHash: storekeeperPassword,
      roleId: storekeeperRole.id,
      storeId: store.id,
    },
  });

  console.log(`✅ Created users: ${admin.email}, ${manager.email}, ${cashier.email}, ${storekeeper.email}`);

  // Create Categories
  console.log("📦 Creating categories...");
  const electronics = await prisma.category.create({
    data: { name: "Electronics", description: "Electronic devices and accessories" },
  });

  const groceries = await prisma.category.create({
    data: { name: "Groceries", description: "Food and household items" },
  });

  const clothing = await prisma.category.create({
    data: { name: "Clothing", description: "Apparel and fashion items" },
  });

  const household = await prisma.category.create({
    data: { name: "Household", description: "Home and office supplies" },
  });

  console.log(`✅ Created categories: ${electronics.name}, ${groceries.name}, ${clothing.name}, ${household.name}`);

  // Create Products
  console.log("🛍️ Creating products...");
  const products = await prisma.product.createMany({
    data: [
      // Electronics
      {
        name: "Laptop Pro 15\"",
        barcode: "1234567890123",
        categoryId: electronics.id,
        price: 1299.99,
        cost: 850.00,
        stockQty: 10,
        lowStockThreshold: 3,
      },
      {
        name: "Wireless Mouse",
        barcode: "1234567890124",
        categoryId: electronics.id,
        price: 29.99,
        cost: 15.00,
        stockQty: 50,
        lowStockThreshold: 10,
      },
      {
        name: "USB-C Hub",
        barcode: "1234567890125",
        categoryId: electronics.id,
        price: 49.99,
        cost: 25.00,
        stockQty: 30,
        lowStockThreshold: 8,
      },
      {
        name: "Bluetooth Headphones",
        barcode: "1234567890126",
        categoryId: electronics.id,
        price: 89.99,
        cost: 45.00,
        stockQty: 25,
        lowStockThreshold: 5,
      },
      // Groceries
      {
        name: "Organic Coffee 1kg",
        barcode: "2234567890123",
        categoryId: groceries.id,
        price: 24.99,
        cost: 12.00,
        stockQty: 100,
        lowStockThreshold: 20,
      },
      {
        name: "Whole Wheat Bread",
        barcode: "2234567890124",
        categoryId: groceries.id,
        price: 4.99,
        cost: 2.50,
        stockQty: 40,
        lowStockThreshold: 15,
      },
      {
        name: "Fresh Milk 2L",
        barcode: "2234567890125",
        categoryId: groceries.id,
        price: 3.99,
        cost: 2.00,
        stockQty: 60,
        lowStockThreshold: 20,
      },
      {
        name: "Free Range Eggs 12pk",
        barcode: "2234567890126",
        categoryId: groceries.id,
        price: 5.99,
        cost: 3.00,
        stockQty: 80,
        lowStockThreshold: 25,
      },
      // Clothing
      {
        name: "Cotton T-Shirt M",
        barcode: "3234567890123",
        categoryId: clothing.id,
        price: 19.99,
        cost: 8.00,
        stockQty: 45,
        lowStockThreshold: 10,
      },
      {
        name: "Denim Jeans 32",
        barcode: "3234567890124",
        categoryId: clothing.id,
        price: 49.99,
        cost: 22.00,
        stockQty: 30,
        lowStockThreshold: 8,
      },
      // Household
      {
        name: "Paper Towels 6pk",
        barcode: "4234567890123",
        categoryId: household.id,
        price: 12.99,
        cost: 6.00,
        stockQty: 55,
        lowStockThreshold: 15,
      },
      {
        name: "Laundry Detergent 2L",
        barcode: "4234567890124",
        categoryId: household.id,
        price: 14.99,
        cost: 7.50,
        stockQty: 35,
        lowStockThreshold: 10,
      },
    ],
  });

  console.log(`✅ Created ${products.count} products`);

  // Create Suppliers
  console.log("🚚 Creating suppliers...");
  const techDistributor = await prisma.supplier.create({
    data: {
      name: "Tech Distributors Inc.",
      phone: "555-1001",
      email: "sales@techdist.com",
      address: "456 Industrial Ave, Tech City",
    },
  });

  const foodSupplier = await prisma.supplier.create({
    data: {
      name: "Fresh Foods Co.",
      phone: "555-2002",
      email: "orders@freshfoods.com",
      address: "789 Farm Road, Green Valley",
    },
  });

  const generalGoods = await prisma.supplier.create({
    data: {
      name: "General Goods Ltd.",
      phone: "555-3003",
      email: "contact@generalgoods.com",
      address: "321 Commerce St, Business District",
    },
  });

  console.log(`✅ Created suppliers: ${techDistributor.name}, ${foodSupplier.name}, ${generalGoods.name}`);

  // Summary
  console.log("\n🎉 Seeding completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`   - Roles: 4 (admin, manager, cashier, storekeeper)`);
  console.log(`   - Users: 4`);
  console.log(`   - Store: 1`);
  console.log(`   - Categories: 4`);
  console.log(`   - Products: ${products.count}`);
  console.log(`   - Suppliers: 3`);

  console.log("\n🔐 Default Login Credentials:");
  console.log("   - Admin: admin@swiftpos.com / admin123");
  console.log("   - Manager: manager@swiftpos.com / manager123");
  console.log("   - Cashier: cashier@swiftpos.com / cashier123");
  console.log("   - Storekeeper: storekeeper@swiftpos.com / storekeeper123");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });