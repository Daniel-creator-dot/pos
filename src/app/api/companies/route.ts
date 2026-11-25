import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/companies - List all companies (Superadmin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role.name !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: {
            stores: true,
            users: true,
            products: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error("Companies API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

// POST /api/companies - Create a new company (Superadmin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role.name !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone, address, adminName, adminEmail, adminPhone, adminPassword } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }
    if (!adminName?.trim() || !adminEmail?.trim() || !adminPhone?.trim() || !adminPassword) {
      return NextResponse.json(
        { error: "Shop owner name, email, phone, and password are required" },
        { status: 400 }
      );
    }
    if (String(adminPassword).length < 6) {
      return NextResponse.json(
        { error: "Shop owner password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
    if (!adminRole) {
      return NextResponse.json(
        { error: "The admin role is missing. Seed the database roles first." },
        { status: 500 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: String(adminEmail).trim().toLowerCase() },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "That login email is already in use" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(String(adminPassword), 10);
    const loginEmail = String(adminEmail).trim().toLowerCase();

    const company = await prisma.$transaction(async (tx) => {
      const created = await tx.company.create({
        data: {
          name: name.trim(),
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          address: address?.trim() || null,
          status: "ACTIVE",
          stores: {
            create: [
              {
                name: `${name.trim()} - Shop`,
                address: address?.trim() || null,
                phone: phone?.trim() || null,
                kind: "STORE",
              },
              {
                name: `${name.trim()} - Warehouse`,
                kind: "WAREHOUSE",
              },
            ],
          },
        },
        include: { stores: true },
      });

      const shop = created.stores.find((store) => store.kind === "STORE");
      const admin = await tx.user.create({
        data: {
          name: adminName.trim(),
          email: loginEmail,
          passwordHash,
          phone: adminPhone.trim(),
          roleId: adminRole.id,
          companyId: created.id,
          storeId: shop?.id,
        },
        select: { id: true, name: true, email: true },
      });

      return { ...created, admin };
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error: any) {
    console.error("Companies API Error:", error);
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A shop with that email already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}
