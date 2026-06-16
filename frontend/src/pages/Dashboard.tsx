import { useAuth } from "@/hooks/AuthProvider";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Calendar, FileText, GraduationCap, Sparkles, Video, BookOpen,
  Trophy, Flame, TrendingUp, Clock, ArrowRight, Play, MessageSquare,
  Award, Target, Zap, Users, Radio, Rocket
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const statsData = useQuery(api.stats.getDashboardStats);
  const upcomingEvents = useQuery(api.events.getUpcomingEvents);
  const announcements = useQuery(api.announcements.getAnnouncements);
  const unreadCount = useQuery(api.notifications.getUnreadCount);

  // Student-specific queries
  const myXP = user?.role === "student" ? useQuery(api.gamification.getMyXP, {}) : null;
  const upcomingClasses = user?.role === "student" ? useQuery(api.liveClasses.getUpcomingClassesForStudent, {}) : null;
  const myProgress = user?.role === "student" ? useQuery(api.videoLibrary.getMyProgress, {}) : null;
  const mySubmissions = useQuery(api.submissions.getSubmissions, user ? { examId: undefined as any } : "skip");
  const myFees = useQuery(api.finance.getFees, user ? {} : "skip");

  // Teacher-specific queries
  const teacherClasses = (user?.role === "teacher" || user?.role === "admin")
    ? useQuery(api.liveClasses.getTeacherLiveClasses, {}) : null;

  const loading = statsData === undefined;

  const quickLinks = [
    { label: "Live Classes", icon: Radio, path: "/lives", roles: ["admin", "teacher", "student"], color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Video Library", icon: Video, path: "/videos", roles: ["admin", "teacher", "student"], color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Study Buddy", icon: Sparkles, path: "/study-buddy", roles: ["admin", "teacher", "student"], color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "AI Marking Desk", icon: FileText, path: "/ai/marking", roles: ["admin", "teacher"], color: "text-rose-500", bg: "bg-rose-500/10" },
    // { label: "Premium Suite", icon: Rocket, path: "/command-center", roles: ["admin", "teacher"], color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Homework Checker", icon: FileText, path: "/ai/homework", roles: ["admin", "teacher", "student"], color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Study Groups", icon: Users, path: "/groups", roles: ["admin", "teacher", "student"], color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Resources", icon: BookOpen, path: "/resources", roles: ["admin", "teacher", "student", "parent"], color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "Timetable", icon: Calendar, path: "/timetable", roles: ["admin", "teacher", "student", "parent"], color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { label: "Exams", icon: GraduationCap, path: "/lms/exams", roles: ["admin", "teacher", "student"], color: "text-orange-500", bg: "bg-orange-500/10" },
  ].filter(l => l.roles.includes(user?.role || "student"));

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const isStudent = user?.role === "student";
  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isStudent ? "My Learning Dashboard" : isTeacher ? "Teacher Dashboard" : "Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {user?.name?.split(" ")[0]}! 👋
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isStudent && myXP && (
            <div className="flex items-center gap-2 bg-amber-500/10 px-4 py-2 rounded-full">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">Level {myXP.level}</span>
              <span className="text-xs text-muted-foreground">{myXP.totalXP} XP</span>
            </div>
          )}
          {!!unreadCount && unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => navigate("/messages")} className="gap-2">
              <MessageSquare className="h-4 w-4" /> {unreadCount} new
            </Button>
          )}
        </div>
      </div>

      {/* Student-specific XP & Streak Banner */}
      {isStudent && myXP && (
        <Card className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-amber-200 dark:border-amber-900">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <span className="text-2xl font-bold">{myXP.totalXP}</span>
                </div>
                <p className="text-xs text-muted-foreground">Total XP</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Zap className="h-5 w-5 text-purple-500" />
                  <span className="text-2xl font-bold">{myXP.level}</span>
                </div>
                <p className="text-xs text-muted-foreground">Level</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Flame className="h-5 w-5 text-red-500" />
                  <span className="text-2xl font-bold">{myXP.currentStreak}</span>
                </div>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold">{myXP.longestStreak}</span>
                </div>
                <p className="text-xs text-muted-foreground">Best Streak</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Progress to Level {myXP.level + 1}</span>
                <span>{myXP.totalXP % 100}/100 XP</span>
              </div>
              <Progress value={myXP.totalXP % 100} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickLinks.map(({ label, icon: Icon, path, color, bg }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all text-left group"
          >
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", bg)}>
              <Icon className={cn("h-5 w-5", color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{label}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        {/* Left column */}
        <div className="col-span-4 space-y-4">
          {/* Upcoming Live Classes */}
          {(isStudent ? upcomingClasses : teacherClasses) && (isStudent ? upcomingClasses : teacherClasses)?.length > 0 && (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Radio className="h-4 w-4 text-red-500" />
                    {isStudent ? "Upcoming Live Classes" : "Your Scheduled Classes"}
                  </CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/lives")}>View all</Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {(isStudent ? upcomingClasses : teacherClasses)?.slice(0, 3).map((c: any) => (
                  <div key={c._id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      c.status === "live" ? "bg-red-500" : "bg-blue-500"
                    )}>
                      {c.status === "live" ? <Radio className="h-5 w-5 text-white animate-pulse" /> : <Video className="h-5 w-5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(c.startTime), "EEE, d MMM • h:mm a")}
                      </p>
                    </div>
                    {c.status === "live" && (
                      <Badge className="bg-red-500 text-white animate-pulse shrink-0">LIVE</Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Video Progress (Student) */}
          {isStudent && myProgress && myProgress.length > 0 && (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Play className="h-4 w-4 text-purple-500" /> Continue Watching
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/videos")}>All videos</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {myProgress.filter((p: any) => !p.completed).slice(0, 3).map((p: any) => (
                  <div key={p._id} className="flex items-center gap-3">
                    <div className="w-16 h-10 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                      <Play className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.videoTitle}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={p.percentage} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground shrink-0">{Math.round(p.percentage)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Announcements */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Latest Announcements</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/announcements")}>View all</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {announcements === undefined ? (
                <Skeleton className="h-20 w-full" />
              ) : announcements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No announcements yet.</p>
              ) : (
                announcements.slice(0, 3).map((ann: any) => (
                  <div key={ann._id} className={cn("border-l-4 pl-3 py-2 rounded-sm",
                    ann.priority === "urgent" ? "border-l-red-500 bg-red-500/5" : "border-l-blue-500 bg-blue-500/5"
                  )}>
                    <p className="text-sm font-medium truncate">{ann.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{ann.content}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {formatDistanceToNow(new Date(ann._creationTime), { addSuffix: true })}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="col-span-3 space-y-4">
          {/* Upcoming Events */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" /> Upcoming Events
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/events")}>Calendar</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingEvents === undefined ? (
                <Skeleton className="h-20 w-full" />
              ) : upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No upcoming events.</p>
              ) : (
                upcomingEvents.slice(0, 4).map((ev: any) => (
                  <div key={ev._id} className="flex items-center gap-3">
                    <div className={cn("w-2 h-10 rounded-full shrink-0",
                      ev.type === "exam" ? "bg-red-500" : ev.type === "sports" ? "bg-green-500" : ev.type === "holiday" ? "bg-amber-500" : "bg-blue-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ev.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(ev.date + "T00:00:00"), "EEE, d MMM yyyy")}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Badges (Student) */}
          {isStudent && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" /> Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <Trophy className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                  <p className="text-sm font-semibold">Keep learning to earn badges!</p>
                  <p className="text-xs text-muted-foreground mt-1">Watch videos, attend classes, and complete exams</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/badges")}>View All Badges</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
