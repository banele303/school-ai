import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Mic,
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
  Wand2,
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
  scheduled: { color: "bg-blue-50 text-blue-700 border-blue-200", icon: Calendar, label: "Scheduled" },
  live: { color: "bg-red-50 text-red-700 border-red-200", icon: Radio, label: "Live now" },
  ended: { color: "bg-slate-100 text-slate-700 border-slate-200", icon: CheckCircle, label: "Ended" },
  cancelled: { color: "bg-amber-50 text-amber-700 border-amber-200", icon: Timer, label: "Cancelled" },
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
  const [showMarker, setShowMarker] = useState(false);
  const [inviteClass, setInviteClass] = useState<any>(null);

  const liveClasses = useQuery(api.liveClasses.getLiveClasses, {});
  const teacherClasses = user?.role === "teacher" || user?.role === "admin"
    ? useQuery(api.liveClasses.getTeacherLiveClasses, {})
    : null;
  const subjects = useQuery(api.subjects.getSubjects);

  const createLiveClass = useMutation(api.liveClasses.createLiveClass);
  const updateStatus = useMutation(api.liveClasses.updateLiveClassStatus);
  const joinClass = useMutation(api.liveClasses.joinLiveClass);

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
    <div className="flex-1 bg-slate-50/60">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-600">
                  <Video className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Live Learning Studio</h1>
                  <p className="text-sm text-slate-600">
                    Teach, stream, record, upload resources and mark learner work without sending students away from the classroom.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isTeacher && (
                <>
                  <Button variant="outline" className="gap-2" onClick={() => setShowMarker(true)}>
                    <Wand2 className="h-4 w-4" /> AI marking desk
                  </Button>
                  <Button className="gap-2 bg-red-600 hover:bg-red-700" onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4" /> Create live lesson
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Live now" value={stats.live} icon={Radio} tone="text-red-600" />
            <Metric label="Scheduled" value={stats.scheduled} icon={Calendar} tone="text-blue-600" />
            <Metric label="Recordings" value={stats.recordings} icon={Cloud} tone="text-cyan-700" />
            <Metric label="Total lessons" value={stats.total} icon={GraduationCap} tone="text-slate-700" />
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6 xl:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          <Card className="overflow-hidden rounded-lg border-slate-200">
            <CardContent className="grid gap-0 p-0 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="bg-slate-950 p-5 text-white md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <Badge className="border-red-400/40 bg-red-500/15 text-red-100">
                    <Radio className="mr-1 h-3 w-3" /> Browser classroom
                  </Badge>
                  <span className="text-xs text-slate-300">Cloudflare-ready</span>
                </div>
                <div className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-slate-900">
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                        <Play className="h-7 w-7" />
                      </div>
                      <h2 className="text-xl font-semibold">Start teaching inside the classroom</h2>
                      <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
                        Teachers can open the studio, preview camera and mic, attach PDFs, then store replays through Cloudflare Stream.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <StudioPill icon={Mic} label="Mic check" />
                  <StudioPill icon={MonitorUp} label="Share screen" />
                  <StudioPill icon={Cloud} label="Record replay" />
                </div>
              </div>
              <div className="space-y-4 p-5 md:p-6">
                <div>
                  <h2 className="text-lg font-semibold">What this page now supports</h2>
                  <p className="text-sm text-slate-600">
                    A single workspace for school learners, independent self-learners and teachers running live support sessions.
                  </p>
                </div>
                {studioTools.map(({ icon: Icon, title, detail }) => (
                  <div key={title} className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100">
                      <Icon className="h-4 w-4 text-slate-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{title}</p>
                      <p className="text-xs text-slate-600">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>


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
                        isOwner={classItem.teacher === user?._id || user?.role === "admin"}
                        onOpen={() => openLesson(classItem)}
                        onStudio={() => {
                          setSelectedClass(classItem);
                          setShowStudio(true);
                        }}
                        onInvite={() => setInviteClass(classItem)}
                        onStatus={changeStatus}
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
                <div key={label} className="flex gap-3 rounded-lg border bg-white p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100">
                    <Icon className="h-4 w-4 text-slate-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-slate-600">{copy}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <TeacherToolbox isTeacher={isTeacher} onCreate={() => setShowCreateDialog(true)} onMarker={() => setShowMarker(true)} />
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
      <AIMarkingDialog open={showMarker} onClose={() => setShowMarker(false)} subjects={subjects} />
      <InviteDialog open={!!inviteClass} onClose={() => setInviteClass(null)} liveClass={inviteClass} />
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone }: any) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        <Icon className={cn("h-4 w-4", tone)} />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
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

function LessonCard({ classItem, subjectName, isTeacher, isOwner, onOpen, onStudio, onInvite, onStatus }: any) {
  const statusCfg = STATUS_CONFIG[classItem.status] || STATUS_CONFIG.scheduled;
  const StatusIcon = statusCfg.icon;

  return (
    <Card className={cn("overflow-hidden rounded-2xl bg-white/70 backdrop-blur border border-slate-200/50 dark:bg-zinc-900/70 dark:border-zinc-800/50 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700", classItem.status === "live" && "border-red-400 dark:border-red-900/50 shadow-red-500/5")}>
      <div className={cn("h-1.5", classItem.status === "live" ? "bg-red-600" : "bg-slate-200 dark:bg-zinc-800")} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="outline" className={cn("text-[11px] font-semibold py-0.5 rounded-lg border", statusCfg.color)}>
            <StatusIcon className="mr-1 h-3 w-3" /> {statusCfg.label}
          </Badge>
          <Badge variant="secondary" className="text-[11px] font-medium rounded-lg dark:bg-zinc-800 dark:text-zinc-355">
            {PLATFORM_LABELS[classItem.platform] || classItem.platform || "Live"}
          </Badge>
        </div>
        <CardTitle className="text-base font-bold text-slate-900 dark:text-white mt-1">{classItem.title}</CardTitle>
        {classItem.description && <CardDescription className="line-clamp-2 text-slate-500 dark:text-zinc-400 text-xs mt-0.5">{classItem.description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-xs text-slate-600 dark:text-zinc-350 sm:grid-cols-2">
          <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" /> {format(new Date(classItem.startTime), "EEE, d MMM")}</span>
          <span className="flex items-center gap-2"><Timer className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" /> {format(new Date(classItem.startTime), "h:mm a")}</span>
          <span className="flex items-center gap-2"><BookOpenCheck className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" /> {subjectName || "Subject"}</span>
          <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" /> {classItem.maxParticipants || "Open"} seats</span>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-zinc-900/60 p-3 border border-slate-100 dark:border-zinc-800/40">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-zinc-300">Lesson readiness</span>
            <span className="text-slate-500 dark:text-zinc-400 text-[10px]">{classItem.recordingUrl ? "Replay ready" : classItem.status === "live" ? "Streaming" : "Preparing"}</span>
          </div>
          <Progress value={classItem.recordingUrl ? 100 : classItem.status === "live" ? 72 : 38} className="h-2 rounded-full dark:bg-zinc-800" />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button className="flex-1 gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 font-semibold text-xs h-9 rounded-xl transition-all" onClick={onOpen}>
            <Play className="h-3.5 w-3.5 fill-current" /> {classItem.status === "ended" ? "Open replay" : "Open lesson"}
          </Button>
          {isTeacher && isOwner && (
            <>
              <Button variant="outline" className="gap-2 border-slate-200 hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 text-xs h-9 rounded-xl" onClick={onStudio}>
                <Video className="h-3.5 w-3.5" /> Studio
              </Button>
              <Button variant="outline" className="gap-2 border-slate-200 hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 text-xs h-9 rounded-xl" onClick={onInvite}>
                <Users className="h-3.5 w-3.5" /> Invite
              </Button>
              {classItem.status !== "live" && (
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-850" onClick={() => onStatus(classItem._id, "live")} title="Start live">
                  <Radio className="h-4 w-4 text-red-600 dark:text-red-400" />
                </Button>
              )}
              {classItem.status === "live" && (
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-850" onClick={() => onStatus(classItem._id, "ended")} title="End class">
                  <CheckCircle className="h-4 w-4 text-green-700 dark:text-green-500" />
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyLessons({ isTeacher, onCreate }: any) {
  return (
    <div className="rounded-lg border border-dashed bg-white py-14 text-center">
      <Video className="mx-auto mb-4 h-12 w-12 text-slate-300" />
      <h3 className="font-semibold text-slate-700">No lessons in this view</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
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
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs text-white">{index + 1}</span>
            <span className="text-slate-700">{step}</span>
          </div>
        ))}
      </CardContent>
    </Card>
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
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{lesson.title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="overflow-hidden rounded-lg bg-slate-950">
            {playbackUrl ? (
              playbackUrl.includes("iframe.videodelivery.net") ? (
                <iframe title={lesson.title} src={playbackUrl} className="aspect-video w-full" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowFullScreen />
              ) : (
                <video src={playbackUrl} controls className="aspect-video w-full" />
              )
            ) : (
              <div className="grid aspect-video place-items-center text-center text-white">
                <div>
                  <Radio className="mx-auto mb-3 h-10 w-10 text-red-400" />
                  <h3 className="font-semibold">Live room ready</h3>
                  <p className="mt-1 max-w-md text-sm text-slate-300">When the teacher starts broadcasting, students stay inside this lesson room.</p>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Class tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2"><MessageSquareText className="h-4 w-4" /> Ask a question</Button>
                <Button variant="outline" className="w-full justify-start gap-2"><FileText className="h-4 w-4" /> Upload answer PDF</Button>
                <Button variant="outline" className="w-full justify-start gap-2"><Brain className="h-4 w-4" /> Generate revision plan</Button>
                {isTeacher && <Button className="w-full justify-start gap-2"><ClipboardCheck className="h-4 w-4" /> Review submissions</Button>}
              </CardContent>
            </Card>
            <div className="rounded-lg border bg-slate-50 p-3 text-xs text-slate-600">
              Learners can be enrolled through a school class, invited to an open support session, or use recordings independently for self-learning.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Teacher live studio</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg bg-slate-950">
              <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
              {!cameraOn && (
                <div className="-mt-[56.25%] grid aspect-video place-items-center text-white">
                  <div className="text-center">
                    <Video className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                    <p className="font-medium">Preview camera before going live</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={startPreview} className="gap-2"><Video className="h-4 w-4" /> Camera preview</Button>
              <Button variant="outline" className="gap-2"><MonitorUp className="h-4 w-4" /> Share screen</Button>
              {lesson && <Button variant="outline" className="gap-2" onClick={() => onStatus(lesson._id, "live")}><Radio className="h-4 w-4" /> Mark live</Button>}
              {lesson && <Button variant="outline" className="gap-2" onClick={() => onStatus(lesson._id, "ended")}><CheckCircle className="h-4 w-4" /> End</Button>}
            </div>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cloudflare Stream recording</CardTitle>
                <CardDescription>Upload a recorded lesson for in-app replay.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input type="file" accept="video/*" onChange={(e) => setRecordingFile(e.target.files?.[0] || null)} />
                <Button className="w-full gap-2" onClick={uploadRecording} disabled={uploading}>
                  <Cloud className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload replay"}
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Teaching checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-700">
                <p>Camera and microphone checked</p>
                <p>Question paper or slides uploaded</p>
                <p>Chat moderation enabled</p>
                <p>Recording destination ready</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AIMarkingDialog({ open, onClose, subjects }: any) {
  const [title, setTitle] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("12");
  const [questionText, setQuestionText] = useState("");
  const [memoText, setMemoText] = useState("");
  const [studentText, setStudentText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [marking, setMarking] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Override States
  const [customMark, setCustomMark] = useState(0);
  const [customFeedback, setCustomFeedback] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  const runMarking = async () => {
    setMarking(true);
    try {
      if (file) {
        await uploadFileToR2(file, { title: title || file.name, description: "Scanned learner answer" });
      }
      const marked = await markScannedWork({
        title,
        subjectName,
        gradeLevel: Number(gradeLevel),
        questionText,
        memoText,
        studentText,
        rubric: "Award marks for correct method, final answer, evidence, grammar where relevant, and CAPS-aligned reasoning.",
      });
      setResult(marked);
      setCustomMark(marked.mark || 0);
      setCustomFeedback(marked.feedback || "");
      setCustomNotes(marked.teacherNotes || "");
      toast.success("AI marking draft generated successfully.");
    } catch (error: any) {
      toast.error(error.message || "AI marking failed.");
    } finally {
      setMarking(false);
    }
  };

  const handleApprove = () => {
    toast.success("Teacher approved marks and saved to gradebook!");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Brain className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">Professional AI Marking Desk</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                Instantly grade short answers, essays, or scanned PDFs. Get suggested rubrics, corrections, and detailed feedback which you can override before approval.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-2">
          
          {/* Left panel: inputs */}
          <div className="space-y-4 pr-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Task Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Term test, Calculus essay..." className="bg-slate-50 border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 text-xs h-9 rounded-xl mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Grade Level</Label>
                <Select value={gradeLevel} onValueChange={setGradeLevel}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 text-xs h-9 rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200">
                    {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((g) => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Subject</Label>
              <Select value={subjectName} onValueChange={setSubjectName}>
                <SelectTrigger className="bg-slate-50 border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 text-xs h-9 rounded-xl mt-1"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200">
                  {subjects?.map((s: any) => <SelectItem key={s._id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Upload scan or PDF (optional)</Label>
              <Input type="file" accept=".pdf,image/*,.txt,.md" onChange={(e) => setFile(e.target.files?.[0] || null)} className="bg-slate-50 border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 text-xs h-10 rounded-xl mt-1 pt-2.5" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Question / Instructions</Label>
              <Textarea rows={3} value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Enter the question or essay prompt..." className="bg-slate-50 border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 text-xs rounded-xl mt-1 focus:ring-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Memo / Expected Answer</Label>
              <Textarea rows={3} value={memoText} onChange={(e) => setMemoText(e.target.value)} placeholder="Provide keywords, CAPS guidelines, or a model answer..." className="bg-slate-50 border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 text-xs rounded-xl mt-1 focus:ring-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-350 font-sans">Learner Answer Text</Label>
              <Textarea rows={4} value={studentText} onChange={(e) => setStudentText(e.target.value)} placeholder="Paste student text here. If a file was uploaded, the AI will transcribe it." className="bg-slate-50 border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 text-xs rounded-xl mt-1 focus:ring-1" />
            </div>
            <Button onClick={runMarking} disabled={marking} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 rounded-xl transition-all shadow-md">
              <Wand2 className="h-4 w-4" /> {marking ? "Running AI marking engine..." : "Generate AI marking draft"}
            </Button>
          </div>

          {/* Right panel: results */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/30 flex flex-col justify-between min-h-[500px]">
            {!result ? (
              <div className="grid h-full place-items-center text-center text-slate-500 my-auto">
                <div className="max-w-sm">
                  <FileCheck2 className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-zinc-700" />
                  <p className="font-bold text-slate-700 dark:text-zinc-350 text-sm">Waiting for draft generation</p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">Provide the question instructions and student's answer on the left to start. The AI will output detailed rubrics, corrections, and comments.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5 flex-1">
                
                {/* Header score card */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Suggested Mark</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <Input
                        type="number"
                        value={customMark}
                        onChange={(e) => setCustomMark(Number(e.target.value))}
                        className="w-16 text-center text-2xl font-bold bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-850 h-10 rounded-xl"
                      />
                      <span className="text-xl text-slate-400 font-semibold">/ {result.maxMark || 100}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Performance Level</span>
                    <div className="mt-1">
                      <Badge className="bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-900 dark:text-indigo-400 py-1 px-3 text-xs rounded-lg font-bold">
                        {result.level || "Grade A"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Score slider override */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Adjust Score Override</Label>
                  <input
                    type="range"
                    min="0"
                    max={result.maxMark || 100}
                    value={customMark}
                    onChange={(e) => setCustomMark(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-800 accent-indigo-600 mt-2"
                  />
                </div>

                {/* Custom feedback */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Learner Feedback (AI Draft)</Label>
                  <Textarea
                    rows={4}
                    value={customFeedback}
                    onChange={(e) => setCustomFeedback(e.target.value)}
                    className="bg-white border-slate-200 dark:bg-zinc-950 dark:border-zinc-850 dark:text-zinc-200 text-xs rounded-xl mt-1 focus:ring-1"
                  />
                </div>

                {/* Teacher notes */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Private Teacher Notes</Label>
                  <Textarea
                    rows={3}
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    className="bg-white border-slate-200 dark:bg-zinc-950 dark:border-zinc-850 dark:text-zinc-200 text-xs rounded-xl mt-1 focus:ring-1"
                    placeholder="Add notes for internal assessment review..."
                  />
                </div>

                {/* Corrections List */}
                {result.corrections && result.corrections.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Corrections identified</Label>
                    <div className="max-h-24 overflow-y-auto border border-slate-100 dark:border-zinc-850 rounded-xl bg-white dark:bg-zinc-950/40 p-3 space-y-1">
                      {result.corrections.map((item: string, i: number) => (
                        <p key={i} className="text-[11px] text-slate-600 dark:text-zinc-350 flex items-start gap-1">
                          <span className="text-red-500 font-bold shrink-0">•</span> {item}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer approve button */}
                <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setResult(null)} className="text-slate-500 text-xs rounded-xl h-9 hover:bg-slate-100 dark:hover:bg-zinc-855">
                    Reset
                  </Button>
                  <Button onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-5 rounded-xl transition-all shadow-md">
                    Approve & Save Marks
                  </Button>
                </div>

              </div>
            )}
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
    } catch (error: any) {
      toast.error(error.message || "Could not schedule class.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create live learning session</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Lesson title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Grade 12 Maths: Calculus revision" />
          </div>
          <div>
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger disabled={subjectsLoading || subjectOptions.length === 0}>
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
            <Label>Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="native">Native Classroom (Cloudflare)</SelectItem>
                <SelectItem value="youtube">YouTube Live</SelectItem>
                <SelectItem value="zoom">Zoom Meeting</SelectItem>
                <SelectItem value="jitsi">Jitsi Meet</SelectItem>
                <SelectItem value="stream">Other Stream</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {platform !== "native" && (
            <div>
              <Label>Join URL *</Label>
              <Input value={joinUrl} onChange={e => setJoinUrl(e.target.value)} placeholder="https://..." />
            </div>
          )}
          <div>
            <Label>Access</Label>
            <Select value={accessMode} onValueChange={setAccessMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="school-and-public">School and self-learners</SelectItem>
                <SelectItem value="school-only">School class only</SelectItem>
                <SelectItem value="public-support">Open support lesson</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <Label>Max learners</Label>
            <Input type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} placeholder="Unlimited" />
          </div>
          <div>
            <Label>Attach PDF / worksheet</Label>
            <Input type="file" accept=".pdf,.txt,.md,image/*" onChange={(e) => setResourceFile(e.target.files?.[0] || null)} />
          </div>
          <div className="md:col-span-2">
            <Label>Lesson plan</Label>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Objectives, resources, homework, marks allocation..." />
          </div>
          <div className="md:col-span-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            This creates an in-app lesson. Teachers can start the studio from the lesson card, learners join inside the app, and recordings/resources can be stored through Cloudflare.
          </div>
          <Button className="md:col-span-2 bg-red-600 hover:bg-red-700" onClick={handleCreate} disabled={creating}>
            {creating ? "Creating..." : "Create lesson"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
