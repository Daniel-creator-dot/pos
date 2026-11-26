import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ensureShopSms } from "@/lib/customers";
import { sendIntekSms } from "@/lib/sms/intek";

// GET /api/sms - Get SMS logs and configuration
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin or superadmin can view SMS logs
    if (session.user.role.name !== "admin" && session.user.role.name !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);                              
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (session.user.companyId) {
      await ensureShopSms(prisma, session.user.companyId);
    }

    // Get store configuration with SMS settings
    const store = await shopStore(session.user.companyId, session.user.storeId);

    // Get SMS logs
    const where: any = {};
    if (store) {
      where.storeId = store.id;
    }
    if (session.user.role.name !== "superadmin") {
      where.companyId = session.user.companyId;
    }
    if (type) {
      where.type = type;
    }

    const smsLogs = await prisma.smsLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      config: store ? {
        enabled: store.smsEnabled,
        provider: store.smsProvider,
        senderId: store.smsSenderId,
      } : null,
      logs: smsLogs,
    });
  } catch (error) {
    console.error("SMS API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch SMS data" },
      { status: 500 }
    );
  }
}

// POST /api/sms - Send SMS or SMS campaign
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { recipients, message, recipient, type = "notification" } = body;

    if (session.user.companyId) {
      await ensureShopSms(prisma, session.user.companyId);
    }

    // Get store configuration
    const store = await shopStore(session.user.companyId, session.user.storeId);

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    if (!store.smsEnabled) {
      return NextResponse.json({ error: "SMS is not enabled" }, { status: 400 });
    }

    // Check if this is a campaign (multiple recipients) or single SMS
    if (recipients && Array.isArray(recipients)) {
      // Campaign
      if (
        session.user.role.name !== "admin" && 
        session.user.role.name !== "manager" &&
        session.user.role.name !== "superadmin"
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (!message || message.trim() === "") {
        return NextResponse.json({ error: "Message is required" }, { status: 400 });
      }

      const results = [];

      for (const rcpt of recipients) {
        try {
          const smsLogEntry = await prisma.smsLog.create({
            data: {
              storeId: store.id,
              companyId: session.user.companyId,
              recipient: rcpt,
              message,
              status: "pending",
              type: "campaign",
            },
          });

          const result = await sendSMS(store, rcpt, message);

          await prisma.smsLog.update({
            where: { id: smsLogEntry.id },
            data: {
              status: result.success ? "sent" : "failed",
              error: result.error,
            },
          });

          results.push({ recipient: rcpt, success: result.success, error: result.success ? undefined : publicSmsError(result.error) });
        } catch (error) {
          results.push({ recipient: rcpt, success: false, error: "Failed to create log" });
        }
      }

      return NextResponse.json({
        total: recipients.length,
        sent: results.filter((r: any) => r.success).length,
        failed: results.filter((r: any) => !r.success).length,
        results,
      });
    } else {
      // Single SMS
      if (!recipient) {
        return NextResponse.json({ error: "Recipient is required" }, { status: 400 });
      }

      if (!message) {
        return NextResponse.json({ error: "Message is required" }, { status: 400 });
      }

      const smsLogEntry = await prisma.smsLog.create({
        data: {
          storeId: store.id,
          recipient,
          message,
          status: "pending",
          type,
          companyId: session.user.companyId,
        },
      });

      const result = await sendSMS(store, recipient, message);

      await prisma.smsLog.update({
        where: { id: smsLogEntry.id },
        data: {
          status: result.success ? "sent" : "failed",
          error: result.error,
        },
      });

      if (result.success) {
        return NextResponse.json({ success: true, id: smsLogEntry.id });
      } else {
        return NextResponse.json({ error: publicSmsError(result.error) }, { status: 500 });
      }
    }
  } catch (error) {
    console.error("SMS API Error:", error);
    return NextResponse.json(
      { error: "Failed to send SMS" },
      { status: 500 }
    );
  }
}

function publicSmsError(error?: string) {
  if (error && error.includes("Sender ID")) {
    return "Intek is holding the sender name Swiftpos. Log in at inteksms.top, open Sender IDs, add https://posbytz.onrender.com to Swiftpos, then send again.";
  }
  return "The text could not be delivered.";
}

async function shopStore(companyId?: string | null, storeId?: string | null) {
  if (storeId) {
    const own = await prisma.store.findUnique({ where: { id: storeId } });
    if (own?.kind === "STORE") return own;
  }
  if (!companyId) return null;
  return prisma.store.findFirst({
    where: { companyId, kind: "STORE" },
  });
}

// Helper function to send SMS based on provider
async function sendSMS(store: any, recipient: string, message: string) {
  const result: { success: boolean; error?: string } = { success: false };

  try {
    if (store.smsProvider === "intek") {
      return await sendIntekSms(recipient, message, store.smsSenderId || "Swiftpos", store.smsApiKey);
    } else if (store.smsProvider === "twilio") {
      return await sendViaTwilio(store, recipient, message);
    } else if (store.smsProvider === "africas_talking") {
      return await sendViaAfricasTalking(store, recipient, message);
    } else if (store.smsProvider === "generic") {
      return await sendViaGeneric(store, recipient, message);
    } else {
      return { success: false, error: "Unknown SMS provider" };
    }
  } catch (sendError: any) {
    return { success: false, error: sendError.message };
  }
}

// Helper functions for different SMS providers
async function sendViaTwilio(_store: any, _recipient: string, _message: string) {
  return { success: false, error: "Twilio is not connected. Use Intek SMS." };
}

async function sendViaAfricasTalking(_store: any, _recipient: string, _message: string) {
  return { success: false, error: "Africa's Talking is not connected. Use Intek SMS." };
}

async function sendViaGeneric(store: any, recipient: string, message: string) {
  console.log(`[Generic] Sending SMS to ${recipient}: ${message}`);
  
  if (!store.smsEndpoint) {
    return { success: false, error: "SMS endpoint not configured" };
  }

  try {
    const response = await fetch(store.smsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(store.smsApiKey ? { "Authorization": `Bearer ${store.smsApiKey}` } : {}),
      },
      body: JSON.stringify({
        to: recipient,
        message: message,
        sender_id: store.smsSenderId,
      }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorText = await response.text();
      return { success: false, error: `API error: ${errorText}` };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}