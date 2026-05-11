import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
    const { name, email, phone, address } = body;

    if (!name) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const company = await prisma.company.create({
      data: {
        name,
        email,
        phone,
        address,
        status: "ACTIVE",
        stores: {
          create: {
            name: `${name} - Main Store`,
            address: address,
            phone: phone,
          }
        }
      },
      include: {
        stores: true
      }
    });

    // Optionally create a default admin role and user for this company here
    // or leave it for the onboarding process.

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("Companies API Error:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}
