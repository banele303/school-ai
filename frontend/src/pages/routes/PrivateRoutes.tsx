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
