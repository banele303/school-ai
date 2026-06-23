import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/hooks/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Award, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const BADGE_PRESETS = [
  { title: "Perfect Attendance", description: "Present every school day this month!", icon: "🌟", category: "attendance" },
  { title: "Top Scorer", description: "Achieved the highest score in an exam!", icon: "🏆", category: "academic" },
  { title: "Assignment Streak", description: "Submitted 5 assignments in a row on time!", icon: "🔥", category: "academic" },
  { title: "Class Participation", description: "Outstanding classroom engagement this week.", icon: "🙋", category: "participation" },
  { title: "Helping Hand", description: "Demonstrated exceptional teamwork and peer support.", icon: "🤝", category: "participation" },
  { title: "Subject Star", description: "Showed excellent mastery of a subject.", icon: "⭐", category: "academic" },
];

const CATEGORY_COLORS: Record<string, string> = {
  attendance: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  academic: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  participation: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

export default function BadgesPage() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [isAwarding, setIsAwarding] = useState(false);

  useEffect(() => {
    if (user && user.role !== "teacher" && user.role !== "admin") {
      setSelectedStudentId(user._id);
    }
  }, [user]);

  const students = useQuery(api.users.getUsers, isTeacher ? { role: "student" } : "skip");
  const badges = useQuery(api.badges.getMyBadges,
    selectedStudentId && selectedStudentId !== "all" ? { studentId: selectedStudentId as any } : {}
  );
  const awardBadge = useMutation(api.badges.awardBadge);

  const handleAward = async () => {
    if (!selectedStudentId || selectedStudentId === "all" || selectedPreset === null) return toast.error("Select a student and badge.");
    setIsAwarding(true);
    try {
      const preset = BADGE_PRESETS[selectedPreset];
      await awardBadge({ studentId: selectedStudentId as any, ...preset });
      toast.success(`Badge awarded! The student has been notified.`);
      setOpen(false);
      setSelectedPreset(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to award badge");
    } finally {
      setIsAwarding(false);
    }
  };

  const selectedStudentName = students?.find((s) => s._id === selectedStudentId)?.name;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Achievement Badges</h1>
          <p className="text-muted-foreground">
            {isTeacher ? "Recognise and reward outstanding students." : "View your achievement badges and progress."}
          </p>
        </div>
        {isTeacher && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Award className="mr-2 h-4 w-4" /> Award Badge</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Award a Badge</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Student</Label>
                  <Select value={selectedStudentId === "all" ? "" : selectedStudentId} onValueChange={setSelectedStudentId}>
                    <SelectTrigger><SelectValue placeholder="Choose a student..." /></SelectTrigger>
                    <SelectContent>
                      {students?.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Select Badge</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {BADGE_PRESETS.map((p, i) => (
                      <button
                        key={i}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                          selectedPreset === i ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/60"
                        )}
                        onClick={() => setSelectedPreset(i)}
                      >
                        <span className="text-2xl">{p.icon}</span>
                        <div>
                          <p className="text-sm font-medium">{p.title}</p>
                          <p className="text-xs text-muted-foreground">{p.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <Button className="w-full" onClick={handleAward} disabled={isAwarding || !selectedStudentId || selectedStudentId === "all" || selectedPreset === null}>
                  {isAwarding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Award Badge
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Student filter */}
      {isTeacher && (
        <div className="flex items-center gap-3">
          <Select value={selectedStudentId || "all"} onValueChange={setSelectedStudentId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by student..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Badges</SelectItem>
              {students?.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {selectedStudentName && <span className="text-sm text-muted-foreground">Showing badges for <strong>{selectedStudentName}</strong></span>}
        </div>
      )}

      {/* Badge grid */}
      {badges === undefined ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : badges.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
            <Award className="h-10 w-10 opacity-30" />
            <p>
              {isTeacher
                ? "No badges awarded yet. Recognise a student's achievement!"
                : "No badges earned yet. Keep learning to earn badges!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {badges.map((badge) => (
            <Card key={badge._id} className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 space-y-3">
                <div className="text-5xl">{badge.icon}</div>
                <div>
                  <p className="font-bold text-base">{badge.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{badge.description}</p>
                </div>
                <Badge variant="outline" className={cn("text-xs capitalize", CATEGORY_COLORS[badge.category] || "")}>
                  {badge.category}
                </Badge>
                <p className="text-[11px] text-muted-foreground/70">
                  {format(new Date(badge.awardedAt), "d MMM yyyy")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
