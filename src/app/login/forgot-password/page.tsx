"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Package, ArrowLeft, Mail, Phone, KeyRound, CheckCircle2, Lock } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  
  // UI Steps: 'request' | 'verify' | 'success'
  const [step, setStep] = useState<"request" | "verify" | "success">("request");
  
  // Inputs
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Statuses
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Resend OTP Countdown Timer
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handler: Request OTP code
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send verification code. Please try again.");
      }

      setSuccessMsg(data.message || "OTP code has been sent to your phone!");
      setStep("verify");
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handler: Verify code and update password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (otpCode.length !== 6) {
      setError("Verification code must be 6 digits.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otpCode, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setStep("success");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Handler: Resend code
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend verification code.");
      }

      setSuccessMsg("A new verification code has been sent!");
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full mx-4">
        <div className="card shadow-lg">
          {/* Header */}
          <div className="card-header text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary-600 rounded-lg flex items-center justify-center">
                <Package className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">SwiftPOS</h1>
            <p className="text-gray-500 text-sm mt-1">
              {step === "request" && "Reset your password"}
              {step === "verify" && "Enter verification code"}
              {step === "success" && "Password reset successful"}
            </p>
          </div>

          <div className="card-content">
            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Step 1: Request OTP */}
            {step === "request" && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label htmlFor="email" className="label block mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input pl-10"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="label block mb-2">
                    Phone Number (for SMS code)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="input pl-10"
                      placeholder="e.g. 0244123456 or +233244123456"
                      required
                    />
                  </div>
                  <p className="text-gray-400 text-xs mt-1.5">
                    A 6-digit verification code will be sent to this number via SMS.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full h-11 text-base font-medium"
                >
                  {loading ? "Sending Code..." : "Send Verification Code"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </button>
              </form>
            )}

            {/* Step 2: Verify OTP & Reset Password */}
            {step === "verify" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {successMsg && (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
                    ✅ {successMsg}
                  </div>
                )}

                <div>
                  <label htmlFor="otpCode" className="label block mb-2">
                    6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <KeyRound className="w-4 h-4" />
                    </span>
                    <input
                      id="otpCode"
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      className="input pl-10 text-center font-mono tracking-widest text-lg"
                      placeholder="000000"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="label block mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input pl-10"
                      placeholder="At least 6 characters"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="label block mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input pl-10"
                      placeholder="Repeat new password"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs px-1">
                  <span className="text-gray-500">Didn&apos;t receive SMS?</span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={countdown > 0 || loading}
                    className={`font-semibold transition-colors ${
                      countdown > 0
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-primary-600 hover:text-primary-700 cursor-pointer"
                    }`}
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : "Resend Code"}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full h-11 text-base font-medium"
                >
                  {loading ? "Resetting Password..." : "Reset Password"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setStep("request");
                  }}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Change Email
                </button>
              </form>
            )}

            {/* Step 3: Success */}
            {step === "success" && (
              <div className="text-center space-y-5 py-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-9 h-9 text-green-600" />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-gray-900">Password Reset Successful</h2>
                  <p className="text-gray-500 text-sm">
                    Your password has been updated. You can now sign in with your new password.
                  </p>
                </div>

                <button
                  onClick={() => router.push("/login")}
                  className="btn btn-primary w-full h-11 text-base font-medium"
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
