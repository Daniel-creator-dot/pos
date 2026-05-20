"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Package, Mail, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = session.user.role?.name;
      if (role === "cashier") {
        router.push("/pos");
      } else {
        router.push("/dashboard");
      }
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setLoading(false);
      }
      // Session will update automatically, and the useEffect will handle redirect
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  // Show loading state while checking session
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 animate-fade-in">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/20 animate-pulse">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div className="text-gray-500 font-medium text-sm animate-pulse">Loading SwiftPOS...</div>
        </div>
      </div>
    );
  }

  // If already authenticated, don't show the form (useEffect will redirect)
  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-gray-50 animate-fade-in font-sans">
      {/* Left Panel: Brand Showcase (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 overflow-hidden items-center justify-center p-12 text-white">
        {/* Abstract design elements */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" style={{ animationDelay: "3s" }}></div>

        <div className="relative z-10 w-full max-w-lg flex flex-col justify-between h-full max-h-[85%] space-y-8">
          {/* Top Brand Indicator */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/25 shadow-inner">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight block leading-none">SwiftPOS</span>
              <span className="text-xs text-primary-200 font-medium">Enterprise Retail Suite</span>
            </div>
          </div>

          {/* POS Image Showcase Container */}
          <div className="relative group flex-grow flex items-center justify-center my-6">
            {/* Ambient glow behind image */}
            <div className="absolute -inset-2 bg-gradient-to-r from-primary-500 to-blue-500 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            
            {/* Device mock structure */}
            <div className="relative w-full bg-primary-950/40 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-2xl hover:scale-[1.02] transition-all duration-500 ease-out overflow-hidden aspect-[4/3] flex items-center justify-center">
              <img
                src="/pos_terminal.png"
                alt="SwiftPOS Terminal Showcase"
                className="w-full h-full object-cover rounded-xl select-none"
                draggable={false}
              />
            </div>
          </div>

          {/* Clean minimal footer */}
          <div className="flex items-center justify-between text-xs text-primary-300 border-t border-white/10 pt-6">
            <span>© 2026 SwiftPOS Systems</span>
            <span>All System Services Active</span>
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
            <p className="text-sm text-gray-500">Welcome back! Please enter your details to sign in.</p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl border border-gray-150 p-8 shadow-xl shadow-gray-200/50">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-150 text-red-600 rounded-xl text-sm flex items-start space-x-2 animate-shake">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">
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
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="group">
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 group-focus-within:text-primary-600 transition-colors duration-150">
                      Password
                    </label>
                    <a
                      href="/login/forgot-password"
                      className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors duration-150"
                    >
                      Forgot Password?
                    </a>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-500 transition-colors duration-150">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input pl-10 h-11 border-gray-200 rounded-xl transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 placeholder:text-gray-400 text-gray-900 bg-white"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                    />
                  </div>
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
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}