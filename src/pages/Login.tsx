import UniversalUserForm from "@/components/auth/UniversalUserForm";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { useAuth } from "@/hooks/AuthProvider";
import { GraduationCap } from "lucide-react";
import { Link, Navigate } from "react-router";
import { useState } from "react";

const Login = () => {
  const { user, loading, year } = useAuth();
  const [mode, setMode] = useState<"login" | "create">("login");

  if (user && !loading) {
    if (year || user.role === "admin") {
      return <Navigate to="/dashboard" />;
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left Panel */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="bg-[#3ecf8e] text-black flex size-7 items-center justify-center rounded-md">
              <GraduationCap className="size-4" />
            </div>
            <span>
              EDU<span className="text-[#3ecf8e]">NEXUS</span>
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                {mode === "login" ? "Welcome back 👋" : "Join EduNexus"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {mode === "login"
                  ? "Sign in to access your school dashboard"
                  : "Register your learner, teacher or parent account"}
              </p>
            </div>

            {/* Form */}
            <UniversalUserForm type={mode} />

            {/* Toggle */}
            <div className="text-center text-sm">
              {mode === "login" ? (
                <>
                  New to EduNexus?{" "}
                  <button
                    onClick={() => setMode("create")}
                    className="font-semibold underline underline-offset-4 hover:text-[#3ecf8e]"
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already registered?{" "}
                  <button
                    onClick={() => setMode("login")}
                    className="font-semibold underline underline-offset-4 hover:text-[#3ecf8e]"
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
          <div className="inline-block bg-[#3ecf8e] text-black text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
            CAPS Aligned
          </div>
          <h2 className="text-3xl font-bold mb-2">
            Built for South African Schools
          </h2>
          <p className="text-gray-200 text-sm max-w-sm">
            From Grade R to Matric — EduNexus helps schools manage learners, timetables,
            assessments and reports, all in one place.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
