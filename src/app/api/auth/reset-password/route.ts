import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { prisma } = await import("@/lib/prisma");
    const body = await request.json();
    const { email, otpCode, newPassword } = body;

    if (!email || !otpCode || !newPassword) {
      return NextResponse.json({ error: "Email, verification code, and new password are required" }, { status: 400 });
    }

    if (otpCode.length !== 6) {
      return NextResponse.json({ error: "Verification code must be 6 digits" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters long" }, { status: 400 });
    }

    // 1. Find user in the database
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json({ error: "No user associated with this email address" }, { status: 400 });
    }

    // 2. Find the latest valid OTP token for this user
    const activeToken = await prisma.otpToken.findFirst({
      where: {
        userId: user.id,
        code: otpCode,
        isUsed: false,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!activeToken) {
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
    }

    // 3. Hash the new password using bcryptjs
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // 4. Update the user password and invalidate the token inside a transaction to ensure data integrity
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      }),
      prisma.otpToken.update({
        where: { id: activeToken.id },
        data: { isUsed: true }
      })
    ]);

    return NextResponse.json({ 
      success: true, 
      message: "Your password has been successfully updated. You can now log in with your new password." 
    });

  } catch (error: any) {
    console.error("[ResetPassword API Error]:", error);
    return NextResponse.json({ error: "Internal server error occurred while resetting password" }, { status: 500 });
  }
}
