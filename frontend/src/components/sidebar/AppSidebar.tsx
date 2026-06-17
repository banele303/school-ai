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
  Video,
  Rocket,
  FileText,
  MessageSquare,
  type LucideIcon,
  LogOut,
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
import { ThemeModeToggle } from "@/components/theme/ThemeModeToggle";

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
      logoSrc: "",
    },
  ],
  navMain: [
    {
      title: "Chat",
      url: "/messages",
      icon: MessageSquare,
      isActive: false,
      roles: ["admin", "teacher", "student", "parent"],
    },
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
      title: "Learning Hub",
      url: "#",
      icon: Video,
      roles: ["admin", "teacher", "student"],
      items: [
        { title: "Live Classes", url: "/lives", roles: ["admin", "teacher", "student"] },
        { title: "Video Library", url: "/videos", roles: ["admin", "teacher", "student"] },
        { title: "Study Buddy AI", url: "/study-buddy", roles: ["admin", "teacher", "student"] },
        { title: "AI Homework", url: "/ai/homework", roles: ["admin", "teacher", "student"] },
        { title: "Study Groups", url: "/groups", roles: ["admin", "teacher", "student"] },
        { title: "Peer Tutoring", url: "/tutoring", roles: ["admin", "teacher", "student"] },
        { title: "Resource Library", url: "/resources", roles: ["admin", "teacher", "student", "parent"] },
      ],
    },
    /*
    {
      title: "Premium Suite",
      url: "#",
      icon: Rocket,
      roles: ["admin", "teacher"],
      items: [
        { title: "Command Center", url: "/command-center", roles: ["admin"] },
        { title: "Lesson Studio", url: "/lesson-studio", roles: ["admin", "teacher"] },
        { title: "Student Timeline", url: "/student-timeline", roles: ["admin", "teacher"] },
        { title: "Parent Reports", url: "/parent-reports", roles: ["admin", "teacher"] },
        { title: "Class Engagement", url: "/class-engagement", roles: ["admin", "teacher"] },
        { title: "Recording Studio", url: "/recording-studio", roles: ["admin", "teacher"] },
        { title: "Marketplace", url: "/teacher-marketplace", roles: ["admin", "teacher"] },
        { title: "Offline Mode", url: "/offline-mode", roles: ["admin"] },
        { title: "White-Label", url: "/white-label", roles: ["admin"] },
        { title: "AI Tutor Memory", url: "/ai-tutor-memory", roles: ["admin", "teacher"] },
      ],
    },
    */
    {
      title: "Communication",
      url: "#",
      icon: Megaphone,
      roles: ["admin", "teacher", "student", "parent"],
      items: [
        { title: "Announcements", url: "/announcements" },
        { title: "Chat", url: "/messages" },
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
      ],
    },
    {
      title: "AI Marking",
      url: "/ai/marking",
      icon: FileText,
      roles: ["teacher", "admin"],
      items: [
        { title: "AI Marking Desk", url: "/ai/marking", roles: ["teacher", "admin"] },
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
      roles: ["admin"],
      items: [
        { title: "School Settings", url: "/settings/general" },
        { title: "Academic Years", url: "/settings/academic-years" },
        { title: "Roles & Permissions", url: "/settings/roles" },
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
          <SidebarMenuItem title="Theme">
            <ThemeModeToggle compact={isCollapsed} />
          </SidebarMenuItem>
          <SidebarMenuItem title="Logout">
            <Button onClick={logout} variant={"ghost"} size="icon-sm">
              <LogOut />
            </Button>
          </SidebarMenuItem>
        </div>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
