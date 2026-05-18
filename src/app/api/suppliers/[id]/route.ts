import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/suppliers/[id] - Get a single supplier
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Access check: non-superadmins can only access suppliers within their company
    if (session.user.role.name !== "superadmin" && supplier.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Supplier API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier" },
      { status: 500 }
    );
  }
}

// PUT /api/suppliers/[id] - Update a supplier
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id }
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    if (session.user.role.name !== "superadmin" && supplier.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, phone, email, address } = body;

    const updatedSupplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        name,
        phone,
        email,
        address,
      },
    });

    return NextResponse.json(updatedSupplier);
  } catch (error) {
    console.error("Supplier API Error:", error);
    return NextResponse.json(
      { error: "Failed to update supplier" },
      { status: 500 }
    );
  }
}

// DELETE /api/suppliers/[id] - Delete a supplier (soft delete or queue for approval)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id }
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    if (session.user.role.name !== "superadmin" && supplier.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isAdmin = session.user.role.name === "admin" || session.user.role.name === "superadmin";

    if (isAdmin) {
      // Admins/Superadmins soft-delete directly
      await prisma.supplier.update({
        where: { id: params.id },
        data: {
          isActive: false,
          isPendingDelete: false,
        },
      });
      return NextResponse.json({ success: true });
    } else {
      // Managers and Storekeepers create a deletion request for admin approval
      await prisma.$transaction([
        prisma.supplier.update({
          where: { id: params.id },
          data: {
            isPendingDelete: true,
          },
        }),
        prisma.deletionRequest.create({
          data: {
            companyId: session.user.companyId || "",
            resourceType: "SUPPLIER",
            resourceId: params.id,
            resourceName: supplier.name,
            requestedById: session.user.id,
            status: "PENDING",
          },
        }),
      ]);
      return NextResponse.json({ success: true, pendingApproval: true });
    }
  } catch (error) {
    console.error("Supplier API Error:", error);
    return NextResponse.json(
      { error: "Failed to delete supplier" },
      { status: 500 }
    );
  }
}
