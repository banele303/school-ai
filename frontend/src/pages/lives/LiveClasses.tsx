import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/AuthProvider";
import {
  BookOpenCheck,
  Brain,
  Calendar,
  CheckCircle,
  ClipboardCheck,
  Cloud,
  FileCheck2,
  FileText,
  Gauge,
  GraduationCap,
  Library,
  MessageSquareText,
  MonitorUp,
  Play,
  Plus,
  Radio,
  ScanLine,
  Sparkles,
  Timer,
  Upload,
  Users,
  Video,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router";
import InviteDialog from "./InviteDialog";
import {
  createStreamLiveInput,
  createStreamDirectUpload,
  markScannedWork,
  uploadFileToR2,
  uploadVideoToStream,
} from "@/lib/cloudflareWorker";


const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  scheduled: { color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900", icon: Calendar, label: "Scheduled" },
  live: { color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900", icon: Radio, label: "Live now" },
  ended: { color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700", icon: CheckCircle, label: "Ended" },
  cancelled: { color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900", icon: Timer, label: "Cancelled" },
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube Live",
  zoom: "Zoom Meeting",
  jitsi: "Jitsi Meet",
  stream: "Live Stream",
  native: "Native Classroom",
};
const studioTools = [
  { icon: Video, title: "In-app live classroom", detail: "Camera, mic, screen share, learner chat, attendance and replay flow." },
  { icon: Cloud, title: "Cloudflare Stream archive", detail: "Upload lesson recordings to Stream and keep playback inside the classroom." },
  { icon: ScanLine, title: "Scan-to-mark desk", detail: "Teachers upload PDFs, photos, memos and essays for AI-assisted marking." },
  { icon: Library, title: "Self-learning library", detail: "Recordings, PDFs, notes and practice tasks stay attached to the lesson." },
];

const capabilityCards = [
  { icon: Radio, label: "Teacher live broadcast", copy: "Start a class from the browser with camera, mic and screen controls." },
  { icon: Users, label: "School and public cohorts", copy: "Support enrolled classes, school groups, independent learners or mixed access." },
  { icon: MonitorUp, label: "Screen teaching", copy: "Present slides, past papers, memo walkthroughs and digital whiteboards." },
  { icon: MessageSquareText, label: "Moderated Q&A", copy: "Collect learner questions and keep the teacher focused on teaching." },
  { icon: ClipboardCheck, label: "Attendance tracking", copy: "Students joining live sessions are recorded for reporting and follow-up." },
  { icon: Cloud, label: "Cloudflare recordings", copy: "Store recorded lessons with Stream playback instead of sending learners away." },
  { icon: FileText, label: "PDF question uploads", copy: "Attach question papers, memos and worksheets to the lesson workspace." },
  { icon: FileCheck2, label: "AI marking queue", copy: "Mark typed, scanned or essay answers with teacher review before final marks." },
  { icon: Brain, label: "Personal study actions", copy: "Generate next-step revision ideas from class content and learner performance." },
  { icon: Gauge, label: "Engagement signals", copy: "See readiness, watch progress, submissions and learners needing support." },
];

export default function LiveClassesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [showStudio, setShowStudio] = useState(false);
  const [inviteClass, setInviteClass] = useState<any>(null);

  const liveClasses = useQuery(api.liveClasses.getLiveClasses, {});
  const teacherClasses = user?.role === "teacher" || user?.role === "admin"
    ? useQuery(api.liveClasses.getTeacherLiveClasses, {})
    : null;
  const subjects = useQuery(api.subjects.getSubjects);

  const createLiveClass = useMutation(api.liveClasses.createLiveClass);
  const updateStatus = useMutation(api.liveClasses.updateLiveClassStatus);
  const joinClass = useMutation(api.liveClasses.joinLiveClass);
  const deleteLiveClass = useMutation(api.liveClasses.deleteLiveClass);

  const handleDeleteClass = async (classId: any) => {
    if (!window.confirm("Are you sure you want to delete this live class? This will delete all attendance, chat messages, and details.")) {
      return;
    }
    try {
      await deleteLiveClass({ liveClassId: classId });
      toast.success("Live class deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete live class");
    }
  };

  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const classes = liveClasses || [];
  const visibleClasses = classes.filter((c: any) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "upcoming") return c.status === "scheduled";
    if (activeFilter === "live") return c.status === "live";
    if (activeFilter === "recordings") return c.status === "ended" && c.recordingUrl;
    if (activeFilter === "mine") return teacherClasses?.some((tc: any) => tc._id === c._id);
    return true;
  });

  const stats = useMemo(() => {
    const live = classes.filter((c: any) => c.status === "live").length;
    const scheduled = classes.filter((c: any) => c.status === "scheduled").length;
    const recordings = classes.filter((c: any) => c.recordingUrl || c.status === "ended").length;
    return { live, scheduled, recordings, total: classes.length };
  }, [classes]);

  const openLesson = async (classItem: any) => {
    setSelectedClass(classItem);
    if (user?.role === "student") {
      try {
        await joinClass({ liveClassId: classItem._id });
      } catch {
        // Attendance may already exist; opening the lesson is still fine.
      }
    }
    if (classItem.platform === "native") {
      navigate(`/lives/room/${classItem._id}`);
    } else {
      window.open(classItem.joinUrl, "_blank");
    }
  };

  const changeStatus = async (
    classId: any,
    status: "scheduled" | "live" | "ended" | "cancelled",
    recordingUrl?: string
  ) => {
    try {
      await updateStatus({ liveClassId: classId, status, recordingUrl });
      toast.success(status === "live" ? "Live class started" : `Class marked as ${status}`);
    } catch (error: any) {
      toast.error(error.message || "Could not update class status");
    }
  };

  return (
    <div className="flex-1 bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary">
                  <Video className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-foreground">Live Learning Studio</h1>
                  <p className="text-sm text-muted-foreground">
                    Teach, stream, record, upload resources and mark learner work without sending students away from the classroom.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isTeacher && (
                <>

                  <Button className="gap-2 bg-red-600 hover:bg-red-700" onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4" /> Create live lesson
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Live now" value={stats.live} icon={Radio} tone="text-red-600 dark:text-red-400" />
            <Metric label="Scheduled" value={stats.scheduled} icon={Calendar} tone="text-blue-600 dark:text-blue-400" />
            <Metric label="Recordings" value={stats.recordings} icon={Cloud} tone="text-cyan-700 dark:text-cyan-400" />
            <Metric label="Total lessons" value={stats.total} icon={GraduationCap} tone="text-slate-700 dark:text-zinc-400" />
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6 xl:grid-cols-[1fr_360px]">

        <section className="space-y-6">
          <Tabs value={activeFilter} onValueChange={setActiveFilter}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-flex">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="live">Live</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="recordings">Replay</TabsTrigger>
              </TabsList>
              {isTeacher && (
                <Button variant="outline" size="sm" onClick={() => setActiveFilter("mine")}>
                  My classes
                </Button>
              )}
            </div>

            <TabsContent value={activeFilter} className="mt-4">
              {visibleClasses.length === 0 ? (
                <EmptyLessons isTeacher={isTeacher} onCreate={() => setShowCreateDialog(true)} />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {visibleClasses.map((classItem: any) => {
                    const subject = subjects?.find((s: any) => s._id === classItem.subject);
                    return (
                      <LessonCard
                        key={classItem._id}
                        classItem={classItem}
                        subjectName={subject?.name}
                        isTeacher={isTeacher}
                        isOwner={isTeacher}
                        onOpen={() => openLesson(classItem)}
                        onStudio={() => {
                          setSelectedClass(classItem);
                          setShowStudio(true);
                        }}
                        onInvite={() => setInviteClass(classItem)}
                        onStatus={changeStatus}
                        onDelete={handleDeleteClass}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-amber-500" /> 10 useful additions for the learning product
              </CardTitle>
              <CardDescription>
                These are built into the page as workflow areas so the platform feels like an education SaaS, not a link directory.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {capabilityCards.map(({ icon: Icon, label, copy }) => (
                <div key={label} className="flex gap-3 rounded-lg border bg-card p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{copy}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <TeacherToolbox isTeacher={isTeacher} onCreate={() => setShowCreateDialog(true)} onMarker={() => navigate("/ai/marking")} />
          <SelfLearningPanel />
        </aside>
      </main>

      <CreateClassDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        subjects={subjects}
        createLiveClass={createLiveClass}
      />
      <LessonRoomDialog lesson={selectedClass} onClose={() => setSelectedClass(null)} isTeacher={isTeacher} />
      <TeacherStudioDialog
        open={showStudio}
        lesson={selectedClass}
        onClose={() => setShowStudio(false)}
        onStatus={changeStatus}
      />
      <InviteDialog open={!!inviteClass} onClose={() => setInviteClass(null)} liveClass={inviteClass} />
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone }: any) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", tone)} />
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function StudioPill({ icon: Icon, label }: any) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
      <Icon className="h-3.5 w-3.5" /> {label}
    </div>
  );
}

function LessonCard({ classItem, subjectName, isTeacher, isOwner, onOpen, onStudio, onInvite, onStatus, onDelete }: any) {
  const statusCfg = STATUS_CONFIG[classItem.status] || STATUS_CONFIG.scheduled;
  const StatusIcon = statusCfg.icon;

  return (
    <Card className={cn("overflow-hidden rounded-2xl bg-card/70 backdrop-blur border-border/50 shadow-sm transition-all duration-300 hover:shadow-md hover:border-border", classItem.status === "live" && "border-red-400 dark:border-red-900/50 shadow-red-500/5")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="outline" className={cn("text-[11px] font-semibold py-0.5 rounded-lg border", statusCfg.color)}>
            <StatusIcon className="mr-1 h-3 w-3" /> {statusCfg.label}
          </Badge>
          <Badge variant="secondary" className="text-[11px] font-medium rounded-lg">
            {PLATFORM_LABELS[classItem.platform] || classItem.platform || "Live"}
          </Badge>
        </div>
        <CardTitle className="text-base font-bold text-foreground mt-1">{classItem.title}</CardTitle>
        {classItem.description && <CardDescription className="line-clamp-2 text-muted-foreground text-xs mt-0.5">{classItem.description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-muted-foreground" /> {format(new Date(classItem.startTime), "EEE, d MMM")}</span>
          <span className="flex items-center gap-2"><Timer className="h-3.5 w-3.5 text-muted-foreground" /> {format(new Date(classItem.startTime), "h:mm a")}</span>
          <span className="flex items-center gap-2"><BookOpenCheck className="h-3.5 w-3.5 text-muted-foreground" /> {subjectName || "Subject"}</span>
          <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-muted-foreground" /> {classItem.maxParticipants || "Open"} seats</span>
        </div>
        <div className="rounded-xl bg-muted p-3 border border-border/60">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-secondary-foreground">Lesson readiness</span>
            <span className="text-muted-foreground text-[10px]">{classItem.recordingUrl ? "Replay ready" : classItem.status === "live" ? "Streaming" : "Preparing"}</span>
          </div>
          <Progress value={classItem.recordingUrl ? 100 : classItem.status === "live" ? 72 : 38} className="h-2 rounded-full" />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button className="flex-1 gap-2 font-semibold text-xs h-9 rounded-xl transition-all" onClick={onOpen}>
            <Play className="h-3.5 w-3.5 fill-current" /> {classItem.status === "ended" ? "Open replay" : "Open lesson"}
          </Button>
          {isTeacher && (
            <Button variant="outline" className="gap-2 text-xs h-9 rounded-xl" onClick={onInvite}>
              <Users className="h-3.5 w-3.5" /> Invite
            </Button>
          )}
          {isTeacher && isOwner && (
            <>
              <Button variant="outline" className="gap-2 text-xs h-9 rounded-xl" onClick={onStudio}>
                <Video className="h-3.5 w-3.5" /> Studio
              </Button>
              {classItem.status !== "live" && (
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => onStatus(classItem._id, "live")} title="Start live">
                  <Radio className="h-4 w-4 text-red-600 dark:text-red-400" />
                </Button>
              )}
              {classItem.status === "live" && (
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => onStatus(classItem._id, "ended")} title="End class">
                  <CheckCircle className="h-4 w-4 text-green-700 dark:text-green-500" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => onDelete(classItem._id)} title="Delete class">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyLessons({ isTeacher, onCreate }: any) {
  return (
    <div className="rounded-lg border border-dashed bg-card py-14 text-center">
      <Video className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="font-semibold text-secondary-foreground">No lessons in this view</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Live sessions, replays and self-learning resources will appear here as teachers publish them.
      </p>
      {isTeacher && <Button className="mt-4 gap-2" onClick={onCreate}><Plus className="h-4 w-4" /> Create lesson</Button>}
    </div>
  );
}

function TeacherToolbox({ isTeacher, onCreate, onMarker }: any) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="text-base">Teacher command centre</CardTitle>
        <CardDescription>Daily live teaching, resource upload and assessment workflows.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button disabled={!isTeacher} className="w-full justify-start gap-2" onClick={onCreate}>
          <Radio className="h-4 w-4" /> Schedule or start live class
        </Button>
        <Button disabled={!isTeacher} variant="outline" className="w-full justify-start gap-2" onClick={onMarker}>
          <ScanLine className="h-4 w-4" /> Mark scanned answers
        </Button>
        <Button disabled={!isTeacher} variant="outline" className="w-full justify-start gap-2" onClick={onMarker}>
          <Upload className="h-4 w-4" /> Upload memo or PDF
        </Button>
      </CardContent>
    </Card>
  );
}

function SelfLearningPanel() {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="text-base">Self-learning flow</CardTitle>
        <CardDescription>For school learners and independent students.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {[
          "Join a live class or open a replay.",
          "Download the attached worksheet or question paper.",
          "Upload handwritten answers as PDF or images.",
          "Receive AI feedback, then teacher-approved marks.",
          "Continue with recommended revision videos.",
        ].map((step, index) => (
          <div key={step} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{index + 1}</span>
            <span className="text-secondary-foreground">{step}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TeacherStudioDialog({ open, lesson, onClose, onStatus }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const startPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {
      toast.error("Camera or microphone permission was blocked.");
    }
  };

  const uploadRecording = async () => {
    if (!recordingFile) return toast.error("Choose a recording file first.");
    setUploading(true);
    try {
      const target = await createStreamDirectUpload({
        name: lesson?.title || recordingFile.name,
        creator: "teacher",
        maxDurationSeconds: 7200,
      });
      await uploadVideoToStream(target.uploadURL, recordingFile);
      if (lesson?._id && target.uid) {
        await onStatus(lesson._id, "ended", `https://iframe.videodelivery.net/${target.uid}`);
      }
      toast.success("Recording uploaded to Cloudflare Stream.");
    } catch (error: any) {
      toast.error(error.message || "Recording upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
        <DialogHeader className="pb-4 border-b border-zinc-150 dark:border-zinc-800">
          <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-white">Teacher Live Studio</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr] pt-4">
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-xl bg-black aspect-video w-full flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
              {cameraOn ? (
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-zinc-600 dark:text-zinc-400 p-6">
                  <Video className="mx-auto mb-3 h-12 w-12 text-zinc-400" />
                  <p className="font-semibold text-base text-zinc-800 dark:text-zinc-200">Preview Camera before going Live</p>
                  <p className="text-xs text-zinc-500 mt-1">Allow camera access to display your live preview here.</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={startPreview} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs py-2 px-4 rounded-xl shadow-md"><Video className="h-4 w-4" /> Camera preview</Button>
              <Button variant="outline" className="gap-2 text-xs border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl"><MonitorUp className="h-4 w-4" /> Share screen</Button>
              {lesson && <Button variant="outline" className="gap-2 text-xs border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl" onClick={() => onStatus(lesson._id, "live")}><Radio className="h-4 w-4 text-red-500 animate-pulse" /> Mark live</Button>}
              {lesson && <Button variant="outline" className="gap-2 text-xs border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl" onClick={() => onStatus(lesson._id, "ended")}><CheckCircle className="h-4 w-4 text-emerald-500" /> End class</Button>}
            </div>
          </div>
          <div className="space-y-4">
            <Card className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-white">Cloudflare Stream Recording</CardTitle>
                <CardDescription className="text-xs text-zinc-500 dark:text-zinc-450 mt-1">Upload a recorded lesson for in-app replay.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input type="file" accept="video/*" onChange={(e) => setRecordingFile(e.target.files?.[0] || null)} className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs" />
                <Button className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl" onClick={uploadRecording} disabled={uploading}>
                  <Cloud className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload replay"}
                </Button>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-white">Teaching Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                <p className="flex items-center gap-2">✓ Camera and microphone checked</p>
                <p className="flex items-center gap-2">✓ Question paper or slides uploaded</p>
                <p className="flex items-center gap-2">✓ Chat moderation enabled</p>
                <p className="flex items-center gap-2">✓ Recording destination ready</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateClassDialog({ open, onClose, subjects, createLiveClass }: any) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [accessMode, setAccessMode] = useState("school-and-public");
  const [platform, setPlatform] = useState("native");
  const [joinUrl, setJoinUrl] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [targetGrade, setTargetGrade] = useState("all");
  const subjectOptions = Array.isArray(subjects) ? subjects : [];
  const subjectsLoading = subjects === undefined;

  const handleCreate = async () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedJoinUrl = joinUrl.trim();

    const missingFields = [
      !trimmedTitle && "title",
      !subjectId && "subject",
      !date && "date",
      !time && "time",
      platform !== "native" && !trimmedJoinUrl && "join URL",
    ].filter(Boolean);

    if (missingFields.length > 0) {
      toast.error(`Please complete: ${missingFields.join(", ")}.`);
      return;
    }

    const startTime = new Date(`${date}T${time}`).getTime();
    if (Number.isNaN(startTime)) {
      toast.error("Choose a valid class date and time.");
      return;
    }

    setCreating(true);
    try {
      let resourceUrl = "";
      if (resourceFile) {
        const upload = await uploadFileToR2(resourceFile, { title: trimmedTitle, description: trimmedDescription });
        resourceUrl = upload.fileUrl;
      }
      let streamData: {
        uid?: string;
        rtmpsUrl?: string;
        streamKey?: string;
        srtUrl?: string;
        srtStreamId?: string;
        srtPassphrase?: string;
        playbackUrl?: string;
      } = {};
      let finalJoinUrl = trimmedJoinUrl;

        if (platform === "native") {
          toast.info("Provisioning Cloudflare live input...");
          try {
            const data = await createStreamLiveInput({
              title: trimmedTitle,
              preferLowLatency: true,
            });
            streamData = {
              uid: data.uid,
              rtmpsUrl: data.rtmpsUrl,
              streamKey: data.streamKey,
              srtUrl: data.srtUrl,
              srtStreamId: data.srtStreamId,
              srtPassphrase: data.srtPassphrase,
              playbackUrl: data.playbackUrl,
            };
            finalJoinUrl = "/lives/room/native";
          } catch (e: any) {
            toast.warning("Cloudflare live input is unavailable, so this lesson will use the in-app classroom fallback.");
            streamData = {};
            finalJoinUrl = "/lives/room/native";
          }
        }

      await createLiveClass({
        title: trimmedTitle,
        description: resourceUrl ? `${trimmedDescription}\n\nResource: ${resourceUrl}` : trimmedDescription,
        subject: subjectId,
        startTime,
        platform,
        joinUrl: platform === "native" ? finalJoinUrl : trimmedJoinUrl,
        accessMode,
        resourceUrls: resourceUrl ? [resourceUrl] : undefined,
        lessonPlan: trimmedDescription,
        maxParticipants: maxParticipants ? Number(maxParticipants) : undefined,
        notifyEnrolled: true,
        streamInputId: streamData.uid,
        rtmpsUrl: streamData.rtmpsUrl,
        streamKey: streamData.streamKey,
        srtUrl: streamData.srtUrl,
        srtStreamId: streamData.srtStreamId,
        srtPassphrase: streamData.srtPassphrase,
        playbackUrl: streamData.playbackUrl,
        targetGrades: targetGrade === "all" ? [] : [Number(targetGrade)],
      } as any);

      toast.success(accessMode === "school-only" ? "School live lesson scheduled." : "Live lesson scheduled.");
      onClose();
      setTitle("");
      setDescription("");
      setSubjectId("");
      setDate("");
      setTime("");
      setJoinUrl("");
      setMaxParticipants("");
      setResourceFile(null);
      setTargetGrade("all");
    } catch (error: any) {
      toast.error(error.message || "Could not schedule class.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
        <DialogHeader className="pb-4 border-b border-zinc-150 dark:border-zinc-800">
          <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-white">Create Live Learning Session</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 md:grid-cols-2 pt-4">
          <div className="md:col-span-2">
            <Label className="text-zinc-700 dark:text-zinc-300 font-semibold mb-1 text-xs block">Lesson Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Grade 12 Maths: Calculus revision" className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl h-10 text-xs" />
          </div>
          <div>
            <Label className="text-zinc-700 dark:text-zinc-300 font-semibold mb-1 text-xs block">Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger disabled={subjectsLoading || subjectOptions.length === 0} className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl h-10 text-xs">
                <SelectValue placeholder={subjectsLoading ? "Loading subjects..." : subjectOptions.length === 0 ? "No subjects available" : "Select subject"} />
              </SelectTrigger>
              <SelectContent>
                {subjectOptions.map((s: any) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {!subjectsLoading && subjectOptions.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">Ask an admin to add subjects before scheduling live lessons.</p>
            )}
          </div>
          <div>
            <Label className="text-zinc-700 dark:text-zinc-300 font-semibold mb-1 text-xs block">Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl h-10 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="native">Native Classroom (Cloudflare)</SelectItem>
                <SelectItem value="youtube">YouTube Live</SelectItem>
                <SelectItem value="zoom">Zoom Meeting</SelectItem>
                <SelectItem value="jitsi">Jitsi Meet</SelectItem>
                <SelectItem value="stream">Other Stream</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-zinc-700 dark:text-zinc-300 font-semibold mb-1 text-xs block">Target Grade</Label>
            <Select value={targetGrade} onValueChange={setTargetGrade}>
              <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl h-10 text-xs"><SelectValue placeholder="All Grades" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                <SelectItem value="8">Grade 8</SelectItem>
                <SelectItem value="9">Grade 9</SelectItem>
                <SelectItem value="10">Grade 10</SelectItem>
                <SelectItem value="11">Grade 11</SelectItem>
                <SelectItem value="12">Grade 12</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {platform !== "native" && (
            <div>
              <Label className="text-zinc-700 dark:text-zinc-300 font-semibold mb-1 text-xs block">Join URL *</Label>
              <Input value={joinUrl} onChange={e => setJoinUrl(e.target.value)} placeholder="https://..." className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl h-10 text-xs" />
            </div>
          )}
          <div>
            <Label className="text-zinc-700 dark:text-zinc-300 font-semibold mb-1 text-xs block">Access</Label>
            <Select value={accessMode} onValueChange={setAccessMode}>
              <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl h-10 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="school-and-public">School and self-learners</SelectItem>
                <SelectItem value="school-only">School class only</SelectItem>
                <SelectItem value="public-support">Open support lesson</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-zinc-700 dark:text-zinc-300 font-semibold mb-1 text-xs block">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl h-10 text-xs" />
          </div>
          <div>
            <Label className="text-zinc-700 dark:text-zinc-300 font-semibold mb-1 text-xs block">Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl h-10 text-xs" />
          </div>
          <div>
            <Label className="text-zinc-700 dark:text-zinc-300 font-semibold mb-1 text-xs block">Max Learners</Label>
            <Input type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} placeholder="Unlimited" className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl h-10 text-xs" />
          </div>
          <div>
            <Label className="text-zinc-700 dark:text-zinc-300 font-semibold mb-1 text-xs block">Attach PDF / Worksheet</Label>
            <Input type="file" accept=".pdf,.txt,.md,image/*" onChange={(e) => setResourceFile(e.target.files?.[0] || null)} className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl h-10 text-xs py-1 px-3" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-zinc-700 dark:text-zinc-300 font-semibold mb-1 text-xs block">Lesson Plan</Label>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Objectives, resources, homework, marks allocation..." className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl text-xs" />
          </div>
          <div className="md:col-span-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800/80 p-3.5 text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
            💡 This creates an in-app lesson. Teachers can start the studio from the lesson card, learners join inside the app, and recordings/resources can be stored through Cloudflare.
          </div>
          <Button className="md:col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm h-11 rounded-xl shadow-lg mt-2" onClick={handleCreate} disabled={creating}>
            {creating ? "Creating..." : "Create lesson"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LessonRoomDialog({ lesson, onClose, isTeacher }: any) {
  if (!lesson) return null;
  const playbackUrl = lesson.recordingUrl?.includes("videodelivery.net")
    ? lesson.recordingUrl
    : lesson.recordingUrl
      ? lesson.recordingUrl
      : "";

  return (
    <Dialog open={!!lesson} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
        <DialogHeader className="pb-4 border-b border-zinc-150 dark:border-zinc-800">
          <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-white">{lesson.title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr] pt-4">
          <div className="overflow-hidden rounded-xl bg-black aspect-video w-full flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
            {playbackUrl ? (
              playbackUrl.includes("iframe.videodelivery.net") ? (
                <iframe title={lesson.title} src={playbackUrl} className="w-full h-full aspect-video" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowFullScreen />
              ) : (
                <video src={playbackUrl} controls className="w-full h-full object-contain" />
              )
            ) : (
              <div className="text-center text-zinc-300 p-6">
                <Radio className="mx-auto mb-3 h-12 w-12 text-red-500 animate-pulse" />
                <h3 className="font-semibold text-lg text-zinc-850 dark:text-zinc-200">Live room is ready</h3>
                <p className="mt-2 max-w-md text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">When the teacher starts broadcasting, students will stay inside this lesson room and stream live video.</p>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <Card className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-white">Class Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <Button variant="outline" className="w-full justify-start gap-2 text-xs border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl"><MessageSquareText className="h-4 w-4" /> Ask a question</Button>
                <Button variant="outline" className="w-full justify-start gap-2 text-xs border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl"><FileText className="h-4 w-4" /> Upload answer PDF</Button>
                <Button variant="outline" className="w-full justify-start gap-2 text-xs border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl"><Brain className="h-4 w-4" /> Generate revision plan</Button>
                {isTeacher && <Button className="w-full justify-start gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"><ClipboardCheck className="h-4 w-4" /> Review submissions</Button>}
              </CardContent>
            </Card>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-800/80 p-3.5 text-[11px] text-zinc-650 dark:text-zinc-400 font-medium leading-relaxed">
              📝 Learners can be enrolled through a school class, invited to an open support session, or use recordings independently for self-learning.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
