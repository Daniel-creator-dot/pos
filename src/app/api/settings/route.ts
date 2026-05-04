import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxRate: number;
  currency: string;
  lowStockThreshold: number;
}

// GET /api/settings - Get store settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin can access settings
    if (session.user.role.name !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { prisma } = await import("@/lib/prisma");

    // Get the store settings
    const store = await prisma.store.findFirst();

    const defaultSettings: StoreSettings = {
      name: "SwiftPOS Store",
      address: "",
      phone: "",
      email: "",
      taxRate: 0,
      currency: "USD",
      lowStockThreshold: 5,
    };

    if (!store) {
      return NextResponse.json(defaultSettings);
    }

    // Parse settings from JSON or use defaults
    let settings: StoreSettings = defaultSettings;
    if (store.settings) {
      try {
        settings = JSON.parse(store.settings);
      } catch {
        settings = defaultSettings;
      }
    }

    // Override with store data
    settings.name = store.name;
    settings.address = store.address || "";
    settings.phone = store.phone || "";

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Settings API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update store settings
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin can update settings
    if (session.user.role.name !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: StoreSettings = await request.json();

    const { prisma } = await import("@/lib/prisma");

    // Get existing store
    const existingStore = await prisma.store.findFirst();

    // Save settings as JSON string
    const settingsJson = JSON.stringify(body);

    let store;
    if (existingStore) {
      store = await prisma.store.update({
        where: { id: existingStore.id },
        data: {
          name: body.name,
          address: body.address || null,
          phone: body.phone || null,
          settings: settingsJson,
        },
      });
    } else {
      store = await prisma.store.create({
        data: {
          name: body.name,
          address: body.address || null,
          phone: body.phone || null,
          settings: settingsJson,
        },
      });
    }

    return NextResponse.json(body);
  } catch (error) {
    console.error("Settings API Error:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}