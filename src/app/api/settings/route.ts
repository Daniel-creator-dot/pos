import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureShopSms } from "@/lib/customers";

interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxRate: number;
  currency: string;
  lowStockThreshold: number;
  smsEnabled: boolean;
  smsProvider: string;
  smsApiKey: string;
  smsApiSecret: string;
  smsSenderId: string;
  smsEndpoint: string;
}

// GET /api/settings - Get store settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/prisma");

    // Get the store settings
    const store = await prisma.store.findFirst({
      where: {
        id: session.user.storeId || undefined,
        companyId: session.user.companyId || undefined,
      }
    });

    const defaultSettings: StoreSettings = {
      name: "SwiftPOS Store",
      address: "",
      phone: "",
      email: "",
      taxRate: 0,
      currency: "GHS",
      lowStockThreshold: 5,
      smsEnabled: true,
      smsProvider: "intek",
      smsApiKey: "",
      smsApiSecret: "",
      smsSenderId: "Swiftpos",
      smsEndpoint: "",
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

    if (session.user.companyId) {
      await ensureShopSms(prisma, session.user.companyId);
    }
    const smsStore = session.user.companyId
      ? await prisma.store.findFirst({ where: { companyId: session.user.companyId, kind: "STORE" } })
      : store;

    // Override with store data. The API key stays on the server.
    settings.name = store.name;
    settings.address = store.address || "";
    settings.phone = store.phone || "";
    settings.smsEnabled = smsStore?.smsEnabled ?? false;
    settings.smsProvider = smsStore?.smsProvider || "intek";
    settings.smsSenderId = smsStore?.smsSenderId || "Swiftpos";
    settings.smsEndpoint = smsStore?.smsEndpoint || "";
    settings.smsApiKey = "";
    settings.smsApiSecret = "";

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
    const { smsApiKey, smsApiSecret, ...settingsWithoutSecrets } = body;

    const { prisma } = await import("@/lib/prisma");

    // Get existing store
    const existingStore = await prisma.store.findFirst({
      where: {
        id: session.user.storeId || undefined,
        companyId: session.user.companyId || undefined,
      }
    });

    const settingsJson = JSON.stringify({
      ...settingsWithoutSecrets,
      smsApiKey: "",
      smsApiSecret: "",
    });
    const smsData = {
      smsEnabled: Boolean(body.smsEnabled),
      smsProvider: body.smsProvider || "intek",
      smsSenderId: body.smsSenderId || "Swiftpos",
      smsEndpoint: body.smsEndpoint || null,
      ...(smsApiKey ? { smsApiKey } : {}),
      ...(smsApiSecret ? { smsApiSecret } : {}),
    };

    let store;
    if (existingStore) {
      store = await prisma.store.update({
        where: { id: existingStore.id },
        data: {
          name: body.name,
          address: body.address || null,
          phone: body.phone || null,
          settings: settingsJson,
          ...smsData,
        },
      });
    } else {
      store = await prisma.store.create({
        data: {
          name: body.name,
          address: body.address || null,
          phone: body.phone || null,
          settings: settingsJson,
          companyId: session.user.companyId,
          kind: "STORE",
          ...smsData,
        },
      });
    }

    return NextResponse.json({ ...settingsWithoutSecrets, smsApiKey: "", smsApiSecret: "" });
  } catch (error) {
    console.error("Settings API Error:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}