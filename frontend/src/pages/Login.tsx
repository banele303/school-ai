import UniversalUserForm from "@/components/auth/UniversalUserForm";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { SchoolBrand } from "@/components/brand/SchoolBrand";
import { useAuth } from "@/hooks/AuthProvider";
import { Navigate } from "react-router";
import { useState } from "react";

const Login = () => {
  const { user, loading, year } = useAuth();
  const [mode, setMode] = useState<"login" | "create">("login");

  // If already logged in, redirect to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left Panel */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <SchoolBrand compact />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                {mode === "login" ? "Welcome back" : "Join Vhembe Rising Star Academy"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {mode === "login"
                  ? "Sign in to access your school dashboard"
                  : "Register your learner, teacher or parent account"}
              </p>
            </div>

            {/* Form */}
            {mode === "login" && (
              <>
                <GoogleSignInButton />
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-2 text-muted-foreground">
                      or continue with email
                    </span>
                  </div>
                </div>
              </>
            )}
            <UniversalUserForm type={mode} />

            {/* Toggle */}
            <div className="text-center text-sm">
              {mode === "login" ? (
                <>
                  New to Vhembe Rising Star Academy?{" "}
                  <button
                    onClick={() => setMode("create")}
                    className="font-semibold underline underline-offset-4 hover:text-[#dc2626]"
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already registered?{" "}
                  <button
                    onClick={() => setMode("login")}
                    className="font-semibold underline underline-offset-4 hover:text-[#dc2626]"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>

            {/* SA Compliance note */}
            <p className="text-center text-xs text-muted-foreground">
              Protected under{" "}
              <span className="font-medium">POPIA</span> &amp; aligned with{" "}
              <span className="font-medium">DBE</span> guidelines.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel — SA School Image */}
      <div className="relative hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=1400"
          alt="South African learners in classroom"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-12 left-10 right-10 text-white">
          <div className="inline-block bg-[#dc2626] text-black text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
            CAPS Aligned
          </div>
          <h2 className="text-3xl font-bold mb-2">
            Built for South African Schools
          </h2>
          <p className="text-gray-200 text-sm max-w-sm">
            From Grade R to Matric, Vhembe Rising Star Academy helps schools manage learners, timetables,
            assessments and reports, all in one place.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
