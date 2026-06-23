import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/companies/[id]/stores - Get all stores of a company (Superadmin only)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role.name !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: companyId } = params;

    const stores = await prisma.store.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(stores);
  } catch (error: any) {
    console.error("GET Stores API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch stores" },
      { status: 500 }
    );
  }
}

// POST /api/companies/[id]/stores - Create a new store under a company (Superadmin only)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role.name !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: companyId } = params;
    const body = await request.json();
    const { name, address, phone } = body;

    if (!name) {
      return NextResponse.json({ error: "Store name is required" }, { status: 400 });
    }

    const store = await prisma.store.create({
      data: {
        name,
        address,
        phone,
        companyId,
      },
    });

    return NextResponse.json(store, { status: 201 });
  } catch (error: any) {
    console.error("POST Store API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create store" },
      { status: 500 }
    );
  }
}

// PUT /api/companies/[id]/stores - Update an existing store (Superadmin only)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role.name !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: companyId } = params;
    const body = await request.json();
    const { storeId, name, address, phone } = body;

    if (!storeId) {
      return NextResponse.json({ error: "Store ID is required" }, { status: 400 });
    }

    // Verify the store belongs to the company
    const existingStore = await prisma.store.findFirst({
      where: { id: storeId, companyId },
    });

    if (!existingStore) {
      return NextResponse.json({ error: "Store not found for this company" }, { status: 404 });
    }

    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: {
        name: name !== undefined ? name : undefined,
        address: address !== undefined ? address : undefined,
        phone: phone !== undefined ? phone : undefined,
      },
    });

    return NextResponse.json(updatedStore);
  } catch (error: any) {
    console.error("PUT Store API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update store" },
      { status: 500 }
    );
  }
}

// DELETE /api/companies/[id]/stores - Delete a store (Superadmin only)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role.name !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: companyId } = params;
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json({ error: "Store ID is required" }, { status: 400 });
    }

    // Verify the store belongs to the company
    const existingStore = await prisma.store.findFirst({
      where: { id: storeId, companyId },
    });

    if (!existingStore) {
      return NextResponse.json({ error: "Store not found for this company" }, { status: 404 });
    }

    // Check how many stores the company has left (we should enforce having at least one store)
    const storeCount = await prisma.store.count({
      where: { companyId },
    });

    if (storeCount <= 1) {
      return NextResponse.json(
        { error: "A company must have at least one store" },
        { status: 400 }
      );
    }

    await prisma.store.delete({
      where: { id: storeId },
    });

    return NextResponse.json({ message: "Store deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Store API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete store" },
      { status: 500 }
    );
  }
}
