import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ThemeProvider } from "@/components/provider/theme";
import { AuthProvider } from "@/hooks/AuthProvider";
import { Toaster } from "@/components/ui/sonner";
import { router } from "@/pages/routes/router";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    "VITE_CONVEX_URL is not set. Check your .env.local file."
  );
}

const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <ThemeProvider defaultTheme="dark" storageKey="vhembe-rising-theme">
          <AuthProvider>
            <RouterProvider router={router} />
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </ConvexAuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
