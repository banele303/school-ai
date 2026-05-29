import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/AuthProvider";
import { Video, Calendar, Clock, Users, Play, Radio, CheckCircle, Upload, Plus, Timer } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  scheduled: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Clock, label: "Scheduled" },
  live: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse", icon: Radio, label: "Live Now" },
  ended: { color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: CheckCircle, label: "Ended" },
  cancelled: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Timer, label: "Cancelled" },
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube Live",
  zoom: "Zoom Meeting",
  jitsi: "Jitsi Meet",
  stream: "Live Stream",
};

export default function LiveClassesPage() {
  const { user } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const liveClasses = useQuery(api.liveClasses.getLiveClasses, {});
  const teacherClasses = user?.role === "teacher" || user?.role === "admin"
    ? useQuery(api.liveClasses.getTeacherLiveClasses, {})
    : null;
  const subjects = useQuery(api.subjects.getSubjects);

  const createLiveClass = useMutation(api.liveClasses.createLiveClass);
  const updateStatus = useMutation(api.liveClasses.updateLiveClassStatus);
  const joinClass = useMutation(api.liveClasses.joinLiveClass);

  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  const filteredClasses = (liveClasses || []).filter((c: any) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "upcoming") return c.status === "scheduled";
    if (activeFilter === "live") return c.status === "live";
    if (activeFilter === "recordings") return c.status === "ended" && c.recordingUrl;
    return true;
  });

  const handleJoinClass = async (classItem: any) => {
    if (user?.role === "student") {
      try {
        await joinClass({ liveClassId: classItem._id });
      } catch (e) {
        // Already joined or error
      }
    }
    window.open(classItem.joinUrl, "_blank");
  };

  const handleStatusChange = async (classId: any, newStatus: string) => {
    try {
      await updateStatus({ liveClassId: classId, status: newStatus });
      toast.success(`Class marked as ${newStatus}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
              <Video className="h-5 w-5 text-white" />
            </div>
            Live Classes
          </h1>
          <p className="text-muted-foreground mt-1">
            Attend live lessons, watch recordings, and learn in real-time
          </p>
        </div>
        {isTeacher && (
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2 bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4" />
            Schedule Class
          </Button>
        )}
      </div>

      {/* Live Now Banner */}
      {filteredClasses.some((c: any) => c.status === "live") && (
        <Card className="border-red-200 bg-gradient-to-r from-red-50 to-orange-50 dark:border-red-900 dark:from-red-950/30 dark:to-orange-950/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
              <Radio className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-red-800 dark:text-red-300">Live Classes Happening Now!</p>
              <p className="text-sm text-red-600 dark:text-red-400">
                {filteredClasses.filter((c: any) => c.status === "live").length} class(es) currently live — join now
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeFilter} onValueChange={setActiveFilter}>
        <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-flex">
          <TabsTrigger value="all" className="gap-2"><Video className="h-3.5 w-3.5" /> All Classes</TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-2"><Calendar className="h-3.5 w-3.5" /> Upcoming</TabsTrigger>
          <TabsTrigger value="live" className="gap-2"><Radio className="h-3.5 w-3.5" /> Live Now</TabsTrigger>
          <TabsTrigger value="recordings" className="gap-2"><Play className="h-3.5 w-3.5" /> Recordings</TabsTrigger>
        </TabsList>

        <TabsContent value={activeFilter} className="mt-6">
          {filteredClasses.length === 0 ? (
            <div className="text-center py-16">
              <Video className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">No classes found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {activeFilter === "recordings" ? "No recordings available yet" : "Check back soon for new classes"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredClasses.map((classItem: any) => {
                const statusCfg = STATUS_CONFIG[classItem.status] || STATUS_CONFIG.scheduled;
                const StatusIcon = statusCfg.icon;
                const startTime = new Date(classItem.startTime);
                const subject = subjects?.find((s: any) => s._id === classItem.subject);

                return (
                  <Card key={classItem._id} className={cn(
                    "hover:shadow-lg transition-all duration-300 overflow-hidden",
                    classItem.status === "live" && "ring-2 ring-red-500 ring-offset-2"
                  )}>
                    {/* Color bar */}
                    <div className={cn("h-1.5", classItem.status === "live" ? "bg-red-500 animate-pulse" : classItem.status === "ended" ? "bg-gray-400" : "bg-blue-500")} />

                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <Badge className={cn("text-[10px] shrink-0", statusCfg.color)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusCfg.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {PLATFORM_LABELS[classItem.platform] || classItem.platform}
                        </Badge>
                      </div>
                      <CardTitle className="text-base mt-2">{classItem.title}</CardTitle>
                      {classItem.description && (
                        <CardDescription className="text-xs line-clamp-2">{classItem.description}</CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{format(startTime, "EEE, d MMM yyyy")}</span>
                        <Clock className="h-3.5 w-3.5 ml-2" />
                        <span>{format(startTime, "h:mm a")}</span>
                      </div>

                      {subject && (
                        <Badge variant="secondary" className="text-xs">{subject.name}</Badge>
                      )}

                      {classItem.maxParticipants && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>Max {classItem.maxParticipants} participants</span>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        {(classItem.status === "live" || classItem.status === "scheduled") && (
                          <Button
                            className={cn(
                              "flex-1 gap-2",
                              classItem.status === "live"
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-blue-600 hover:bg-blue-700"
                            )}
                            onClick={() => handleJoinClass(classItem)}
                          >
                            <Play className="h-4 w-4" />
                            {classItem.status === "live" ? "Join Now" : "Join"}
                          </Button>
                        )}
                        {classItem.status === "ended" && classItem.recordingUrl && (
                          <Button variant="outline" className="flex-1 gap-2" onClick={() => window.open(classItem.recordingUrl, "_blank")}>
                            <Play className="h-4 w-4" />
                            Watch Recording
                          </Button>
                        )}
                        {classItem.status === "ended" && !classItem.recordingUrl && (
                          <span className="text-xs text-muted-foreground flex-1 text-center py-2">Recording pending</span>
                        )}

                        {/* Teacher controls */}
                        {isTeacher && (classItem.teacher === user?._id || user?.role === "admin") && (
                          <div className="flex gap-1">
                            {classItem.status === "scheduled" && (
                              <Button size="sm" variant="ghost" onClick={() => handleStatusChange(classItem._id, "live")} className="text-red-600">
                                <Radio className="h-4 w-4" />
                              </Button>
                            )}
                            {classItem.status === "live" && (
                              <Button size="sm" variant="ghost" onClick={() => handleStatusChange(classItem._id, "ended")}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Class Dialog */}
      <CreateClassDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        subjects={subjects}
        createLiveClass={createLiveClass}
      />
    </div>
  );
}

function CreateClassDialog({ open, onClose, subjects, createLiveClass }: any) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [platform, setPlatform] = useState("youtube");
  const [joinUrl, setJoinUrl] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title || !date || !time || !joinUrl) {
      toast.error("Please fill in all required fields");
      return;
    }
    setCreating(true);
    try {
      const startTime = new Date(`${date}T${time}`).getTime();
      await createLiveClass({
        title,
        description,
        subject: subjectId,
        startTime,
        platform,
        joinUrl,
        maxParticipants: maxParticipants ? Number(maxParticipants) : undefined,
        notifyEnrolled: true,
      });
      toast.success("Live class scheduled!");
      onClose();
      setTitle(""); setDescription(""); setDate(""); setTime(""); setJoinUrl(""); setMaxParticipants("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-red-500" />
            Schedule Live Class
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Grade 12 Maths - Calculus" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What will be covered..." rows={2} />
          </div>
          <div>
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {subjects?.map((s: any) => (
                  <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Time *</Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube Live</SelectItem>
                <SelectItem value="zoom">Zoom Meeting</SelectItem>
                <SelectItem value="jitsi">Jitsi Meet</SelectItem>
                <SelectItem value="stream">Other Stream</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Join URL *</Label>
            <Input value={joinUrl} onChange={e => setJoinUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label>Max Participants</Label>
            <Input type="number" value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} placeholder="Unlimited" />
          </div>
          <Button className="w-full bg-red-600 hover:bg-red-700" onClick={handleCreate} disabled={creating}>
            {creating ? "Scheduling..." : "Schedule Class"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
