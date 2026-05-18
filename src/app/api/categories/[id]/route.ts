import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/categories/[id] - Get a single category
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Access check: non-superadmins can only access categories within their company
    if (session.user.role.name !== "superadmin" && category.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("Category API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 }
    );
  }
}

// PUT /api/categories/[id] - Update a category
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
      session.user.role.name !== "superadmin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const category = await prisma.category.findUnique({
      where: { id: params.id }
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    if (session.user.role.name !== "superadmin" && category.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    const updatedCategory = await prisma.category.update({
      where: { id: params.id },
      data: {
        name,
        description,
      },
    });

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error("Category API Error:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - Delete a category (soft delete or queue for approval)
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
      session.user.role.name !== "superadmin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const category = await prisma.category.findUnique({
      where: { id: params.id }
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    if (session.user.role.name !== "superadmin" && category.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isAdmin = session.user.role.name === "admin" || session.user.role.name === "superadmin";

    if (isAdmin) {
      // Admins/Superadmins soft-delete directly
      await prisma.category.update({
        where: { id: params.id },
        data: {
          isActive: false,
          isPendingDelete: false,
        },
      });
      return NextResponse.json({ success: true });
    } else {
      // Managers create a deletion request for admin approval
      await prisma.$transaction([
        prisma.category.update({
          where: { id: params.id },
          data: {
            isPendingDelete: true,
          },
        }),
        prisma.deletionRequest.create({
          data: {
            companyId: session.user.companyId || "",
            resourceType: "CATEGORY",
            resourceId: params.id,
            resourceName: category.name,
            requestedById: session.user.id,
            status: "PENDING",
          },
        }),
      ]);
      return NextResponse.json({ success: true, pendingApproval: true });
    }
  } catch (error) {
    console.error("Category API Error:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
