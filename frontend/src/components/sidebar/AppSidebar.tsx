"use client";

import {
  Settings2,
  School,
  GraduationCap,
  Users,
  LayoutDashboard,
  Banknote,
  Megaphone,
  BookOpen,
  type LucideIcon,
  LogOut,
  Sparkles,
} from "lucide-react";

import { NavMain } from "@/components/sidebar/nav-main";
import { NavUser } from "@/components/sidebar/nav-user";
import { TeamSwitcher } from "@/components/sidebar/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import type { UserRole } from "@/types";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "@/hooks/AuthProvider";
import { useMemo } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToogle } from "./ThemeToogle";

export interface NavItem {
  title: string;
  url: string; // Used for linking and active state matching
  icon?: LucideIcon;
  isActive?: boolean; // Default open state for collapsibles
  roles?: UserRole[]; // Who can see this section? (undefined = everyone)
  items?: {
    title: string;
    url: string;
    roles?: UserRole[]; // Who can see this specific link?
  }[];
}

// This is sample data.
export const sidebardata = {
  teams: [
    {
      name: "Vhembe Rising Star Academy",
      logo: School,
      logoSrc: "/logo-school.jpeg",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
      roles: ["admin", "teacher", "student", "parent"],
      items: [
        { title: "Dashboard", url: "/dashboard", roles: ["admin", "teacher", "student", "parent"] },
        { title: "Parent Portal", url: "/parent-portal", roles: ["parent"] },
        { title: "Student Portal", url: "/student-portal", roles: ["student"] },
        { title: "Activities Log", url: "/activities-log", roles: ["admin"] },
        { title: "Analytics", url: "/analytics", roles: ["admin"] },
      ],
    },
    {
      title: "Resources",
      url: "/resources",
      icon: GraduationCap,
      roles: ["admin", "teacher", "student", "parent"],
      items: [
        { title: "Resource Library", url: "/resources", roles: ["admin", "teacher", "student", "parent"] },
        { title: "AI Chat", url: "/study-buddy", roles: ["admin", "teacher", "student"] },
        { title: "Whiteboard (Miro)", url: "/whiteboard", roles: ["admin", "teacher", "student", "parent"] },
        { title: "Past Papers", url: "/resources?type=past-papers", roles: ["admin", "teacher", "student", "parent"] },
        { title: "Study Materials", url: "/resources?type=study-materials", roles: ["admin", "teacher", "student", "parent"] },
      ],
    },
    {
      title: "Communication",
      url: "#",
      icon: Megaphone,
      roles: ["admin", "teacher", "student", "parent"],
      items: [
        { title: "Announcements", url: "/announcements" },
        { title: "Messages", url: "/messages" },
        { title: "Events Calendar", url: "/events" },
      ],
    },
    {
      title: "Academics",
      url: "#",
      icon: School,
      roles: ["admin", "teacher", "student", "parent"],
      items: [
        { title: "Classes", url: "/classes", roles: ["admin", "teacher"] },
        { title: "Subjects", url: "/subjects", roles: ["admin", "teacher"] },
        { title: "Timetable", url: "/timetable" },
        { title: "Attendance", url: "/attendance" },
        { title: "Learning Paths", url: "/learning-paths" },
        { title: "Report Cards", url: "/report-cards", roles: ["admin", "teacher"] },
      ],
    },
    {
      title: "Learning (LMS)",
      url: "#",
      icon: BookOpen,
      roles: ["teacher", "student", "admin"],
      items: [
        { title: "Assignments", url: "/lms/assignments" },
        { title: "Assessments", url: "/lms/exams" },
        { title: "Question Bank", url: "/lms/question-bank", roles: ["teacher", "admin"] },
        { title: "Study Materials", url: "/lms/materials" },
        { title: "Live Classes", url: "/lives" },
        { title: "Video Lessons", url: "/videos" },
      ],
    },
    {
      title: "People",
      url: "#",
      icon: Users,
      roles: ["admin", "teacher"],
      items: [
        { title: "Students", url: "/users/students" },
        { title: "Teachers", url: "/users/teachers", roles: ["admin"] },
        { title: "Parents", url: "/users/parents", roles: ["admin"] },
        { title: "Admins", url: "/users/admins", roles: ["admin"] },
        { title: "Badges", url: "/badges", roles: ["admin", "teacher"] },
      ],
    },
    {
      title: "Finance",
      url: "#",
      icon: Banknote,
      roles: ["admin"],
      items: [
        { title: "Fee Collection", url: "/finance/fees" },
        { title: "Expenses", url: "/finance/expenses" },
        { title: "Salary", url: "/finance/salary" },
      ],
    },
    {
      title: "System",
      url: "#",
      icon: Settings2,
      roles: ["admin", "teacher", "student", "parent"],
      items: [
        { title: "School Settings", url: "/settings/general", roles: ["admin"] },
        { title: "Academic Years", url: "/settings/academic-years", roles: ["admin"] },
        { title: "Roles & Permissions", url: "/settings/roles", roles: ["admin"] },
        { title: "Manage Resources", url: "/admin/resources", roles: ["admin"] },
        { title: "My Profile", url: "/profile", roles: ["admin", "teacher", "student", "parent"] },
      ],
    },
  ] as NavItem[],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, year } = useAuth();
  const { signOut } = useAuthActions();
  const location = useLocation(); // <--- Get current URL
  const pathname = location.pathname; // e.g., "/dashboard/analytics"
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const navigate = useNavigate();

  const userData = {
    name: user?.name || "User",
    email: user?.email || "",
    avatar: "",
  };

  const userRole = (user?.role || "student") as UserRole;

  const filteredNav = useMemo(() => {
    return sidebardata.navMain
      .filter((item) => !item.roles || item.roles.includes(userRole))
      .map((item) => {
        const isChildActive = item.items?.some((sub) => sub.url === pathname);
        const isMainActive = item.url === pathname;
        return {
          ...item,
          isActive: isMainActive || isChildActive,
          items: item.items
            ?.filter(
              (subItem) => !subItem.roles || subItem.roles.includes(userRole),
            )
            .map((subItem) => ({
              ...subItem,
              isActive: subItem.url === pathname,
            })),
        };
      });
  }, [pathname, userRole]);

  const logout = async () => {
    try {
      await signOut();
      navigate("/login");
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed. Please try again.");
    }
  };
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebardata.teams} yearName={year?.name!} />
      </SidebarHeader>
      {/* AI Chat Button */}
      <div className="px-3 py-2">
        <Button
          className={cn(
            "w-full gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-medium shadow-md transition-all duration-300 rounded-lg text-xs",
            isCollapsed ? "h-8 w-8 p-0 justify-center rounded-lg" : "h-9"
          )}
          onClick={() => navigate("/study-buddy")}
          title="AI Study Chat"
        >
          {!isCollapsed ? (
            <span className="flex items-center gap-1.5 justify-center">
              <Sparkles className="h-3.5 w-3.5 text-rose-100" />
              AI Study Chat
            </span>
          ) : (
            <Sparkles className="h-4 w-4 text-rose-100" />
          )}
        </Button>
      </div>
      <SidebarContent>
        <NavMain items={filteredNav} />
      </SidebarContent>
      <SidebarFooter>
        <div
          className={cn(
            "gap-2",
            isCollapsed ? "flex-row space-y-2" : "flex justify-between",
          )}
        >
          <SidebarMenuItem title="Logout">
            <Button onClick={logout} variant={"ghost"} size="icon-sm">
              <LogOut />
            </Button>
          </SidebarMenuItem>
          <ThemeToogle />
        </div>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
