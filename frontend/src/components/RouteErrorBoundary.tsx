import { useRouteError, useNavigate } from "react-router";
import { useState } from "react";
import { AlertTriangle, RotateCcw, Home, ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RouteErrorBoundary() {
  const error: any = useRouteError();
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  console.error("RouteErrorBoundary caught error:", error);

  // Extract message and stack from error
  const errorMessage = error?.message || error?.statusText || String(error || "Unknown error occurred");
  const errorStack = error?.stack || null;
  const errorStatus = error?.status || null;

  const handleCopy = () => {
    const textToCopy = `Error Status: ${errorStatus || "N/A"}\nMessage: ${errorMessage}\n\nStack Trace:\n${errorStack || "No stack trace available."}`;
    void navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-zinc-950 to-neutral-900 text-zinc-100 font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden p-6 md:p-8 animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center">
          {/* Pulsing warning indicator */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-red-500/20 rounded-full blur-md animate-ping" />
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 text-red-500">
              <AlertTriangle className="h-8 w-8" />
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            Unexpected Application Error
          </h1>
          <p className="text-sm text-zinc-400 max-w-md mb-8">
            The application encountered a problem rendering this page. Don't worry, your progress has not been lost.
          </p>

          {/* Quick action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center mb-8">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
            <Button
              onClick={() => navigate("/dashboard")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>
        </div>

        {/* Collapsible Technical Details */}
        <div className="border-t border-zinc-800/80 pt-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-between w-full text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <span>Technical Details</span>
            <div className="flex items-center gap-1">
              {showDetails ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </button>

          {showDetails && (
            <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="flex justify-between items-center bg-zinc-950/80 border border-zinc-800 p-3 rounded-lg text-xs">
                <span className="font-mono text-red-400 break-all select-all pr-2">
                  {errorMessage}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCopy}
                  className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800 shrink-0"
                  title="Copy details"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>

              {errorStack && (
                <pre className="font-mono text-[10px] text-zinc-500 bg-zinc-950/40 border border-zinc-800 p-4 rounded-lg overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed select-all">
                  {errorStack}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
