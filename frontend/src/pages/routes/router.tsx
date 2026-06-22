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
import ExamArena from "@/pages/lms/ExamArena";
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
import ResourceLibrary from "@/pages/ResourceLibrary";
import AdminResources from "@/pages/admin/ResourceManagement";
import LiveClassesPage from "@/pages/lives/LiveClasses";
import LiveRoomPage from "@/pages/lives/LiveRoom";
import VideoLibraryPage from "@/pages/videos/VideoLibrary";
import HomeworkCheckerPage from "@/pages/ai/HomeworkChecker";
import AIMarkingPage from "@/pages/ai/AIMarking";
import StudyGroupsPage from "@/pages/groups/StudyGroups";
import PeerTutoringPage from "@/pages/tutoring/PeerTutoring";
import SchoolOnboarding from "@/pages/admin/SchoolOnboarding";
import PremiumSuite from "@/pages/premium/PremiumSuite";
import WhiteboardList from "@/pages/whiteboard/WhiteboardList";
import WhiteboardPage from "@/pages/whiteboard/WhiteboardPage";

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

      // Live Classes
      { path: "lives", element: <LiveClassesPage /> },
      { path: "lives/room/:id", element: <LiveRoomPage /> },
      { path: "videos", element: <VideoLibraryPage /> },

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
      { path: "lms/assignments", element: <AssignmentsPage /> },
      { path: "lms/assignments/:id", element: <AssignmentDetails /> },
      { path: "lms/exams", element: <Exams /> },
      { path: "lms/exams/:id", element: <Exam /> },
      { path: "lms/exams/:id/arena", element: <ExamArena /> },
      { path: "lms/exam-arena", element: <ExamArena /> },
      { path: "lms/question-bank", element: <QuestionBank /> },
      { path: "lms/materials", element: <MaterialsPage /> },

      // Finance
      { path: "command-center", element: <PremiumSuite /> },
        { path: "whiteboard", element: <WhiteboardList /> },
        { path: "whiteboard/:id", element: <WhiteboardPage /> },
      { path: "lesson-studio", element: <PremiumSuite /> },
      { path: "student-timeline", element: <PremiumSuite /> },
      { path: "parent-reports", element: <PremiumSuite /> },
      { path: "class-engagement", element: <PremiumSuite /> },
      { path: "recording-studio", element: <PremiumSuite /> },
      { path: "teacher-marketplace", element: <PremiumSuite /> },
      { path: "offline-mode", element: <PremiumSuite /> },
      { path: "white-label", element: <PremiumSuite /> },
      { path: "ai-tutor-memory", element: <PremiumSuite /> },
    ],
  },
]);

