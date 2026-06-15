import { createBrowserRouter } from "react-router";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Pricing from "@/pages/Pricing";
import FAQ from "@/pages/FAQ";
import PrivateRoutes from "@/pages/routes/PrivateRoutes";
import Dashboard from "@/pages/Dashboard";
import AcademicYear from "@/pages/settings/academic-year";
import UserManagementPage from "@/pages/users";
import Classes from "@/pages/academics/Classes";
import { Subjects } from "@/pages/academics/Subjects";
import Timetable from "@/pages/academics/Timetable";
import Exams from "@/pages/lms/Exams";
import Exam from "../lms/Exam";
import GeneralSettings from "@/pages/settings/general";
import RolesPermissions from "@/pages/settings/roles";
import AttendancePage from "@/pages/academics/Attendance";
import FeesPage from "@/pages/finance/fees";
import ExpensesPage from "@/pages/finance/expenses";
import AssignmentsPage from "@/pages/lms/Assignments";
import MaterialsPage from "@/pages/lms/Materials";
import QuestionBank from "@/pages/lms/QuestionBank";
import SalaryPage from "@/pages/finance/salary";
import AnnouncementsPage from "@/pages/Announcements";
import EventsCalendar from "@/pages/EventsCalendar";
import MessagesPage from "@/pages/Messages";
import AnalyticsPage from "@/pages/Analytics";
import BadgesPage from "@/pages/Badges";
import LearningPathsPage from "@/pages/academics/LearningPaths";

import ParentPortal from "@/pages/ParentPortal";
import StudentPortal from "@/pages/StudentPortal";
import StudyBuddyPage from "@/pages/StudyBuddy";
import ProfileSettings from "@/pages/ProfileSettings";
import ReportCardGenerator from "@/pages/academics/ReportCard";
import AssignmentDetails from "@/pages/lms/AssignmentDetails";
import LiveClassesPage from "@/pages/lms/LiveClasses";
import ResourceLibrary from "@/pages/ResourceLibrary";
import AdminResources from "@/pages/admin/ResourceManagement";

export const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "login", element: <Login /> },
  { path: "about", element: <About /> },
  { path: "contact", element: <Contact /> },
  { path: "pricing", element: <Pricing /> },
  { path: "faq", element: <FAQ /> },
  {
    element: <PrivateRoutes />,
    children: [
      { path: "dashboard", element: <Dashboard /> },
      { path: "activities-log", element: <Dashboard /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "parent-portal", element: <ParentPortal /> },
      { path: "student-portal", element: <StudentPortal /> },
      { path: "study-buddy", element: <StudyBuddyPage /> },
      { path: "profile", element: <ProfileSettings /> },
      { path: "resources", element: <ResourceLibrary /> },
      { path: "admin/resources", element: <AdminResources /> },

      // Communication
      { path: "announcements", element: <AnnouncementsPage /> },
      { path: "messages", element: <MessagesPage /> },
      { path: "events", element: <EventsCalendar /> },

      // Settings
      { path: "settings/academic-years", element: <AcademicYear /> },
      { path: "settings/general", element: <GeneralSettings /> },
      { path: "settings/roles", element: <RolesPermissions /> },

      // People
      { path: "users/students", element: <UserManagementPage role="student" title="Students" description="Manage student directory and class assignments." /> },
      { path: "users/teachers", element: <UserManagementPage role="teacher" title="Teachers" description="Manage teaching staff." /> },
      { path: "users/parents", element: <UserManagementPage role="parent" title="Parents" description="Manage Parents." /> },
      { path: "users/admins", element: <UserManagementPage role="admin" title="Admins" description="Manage Admins." /> },
      { path: "badges", element: <BadgesPage /> },

      // Academics
      { path: "classes", element: <Classes /> },
      { path: "subjects", element: <Subjects /> },
      { path: "timetable", element: <Timetable /> },
      { path: "attendance", element: <AttendancePage /> },
      { path: "learning-paths", element: <LearningPathsPage /> },
      { path: "report-cards", element: <ReportCardGenerator /> },

      // LMS
      { path: "lms/live", element: <LiveClassesPage /> },
      { path: "lms/assignments", element: <AssignmentsPage /> },
      { path: "lms/assignments/:id", element: <AssignmentDetails /> },
      { path: "lms/exams", element: <Exams /> },
      { path: "lms/exams/:id", element: <Exam /> },
      { path: "lms/question-bank", element: <QuestionBank /> },
      { path: "lms/materials", element: <MaterialsPage /> },

      // Finance
      { path: "finance/fees", element: <FeesPage /> },
      { path: "finance/expenses", element: <ExpensesPage /> },
      { path: "finance/salary", element: <SalaryPage /> },
    ],
  },
]);

