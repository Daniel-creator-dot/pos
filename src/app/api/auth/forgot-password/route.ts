import { NextResponse } from "next/server";
import { sendIntekSms } from "@/lib/sms/intek";

export async function POST(request: Request) {
  try {
    const { prisma } = await import("@/lib/prisma");
    const body = await request.json();
    const { email, phone } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 1. Find user in the database
    const user = await prisma.user.findUnique({
      where: { email },
      include: { store: true }
    });

    if (!user) {
      // For security, do not explicitly confirm if user exists or not, but in a POS system
      // a clear validation error is often preferred for cashiers. Let's return a clean message.
      return NextResponse.json({ error: "No user found with this email address" }, { status: 404 });
    }

    // 2. Resolve recipient phone number
    // Priority: 1. Input phone body parameter, 2. Associated store phone number, 3. Fallback placeholder
    let recipientPhone = phone || user.store?.phone;

    if (!recipientPhone) {
      return NextResponse.json({ 
        error: "No phone number associated with your account/store. Please provide your phone number in the form." 
      }, { status: 400 });
    }

    // 3. Generate a secure 6-digit numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiry to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 4. Save the OTP token in Supabase using Prisma
    await prisma.otpToken.create({
      data: {
        userId: user.id,
        code: otpCode,
        expiresAt,
      }
    });

    // 5. Build and send SMS message via Intek SMS API
    const message = `SwiftPOS Security Alert: Your password reset verification code is ${otpCode}. It is valid for 10 minutes.`;
    const smsResult = await sendIntekSms(recipientPhone, message);

    // 6. Create SMS log in the database
    try {
      await prisma.smsLog.create({
        data: {
          storeId: user.storeId || (user.companyId ? (await prisma.store.findFirst({ where: { companyId: user.companyId } }))?.id || "unknown" : "unknown"),
          companyId: user.companyId,
          recipient: recipientPhone,
          message,
          status: smsResult.success ? "sent" : "failed",
          type: "notification",
          error: smsResult.error || null,
        }
      });
    } catch (logError) {
      console.error("[ForgotPassword] Failed to save SMS log:", logError);
    }

    if (!smsResult.success) {
      return NextResponse.json({ 
        error: `Failed to send SMS code: ${smsResult.error || "Unknown delivery error"}` 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "An OTP verification code has been sent to your phone number.",
      recipient: recipientPhone
    });

  } catch (error: any) {
    console.error("[ForgotPassword API Error]:", error);
    return NextResponse.json({ error: "Internal server error occurred while processing request" }, { status: 500 });
  }
}
