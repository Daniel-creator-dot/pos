"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Package, ArrowLeft, Mail, Phone, KeyRound, CheckCircle2, Lock, Sparkles } from "lucide-react";

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

      setSuccessMsg(data.message || "OTP code has been successfully dispatched!");
      setStep("verify");
      setCountdown(60); // Enable 60-second resend limit
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

      setSuccessMsg("A new verification code has been dispatched!");
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-emerald-950 p-4 transition-all duration-500">
      <div className="max-w-md w-full mx-auto transform transition-all duration-300">
        
        {/* Card wrapper with premium subtle emerald glow */}
        <div className="relative group overflow-hidden bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl p-8 before:absolute before:inset-0 before:bg-gradient-to-tr before:from-emerald-500/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-700">
          
          {/* Logo Section */}
          <div className="text-center mb-6 relative">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 transform group-hover:scale-105 transition-transform duration-300">
                <Package className="w-9 h-9 text-slate-950" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              SwiftPOS Security <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            </h1>
            <p className="text-slate-400 text-sm mt-1.5">
              {step === "request" && "Password Recovery Protocol"}
              {step === "verify" && "OTP Authentication"}
              {step === "success" && "Success Confirmed"}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-4.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-sm leading-relaxed flex gap-2 animate-shake animate-duration-300">
              <span className="font-semibold">⚠️ Alert:</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form Step 1: Identification & SMS Details */}
          {step === "request" && (
            <form onSubmit={handleRequestOtp} className="space-y-5 relative">
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4.5 h-4.5" />
                    </span>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all shadow-inner"
                      placeholder="e.g. jeremiah@company.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Mobile Money / SMS Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Phone className="w-4.5 h-4.5" />
                    </span>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all shadow-inner"
                      placeholder="e.g. 0244123456 or +233244123456"
                      required
                    />
                  </div>
                  <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                    SMS code will be instantly dispatched using the high-performance Intek SMS engine.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Requesting OTP Code..." : "Transmit Security OTP"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/login")}
                className="w-full bg-transparent hover:bg-slate-800/30 text-slate-400 hover:text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Account Login
              </button>
            </form>
          )}

          {/* Form Step 2: Verification and Reset Password */}
          {step === "verify" && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {successMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs leading-relaxed flex gap-2">
                  <span>✨</span>
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="otpCode" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Enter 6-Digit SMS Verification Code
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <KeyRound className="w-4.5 h-4.5" />
                    </span>
                    <input
                      id="otpCode"
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white text-center font-mono tracking-widest text-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-600"
                      placeholder="XXXXXX"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Establish New Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4.5 h-4.5" />
                    </span>
                    <input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                      placeholder="At least 6 characters"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Confirm Password Choice
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4.5 h-4.5" />
                    </span>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                      placeholder="Repeat new password"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs mt-2 px-1">
                <span className="text-slate-500">Didn't receive SMS?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || loading}
                  className={`font-semibold cursor-pointer transition-colors ${
                    countdown > 0
                      ? "text-slate-500 cursor-not-allowed"
                      : "text-emerald-400 hover:text-emerald-300"
                  }`}
                >
                  {countdown > 0 ? `Resend Available in ${countdown}s` : "Resend SMS Now"}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2 mt-5 disabled:opacity-50"
              >
                {loading ? "Re-Authorizing Password..." : "Execute Reset Sequence"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep("request");
                }}
                className="w-full bg-transparent hover:bg-slate-800/30 text-slate-400 hover:text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Reset Email Address
              </button>
            </form>
          )}

          {/* Form Step 3: Success Confirmation */}
          {step === "success" && (
            <div className="text-center space-y-6 py-4 animate-fade-in animate-duration-500">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/5">
                  <CheckCircle2 className="w-11 h-11 text-emerald-400 animate-bounce" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Credentials Restored</h2>
                <p className="text-slate-400 text-sm leading-relaxed px-4">
                  Your secure POS security key has been updated successfully inside the Supabase cluster.
                </p>
              </div>

              <button
                onClick={() => router.push("/login")}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all text-sm"
              >
                Launch Account Sign In
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
