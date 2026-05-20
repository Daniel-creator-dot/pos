import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/users - List all users
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin or superadmin can view users
    if (session.user.role.name !== "admin" && session.user.role.name !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: {
        ...(session.user.role.name !== "superadmin" ? { companyId: session.user.companyId } : {}),
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Users API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin or superadmin can create users
    if (session.user.role.name !== "admin" && session.user.role.name !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, roleId, storeId, companyId, phone } = body;

    if (!phone || phone.trim() === "") {
      return NextResponse.json(
        { error: "Phone number is required for security OTP delivery" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Resolve roleId if it's a role name
    let finalRoleId = roleId;
    if (["admin", "manager", "cashier", "superadmin", "storekeeper"].includes(roleId)) {
      const role = await prisma.role.findFirst({
        where: { name: roleId as any },
      });
      if (role) {
        finalRoleId = role.id;
      }
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        roleId: finalRoleId,
        storeId: storeId || session.user.storeId,
        companyId: companyId || session.user.companyId,
        phone,
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Users API Error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}