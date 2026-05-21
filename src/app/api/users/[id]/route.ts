import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// PUT /api/users/[id] - Update a user
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin or superadmin can update users
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

    // Check if email is taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.id !== params.id) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      );
    }

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

    const updateData: {
      name?: string;
      email?: string;
      passwordHash?: string;
      roleId?: string;
      storeId?: string | null;
      companyId?: string | null;
      phone?: string;
    } = {
      name,
      email,
      roleId: finalRoleId,
      phone,
    };

    // Only update storeId and companyId if explicitly provided in the request
    if (storeId !== undefined) {
      updateData.storeId = storeId;
    }
    if (companyId !== undefined) {
      updateData.companyId = companyId || null;
    }

    // Update password if provided
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Users API Error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin or superadmin can delete users
    if (session.user.role.name !== "admin" && session.user.role.name !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent deleting self
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Users API Error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}