// Cache invalidation trigger
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, GraduationCap, Calendar, CreditCard, Activity, Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function ParentPortal() {
  const me = useQuery(api.users.getMe);
  const data = useQuery(api.parents.getStudentOverview);
  
  if (me === undefined || data === undefined) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!me || me.role !== "parent") {
    return <div className="p-8 text-center text-muted-foreground">This portal is restricted to Parents only.</div>;
  }

  if (data === null || ("error" in data)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-6">
          <User className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No Student Linked</h2>
        <p className="text-muted-foreground max-w-md">
          {data && "error" in data ? (data as any).error : "Your account has not been linked to a student yet. Please contact the school administrator to link your child's profile to your account."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Student Profile Overview */}
        <Card className="flex-1 w-full bg-gradient-to-br from-card to-card/50 border-primary/10 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-5">
              <Avatar className="h-20 w-20 border-4 border-background shadow-xl">
                <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                  {(data as any).studentName?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{(data as any).studentName}</h2>
                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                  <GraduationCap className="h-4 w-4" /> Grade {(data as any).className}
                </p>
                <div className="flex gap-2 mt-3">
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">Good Standing</Badge>
                  <Badge variant="outline">Attendance: {(data as any).attendanceRate}%</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 w-full md:w-[400px]">
          <Card className="bg-card">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
              <div className="bg-blue-500/10 p-2 rounded-full mb-2"><Activity className="h-5 w-5 text-blue-500" /></div>
              <p className="text-2xl font-bold">{(data as any).attendanceRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Attendance</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
              <div className="bg-rose-500/10 p-2 rounded-full mb-2"><CreditCard className="h-5 w-5 text-rose-500" /></div>
              <p className="text-2xl font-bold text-rose-500">R {(data as any).totalFeesDue}</p>
              <p className="text-xs text-muted-foreground mt-1">Fees Due</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Grades */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> Recent Grades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!((data as any)?.recentGrades?.length) ? (
              <p className="text-center py-6 text-muted-foreground">No recent grades found.</p>
            ) : ((data as any)?.recentGrades || []).map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div>
                  <p className="font-semibold">{item.subject}</p>
                  <p className="text-xs text-muted-foreground">{item.type} • {item.date}</p>
                </div>
                <div className="text-lg font-bold text-primary">{item.grade}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Events & Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Schedule & Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex items-start gap-3">
              <Bell className="h-5 w-5 text-rose-500 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-500">School Notice</p>
                <p className="text-sm mt-1">Please check the Announcements tab for the latest school-wide updates.</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-semibold mb-3">Recent Attendance</h4>
              <div className="flex gap-2">
                {((data as any)?.attendanceHistory || []).slice(0, 5).map((att: any, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">{att.date.split("/").slice(0, 2).join("/")}</span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${att.status === 'absent' ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                      {att.status === 'present' ? 'P' : att.status === 'late' ? 'L' : 'A'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
