import { useAuth } from "@/hooks/AuthProvider";
import { Navigate, Outlet, useLocation } from "react-router";
import { Loader2 } from "lucide-react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { GlobalSearch } from "@/components/global/GlobalSearch";
import { ThemeModeToggle } from "@/components/theme/ThemeModeToggle";

const PrivateRoutes = () => {
  const { loading, user, year, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Account Disabled Screen
  if (user.isActive === false) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950 text-center">
        <div className="max-w-md w-full p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800 space-y-6">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Account Disabled</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              Your account has been disabled by the school administrator. Please contact administration if you believe this is an error.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => void signOut()} variant="outline" className="w-full">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Approval Pending Screen
  if (user.isApproved === false && (user.role === "student" || user.role === "teacher")) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950 text-center">
        <div className="max-w-md w-full p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800 space-y-6">
          <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Approval Pending</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              Hello, <span className="font-semibold">{user.name}</span>. Your account registration is pending approval by the school administrator. You will be able to access the dashboard once approved.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={() => window.location.reload()} className="flex-1 gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3m0 0l3 3m-3-3v12" />
              </svg>
              Check Status
            </Button>
            <Button onClick={() => void signOut()} variant="outline" className="flex-1">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!year) {
    if (user.role === "admin") {
      if (location.pathname !== "/settings/academic-years") {
        return <Navigate to="/settings/academic-years" replace />;
      }
    } else {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center p-4 text-center">
          <h1 className="text-2xl font-bold mb-2">No Active Academic Year</h1>
          <p className="text-muted-foreground mb-6">
            The administrator has not set up the current academic year yet. Please check back later.
          </p>
          <Button onClick={() => void signOut()}>Sign Out</Button>
        </div>
      );
    }
  }

  const isWhiteboardCanvas = location.pathname.startsWith("/whiteboard/") && location.pathname !== "/whiteboard";
  const isLiveRoom = location.pathname.startsWith("/lives/room/");

  if (isLiveRoom || isWhiteboardCanvas) {
    return (
      <main className="h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
        <Outlet />
      </main>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-white text-gray-950 dark:bg-zinc-950 dark:text-zinc-100">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 bg-white/95 px-4 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/90 dark:border-zinc-800 dark:bg-zinc-950/90">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <GlobalSearch />
          <div className="flex-1" />
          <ThemeModeToggle />
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-auto bg-white dark:bg-zinc-950">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default PrivateRoutes;
