"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Package, ArrowLeft, Mail, Phone, KeyRound, CheckCircle2, Lock, ArrowRight } from "lucide-react";

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
    <div className="min-h-screen flex bg-gray-50 animate-fade-in font-sans">
      {/* Left Panel: Brand Showcase (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 overflow-hidden items-center justify-center p-12 text-white">
        {/* Abstract design elements */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" style={{ animationDelay: "3s" }}></div>

        <div className="relative z-10 max-w-lg space-y-10">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-sm font-medium animate-fade-in shadow-inner">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-primary-100">SwiftPOS Version 2.0</span>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold tracking-tight leading-tight lg:text-5xl text-white">
              Empowering Your Retail Business
            </h2>
            <p className="text-lg text-primary-200/90 font-light leading-relaxed">
              Manage transactions, track inventory, and grow your sales with our elegant, lightning-fast point of sale system.
            </p>
          </div>

          {/* Showcase Feature List */}
          <div className="space-y-4 pt-6">
            <div className="flex items-start space-x-3 bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-all duration-200">
              <div className="p-2 bg-primary-500/20 rounded-lg text-primary-300">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Instant Inventory Sync</h4>
                <p className="text-sm text-primary-200/80 mt-0.5">Real-time stock updates across all store registers and locations.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-all duration-200">
              <div className="p-2 bg-primary-500/20 rounded-lg text-primary-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-white">Advanced Sales Analytics</h4>
                <p className="text-sm text-primary-200/80 mt-0.5">Gain key insights into sales, margins, and popular categories instantly.</p>
              </div>
            </div>
          </div>

          {/* Footer badge */}
          <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs text-primary-300">
            <span>© 2026 SwiftPOS Systems</span>
            <span>Secure Enterprise Terminal</span>
          </div>
        </div>
      </div>

      {/* Right Panel: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 md:p-16">
        <div className="max-w-md w-full space-y-8 animate-slide-up">
          {/* Header */}
          <div className="text-center lg:text-left space-y-3">
            <div className="flex justify-center lg:justify-start">
              <div className="w-14 h-14 bg-gradient-to-tr from-primary-600 to-primary-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/20 transition-transform duration-300 hover:scale-105">
                <Package className="w-8 h-8 text-white animate-pulse" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mt-4">SwiftPOS Terminal</h1>
            <p className="text-sm text-gray-500">
              {step === "request" && "Enter your email and phone to receive a verification code."}
              {step === "verify" && "Enter the 6-digit code sent to your phone number."}
              {step === "success" && "Your password has been successfully updated."}
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl border border-gray-150 p-8 shadow-xl shadow-gray-200/50">
            {/* Error */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-150 text-red-600 rounded-xl text-sm flex items-start space-x-2 animate-shake">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: Request OTP */}
            {step === "request" && (
              <form onSubmit={handleRequestOtp} className="space-y-5 animate-fade-in">
                <div className="group">
                  <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 group-focus-within:text-primary-600 transition-colors duration-150">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-500 transition-colors duration-150">
                      <Mail className="w-5 h-5" />
                    </span>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input pl-10 h-11 border-gray-200 rounded-xl transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 placeholder:text-gray-400 text-gray-900 bg-white"
                      placeholder="name@store.com"
                      required
                    />
                  </div>
                </div>

                <div className="group">
                  <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 group-focus-within:text-primary-600 transition-colors duration-150">
                    Phone Number (for SMS code)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-500 transition-colors duration-150">
                      <Phone className="w-5 h-5" />
                    </span>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="input pl-10 h-11 border-gray-200 rounded-xl transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 placeholder:text-gray-400 text-gray-900 bg-white"
                      placeholder="e.g. 0244123456"
                      required
                    />
                  </div>
                  <p className="text-gray-400 text-xs mt-2 leading-relaxed">
                    A 6-digit verification code will be sent to this number via SMS.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full h-11 rounded-xl text-base font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/15 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 hover:-translate-y-0.5 active:translate-y-0 bg-primary-600 text-white hover:bg-primary-700 flex items-center justify-center gap-2 cursor-pointer disabled:pointer-events-none disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending Code...
                    </>
                  ) : (
                    <>
                      Send Verification Code
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="w-full text-center text-sm font-semibold text-gray-500 hover:text-gray-700 py-2 flex items-center justify-center gap-1.5 transition-colors duration-150"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </button>
              </form>
            )}

            {/* Step 2: Verify OTP & Reset Password */}
            {step === "verify" && (
              <form onSubmit={handleResetPassword} className="space-y-5 animate-fade-in">
                {successMsg && (
                  <div className="p-3.5 bg-green-50 border border-green-150 text-green-700 rounded-xl text-sm flex items-start space-x-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{successMsg}</span>
                  </div>
                )}

                <div className="group">
                  <label htmlFor="otpCode" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 group-focus-within:text-primary-600 transition-colors duration-150">
                    6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-500 transition-colors duration-150">
                      <KeyRound className="w-5 h-5" />
                    </span>
                    <input
                      id="otpCode"
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      className="input pl-10 h-11 border-gray-200 rounded-xl transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 placeholder:text-gray-400 text-gray-900 bg-white text-center font-mono tracking-widest text-lg animate-pulse"
                      placeholder="000000"
                      required
                    />
                  </div>
                </div>

                <div className="group">
                  <label htmlFor="newPassword" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 group-focus-within:text-primary-600 transition-colors duration-150">
                    New Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-500 transition-colors duration-150">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input pl-10 h-11 border-gray-200 rounded-xl transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 placeholder:text-gray-400 text-gray-900 bg-white"
                      placeholder="At least 6 characters"
                      required
                    />
                  </div>
                </div>

                <div className="group">
                  <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 group-focus-within:text-primary-600 transition-colors duration-150">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-500 transition-colors duration-150">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input pl-10 h-11 border-gray-200 rounded-xl transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 placeholder:text-gray-400 text-gray-900 bg-white"
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
                    className={`font-semibold transition-colors duration-150 ${
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
                  className="btn btn-primary w-full h-11 rounded-xl text-base font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/15 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 hover:-translate-y-0.5 active:translate-y-0 bg-primary-600 text-white hover:bg-primary-700 flex items-center justify-center gap-2 cursor-pointer disabled:pointer-events-none disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Resetting Password...
                    </>
                  ) : (
                    <>
                      Reset Password
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setStep("request");
                  }}
                  className="w-full text-center text-sm font-semibold text-gray-500 hover:text-gray-700 py-2 flex items-center justify-center gap-1.5 transition-colors duration-150"
                >
                  <ArrowLeft className="w-4 h-4" /> Change Email
                </button>
              </form>
            )}

            {/* Step 3: Success */}
            {step === "success" && (
              <div className="text-center space-y-6 py-4 animate-fade-in">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/10 animate-bounce">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900 font-sans">Success!</h2>
                  <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
                    Your password has been successfully updated. You can now securely sign in to your POS terminal.
                  </p>
                </div>

                <button
                  onClick={() => router.push("/login")}
                  className="btn btn-primary w-full h-11 rounded-xl text-base font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/15 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 hover:-translate-y-0.5 active:translate-y-0 bg-primary-600 text-white hover:bg-primary-700 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Back to Sign In
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
