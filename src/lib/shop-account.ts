import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

export const SHOP_LOGIN_EMAIL = "3y3nyamensa@pos.com";
const SHOP_NAME = "3Y3 NYAME NSA";

// Verifier for the shop owner's password. The password itself stays out of the repo.
const SHOP_PASSWORD_HASH =
  "$2b$10$s.30BW7xX3SVWrXRQFbLjuCa8sOhpKAGe2.DlZyquCR1DsnAz.Fjq";

const FURNITURE_CATEGORIES: { name: string; description: string }[] = [
  { name: "Living Room", description: "Sofas, sectionals, coffee tables, TV stands, and accent chairs." },
  { name: "Bedroom", description: "Beds, mattresses, wardrobes, dressers, and nightstands." },
  { name: "Dining", description: "Dining tables, chairs, bar stools, and sideboards." },
  { name: "Office", description: "Desks, office chairs, and work-from-home pieces." },
  { name: "Storage", description: "Bookcases, cabinets, shelves, and organizers." },
  { name: "Outdoor", description: "Patio sets, garden chairs, and outdoor tables." },
  { name: "Lighting", description: "Floor lamps, table lamps, pendants, and ceiling lights." },
  { name: "Rugs & Carpets", description: "Area rugs, runners, and carpets for every room." },
  { name: "Curtains & Blinds", description: "Curtains, sheers, rods, and window blinds." },
  { name: "Wall Art & Mirrors", description: "Frames, canvas art, wall hangings, and mirrors." },
  { name: "Cushions & Throws", description: "Scatter cushions, pillow covers, and throw blankets." },
  { name: "Bedding", description: "Duvets, sheets, bedspreads, and pillow sets." },
  { name: "Decor & Accessories", description: "Vases, ornaments, clocks, trays, and candle holders." },
  { name: "Plants & Planters", description: "Indoor plants, artificial greenery, pots, and planters." },
];

const userInclude = {
  role: true,
  company: true,
} as const;

let schemaReady: Promise<void> | null = null;

export async function authorizeShopUser(
  prisma: PrismaClient,
  emailRaw: string,
  password: string
) {
  const email = emailRaw.trim().toLowerCase();

  let user;
  try {
    await prepareShopDatabase(prisma);
    user = await findUser(prisma, email);

    if (!user && (await isShopOwnerPassword(email, password))) {
      await provisionShop(prisma);
      user = await findUser(prisma, email);
    }
  } catch (error) {
    throw toLoginError(error);
  }

  if (!user || !user.role) {
    throw new Error("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new Error("Invalid email or password");
  }

  if (user.isActive === false) {
    throw new Error("Your account has been deactivated. Please contact support.");
  }

  if (user.company && user.company.status !== "ACTIVE") {
    throw new Error("This shop has been suspended. Contact the platform owner.");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roleId: user.roleId,
    storeId: user.storeId,
    companyId: user.companyId,
    role: {
      name: user.role.name,
      permissions: user.role.permissions,
    },
  };
}

async function isShopOwnerPassword(email: string, password: string) {
  if (email !== SHOP_LOGIN_EMAIL) return false;
  return bcrypt.compare(password, SHOP_PASSWORD_HASH);
}

function findUser(prisma: PrismaClient, email: string) {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: userInclude,
  });
}

async function prepareShopDatabase(prisma: PrismaClient) {
  if (!schemaReady) {
    schemaReady = applyLoginSchema(prisma).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

async function applyLoginSchema(prisma: PrismaClient) {
  const tables = await prisma.$queryRaw<{ user_table: string | null }[]>`
    SELECT to_regclass('public."User"')::text AS user_table
  `;

  if (!tables[0]?.user_table) {
    throw new Error(
      "This website's database has no shop tables. In Render, set DATABASE_URL to the SwiftPOS Supabase database and redeploy."
    );
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Company" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT,
      "phone" TEXT,
      "address" TEXT,
      "logo" TEXT,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Company_email_key" ON "Company"("email")
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "companyId" TEXT
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "LocationKind" AS ENUM ('STORE', 'WAREHOUSE');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "companyId" TEXT
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "kind" "LocationKind" NOT NULL DEFAULT 'STORE'
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "companyId" TEXT
  `);
}

async function provisionShop(prisma: PrismaClient) {
  const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
  const role =
    adminRole ??
    (await prisma.role.create({
      data: {
        name: "admin",
        description: "Full system access",
        permissions: JSON.stringify(["*"]),
      },
    }));

  await prisma.$transaction(async (tx) => {
    const already = await tx.user.findFirst({
      where: { email: { equals: SHOP_LOGIN_EMAIL, mode: "insensitive" } },
    });
    if (already) return;

    let company = await tx.company.findUnique({
      where: { email: SHOP_LOGIN_EMAIL },
      include: { stores: true },
    });

    if (!company) {
      company = await tx.company.create({
        data: {
          name: SHOP_NAME,
          email: SHOP_LOGIN_EMAIL,
          status: "ACTIVE",
          stores: {
            create: [
              { name: `${SHOP_NAME} - Shop`, kind: "STORE" },
              { name: `${SHOP_NAME} - Warehouse`, kind: "WAREHOUSE" },
            ],
          },
        },
        include: { stores: true },
      });
    }

    const shop = company.stores.find((store) => store.kind === "STORE");
    await tx.user.create({
      data: {
        name: SHOP_NAME,
        email: SHOP_LOGIN_EMAIL,
        passwordHash: SHOP_PASSWORD_HASH,
        roleId: role.id,
        companyId: company.id,
        storeId: shop?.id,
      },
    });

    const existingCategories = await tx.category.findMany({
      where: { companyId: company.id },
      select: { name: true },
    });
    const existingNames = new Set(existingCategories.map((category) => category.name));
    const missing = FURNITURE_CATEGORIES.filter(
      (category) => !existingNames.has(category.name)
    );
    if (missing.length > 0) {
      await tx.category.createMany({
        data: missing.map((category) => ({
          name: category.name,
          description: category.description,
          companyId: company.id,
        })),
      });
    }
  });
}

function toLoginError(error: unknown) {
  const message = error instanceof Error ? error.message : "Sign in failed";
  if (/no shop tables/i.test(message)) {
    return error instanceof Error ? error : new Error(message);
  }
  if (/Can't reach database server|ECONNREFUSED|P1001|Server has closed the connection|timeout expired/i.test(message)) {
    return new Error(
      "This website cannot reach its database. In Render, set DATABASE_URL to the SwiftPOS Supabase database and redeploy."
    );
  }
  if (/does not exist|P2021|P2022|permission denied/i.test(message)) {
    return new Error(
      "This website's database is missing the shop tables. In Render, set DATABASE_URL to the SwiftPOS Supabase database and redeploy."
    );
  }
  return error instanceof Error ? error : new Error("Sign in failed");
}
