import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/AuthProvider";
import { toast } from "sonner";
import {
  Video,
  Plus,
  Clock,
  Users,
  Link2,
  Copy,
  Radio,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
  School,
  Lock,
  BookOpen,
  Trash2,
  ExternalLink,
  Play,
  StopCircle,
  Filter,
  Share2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Access mode config ───────────────────────────────────────────
const ACCESS_MODES = [
  {
    value: "school-only",
    label: "School Only",
    description: "Only enrolled students in the selected class",
    icon: Lock,
    color: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-500/30",
  },
  {
    value: "school-and-public",
    label: "School + Public",
    description: "Students and anyone with the link",
    icon: Globe,
    color: "text-blue-500",
    bg: "bg-blue-500/10 border-blue-500/30",
  },
  {
    value: "public-support",
    label: "Guest Support",
    description: "Open to external tutors or parents",
    icon: Users,
    color: "text-purple-500",
    bg: "bg-purple-500/10 border-purple-500/30",
  },
];

// ─── Status config ────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  scheduled: {
    label: "Scheduled",
    color: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    dot: "bg-blue-400",
  },
  live: {
    label: "Live Now",
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400 animate-pulse",
  },
  ended: {
    label: "Ended",
    color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
    dot: "bg-zinc-400",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-500/15 text-red-400 border-red-500/20",
    dot: "bg-red-400",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────
function formatDateTime(ms: number) {
  return new Date(ms).toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getAccessMode(mode?: string) {
  return ACCESS_MODES.find((m) => m.value === mode) || ACCESS_MODES[1];
}

// ─── Main component ───────────────────────────────────────────────
export default function LiveClassesPage() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const isStudent = user?.role === "student";

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [shareClass, setShareClass] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  // Queries
  const liveClasses = useQuery(api.liveClasses.getLiveClasses, {
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
  });
  const subjects = useQuery(api.subjects.getSubjects);
  const classes = useQuery(api.classes.getClasses);

  // Mutations
  const createLiveClass = useMutation(api.liveClasses.createLiveClass);
  const updateStatus = useMutation(api.liveClasses.updateLiveClassStatus);
  const deleteLiveClass = useMutation(api.liveClasses.deleteLiveClass);

  // ─── Form state ────────────────────────────────────────────────
  const [form, setForm] = useState({
    title: "",
    description: "",
    subject: "",
    class: "",
    startTime: "",
    platform: "zoom",
    joinUrl: "",
    accessMode: "school-only",
    notifyEnrolled: true,
  });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!form.title || !form.subject || !form.joinUrl || !form.startTime) {
      toast.error("Please fill in all required fields");
      return;
    }
    setCreating(true);
    try {
      await createLiveClass({
        title: form.title,
        description: form.description || undefined,
        subject: form.subject as any,
        class: form.class ? (form.class as any) : undefined,
        startTime: new Date(form.startTime).getTime(),
        platform: form.platform,
        joinUrl: form.joinUrl,
        accessMode: form.accessMode as any,
        notifyEnrolled: form.notifyEnrolled,
      });
      toast.success("Live class scheduled!");
      setShowCreate(false);
      setForm({
        title: "",
        description: "",
        subject: "",
        class: "",
        startTime: "",
        platform: "zoom",
        joinUrl: "",
        accessMode: "school-only",
        notifyEnrolled: true,
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to create live class");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (classId: string, newStatus: string) => {
    try {
      await updateStatus({ liveClassId: classId as any, status: newStatus as any });
      toast.success(`Class marked as ${newStatus}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    }
  };

  const handleDelete = async (classId: string) => {
    try {
      await deleteLiveClass({ liveClassId: classId as any });
      toast.success("Live class deleted");
      setConfirmDelete(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  const copyToClipboard = (text: string, label = "Link") => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Filter classes the teacher teaches
  const teacherClasses = useMemo(() => {
    if (!classes) return [];
    return classes;
  }, [classes]);

  const loading = liveClasses === undefined;

  // ─── Tabs count ────────────────────────────────────────────────
  const counts = useMemo(() => {
    if (!liveClasses) return {};
    return {
      all: liveClasses.length,
      live: liveClasses.filter((c) => c.status === "live").length,
      scheduled: liveClasses.filter((c) => c.status === "scheduled").length,
      ended: liveClasses.filter((c) => c.status === "ended").length,
    };
  }, [liveClasses]);

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-blue-600/5 to-transparent pointer-events-none" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30">
                  <Radio className="h-5 w-5 text-violet-400" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                  Live Classes
                </span>
              </div>
              <h1 className="text-3xl font-bold text-foreground">
                Live Class Hub
              </h1>
              <p className="text-muted-foreground mt-1">
                {isTeacher
                  ? "Schedule, manage and share live sessions with your students"
                  : "Join live sessions from your teachers"}
              </p>
            </div>
            {isTeacher && (
              <Button
                onClick={() => setShowCreate(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-900/30 gap-2"
                id="create-live-class-btn"
              >
                <Plus className="h-4 w-4" />
                Schedule Live Class
              </Button>
            )}
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-2 mt-6 flex-wrap">
            {[
              { key: "all", label: "All" },
              { key: "live", label: "Live Now" },
              { key: "scheduled", label: "Upcoming" },
              { key: "ended", label: "Ended" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
                  statusFilter === tab.key
                    ? "bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-900/30"
                    : "border-border/60 text-muted-foreground hover:border-violet-500/40 hover:text-foreground bg-background/50"
                )}
              >
                {tab.key === "live" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
                {tab.label}
                {counts[tab.key as keyof typeof counts] !== undefined && (
                  <span className={cn(
                    "ml-1 px-1.5 py-0.5 rounded-full text-xs",
                    statusFilter === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {counts[tab.key as keyof typeof counts]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Content ─────────────────────────────────────────────── */}
      <div className="p-6 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        ) : !liveClasses || liveClasses.length === 0 ? (
          <EmptyState isTeacher={isTeacher} onSchedule={() => setShowCreate(true)} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {liveClasses.map((liveClass) => (
              <LiveClassCard
                key={liveClass._id}
                liveClass={liveClass}
                subjects={subjects || []}
                classes={teacherClasses}
                isTeacher={isTeacher}
                isStudent={isStudent}
                onStatusChange={handleStatusChange}
                onShare={() => setShareClass(liveClass)}
                onDelete={() => setConfirmDelete(liveClass)}
                onCopy={copyToClipboard}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Create Dialog ───────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              Schedule a Live Class
            </DialogTitle>
            <DialogDescription>
              Create a live session for your students. Choose who can access it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Class Title <span className="text-red-400">*</span>
              </label>
              <Input
                id="live-class-title"
                placeholder="e.g. Grade 10 Mathematics – Quadratic Equations"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                id="live-class-description"
                placeholder="What will be covered in this session? (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>

            {/* Subject + Class row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Subject <span className="text-red-400">*</span>
                </label>
                <Select value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v })}>
                  <SelectTrigger id="live-subject-select">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects?.map((s: any) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Target Class</label>
                <Select value={form.class} onValueChange={(v) => setForm({ ...form, class: v })}>
                  <SelectTrigger id="live-class-select">
                    <SelectValue placeholder="All classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_classes">All Classes</SelectItem>
                    {teacherClasses?.map((c: any) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date/Time + Platform row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Start Time <span className="text-red-400">*</span>
                </label>
                <Input
                  id="live-start-time"
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Platform</label>
                <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                  <SelectTrigger id="live-platform-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zoom">Zoom</SelectItem>
                    <SelectItem value="google-meet">Google Meet</SelectItem>
                    <SelectItem value="teams">Microsoft Teams</SelectItem>
                    <SelectItem value="youtube">YouTube Live</SelectItem>
                    <SelectItem value="jitsi">Jitsi (Free)</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Join URL */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Join Link / URL <span className="text-red-400">*</span>
              </label>
              <Input
                id="live-join-url"
                type="url"
                placeholder="https://zoom.us/j/..."
                value={form.joinUrl}
                onChange={(e) => setForm({ ...form, joinUrl: e.target.value })}
              />
            </div>

            {/* Access Mode */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Who can access this class?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ACCESS_MODES.map((mode) => {
                  const Icon = mode.icon;
                  const active = form.accessMode === mode.value;
                  return (
                    <button
                      key={mode.value}
                      id={`access-mode-${mode.value}`}
                      onClick={() => setForm({ ...form, accessMode: mode.value })}
                      className={cn(
                        "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                        active
                          ? `${mode.bg} border-opacity-100 ring-1 ring-current`
                          : "border-border/50 hover:border-border"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 mb-1.5", active ? mode.color : "text-muted-foreground")} />
                      <span className={cn("text-sm font-semibold", active ? mode.color : "text-foreground")}>
                        {mode.label}
                      </span>
                      <span className="text-xs text-muted-foreground leading-tight mt-0.5">
                        {mode.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notify students */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
              <input
                id="notify-enrolled"
                type="checkbox"
                checked={form.notifyEnrolled}
                onChange={(e) => setForm({ ...form, notifyEnrolled: e.target.checked })}
                className="h-4 w-4 rounded accent-violet-600"
              />
              <div>
                <label htmlFor="notify-enrolled" className="text-sm font-medium cursor-pointer">
                  Notify enrolled students
                </label>
                <p className="text-xs text-muted-foreground">
                  Send in-app notification to students in the target class
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button
                id="submit-live-class-btn"
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarClock className="h-4 w-4 mr-2" />}
                Schedule Class
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Share Dialog ────────────────────────────────────────── */}
      <Dialog open={!!shareClass} onOpenChange={() => setShareClass(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-violet-500" />
              Share Class
            </DialogTitle>
            <DialogDescription>
              Share the link with your students or external participants
            </DialogDescription>
          </DialogHeader>
          {shareClass && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-muted/50 border border-border/60 space-y-1">
                <p className="text-sm font-semibold text-foreground">{shareClass.title}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(shareClass.startTime)}</p>
              </div>

              {/* Join Link */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Join Link
                </label>
                <div className="flex gap-2">
                  <Input readOnly value={shareClass.joinUrl} className="text-xs font-mono" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(shareClass.joinUrl, "Join link")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Access Badge */}
              <div className="flex items-center gap-2">
                {(() => {
                  const mode = getAccessMode(shareClass.accessMode);
                  const Icon = mode.icon;
                  return (
                    <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium w-full", mode.bg)}>
                      <Icon className={cn("h-4 w-4", mode.color)} />
                      <span className={mode.color}>{mode.label}</span>
                      <span className="text-muted-foreground text-xs ml-auto">{mode.description}</span>
                    </div>
                  );
                })()}
              </div>

              <Button
                className="w-full gap-2"
                onClick={() => window.open(shareClass.joinUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
                Open Class Link
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm ──────────────────────────────────────── */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-500">Delete Live Class</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{confirmDelete?.title}</strong> and all attendance records. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => handleDelete(confirmDelete._id)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Live Class Card ──────────────────────────────────────────────
function LiveClassCard({
  liveClass,
  subjects,
  classes,
  isTeacher,
  isStudent,
  onStatusChange,
  onShare,
  onDelete,
  onCopy,
}: {
  liveClass: any;
  subjects: any[];
  classes: any[];
  isTeacher: boolean;
  isStudent: boolean;
  onStatusChange: (id: string, status: string) => void;
  onShare: () => void;
  onDelete: () => void;
  onCopy: (text: string, label?: string) => void;
}) {
  const status = STATUS_CONFIG[liveClass.status] || STATUS_CONFIG["scheduled"];
  const subject = subjects.find((s) => s._id === liveClass.subject);
  const cls = classes.find((c) => c._id === liveClass.class);
  const mode = getAccessMode(liveClass.accessMode);
  const ModeIcon = mode.icon;

  const isLive = liveClass.status === "live";
  const isScheduled = liveClass.status === "scheduled";
  const isEnded = liveClass.status === "ended" || liveClass.status === "cancelled";

  return (
    <div
      className={cn(
        "group relative rounded-2xl border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
        isLive
          ? "border-emerald-500/40 shadow-md shadow-emerald-900/20"
          : "border-border/60 hover:border-violet-500/30 hover:shadow-violet-900/10"
      )}
    >
      {/* Live pulse bar */}
      {isLive && (
        <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
      )}

      <div className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border",
                  status.color
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                {status.label}
              </span>
            </div>
            <h3 className="font-semibold text-foreground text-base leading-tight truncate">
              {liveClass.title}
            </h3>
          </div>

          {/* Platform badge */}
          <div className="flex-shrink-0 px-2 py-1 rounded-lg bg-muted/70 text-xs text-muted-foreground font-medium capitalize">
            {liveClass.platform}
          </div>
        </div>

        {/* Meta info */}
        <div className="space-y-2 text-sm text-muted-foreground">
          {subject && (
            <div className="flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{subject.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{formatDateTime(liveClass.startTime)}</span>
          </div>
          {cls && (
            <div className="flex items-center gap-2">
              <School className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{cls.name}</span>
            </div>
          )}
        </div>

        {/* Access mode pill */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium",
          mode.bg
        )}>
          <ModeIcon className={cn("h-3.5 w-3.5", mode.color)} />
          <span className={mode.color}>{mode.label}</span>
        </div>

        {/* Description */}
        {liveClass.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {liveClass.description}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          {/* Join / Open */}
          <Button
            id={`join-class-${liveClass._id}`}
            size="sm"
            className={cn(
              "flex-1 gap-1.5 text-xs",
              isLive
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-900/30"
                : "bg-violet-600 hover:bg-violet-700 text-white"
            )}
            onClick={() => window.open(liveClass.joinUrl, "_blank")}
          >
            {isLive ? <Play className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
            {isLive ? "Join Live" : "Open Link"}
          </Button>

          {/* Share */}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={onShare}
            id={`share-class-${liveClass._id}`}
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>

          {/* Teacher controls */}
          {isTeacher && !isEnded && (
            <>
              {isScheduled && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10"
                  onClick={() => onStatusChange(liveClass._id, "live")}
                  id={`go-live-${liveClass._id}`}
                >
                  <Radio className="h-3.5 w-3.5" />
                </Button>
              )}
              {isLive && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-red-500/40 text-red-500 hover:bg-red-500/10"
                  onClick={() => onStatusChange(liveClass._id, "ended")}
                  id={`end-class-${liveClass._id}`}
                >
                  <StopCircle className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}

          {/* Delete (teacher only) */}
          {isTeacher && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground hover:text-red-500"
              onClick={onDelete}
              id={`delete-class-${liveClass._id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────
function EmptyState({
  isTeacher,
  onSchedule,
}: {
  isTeacher: boolean;
  onSchedule: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
          <Video className="h-9 w-9 text-violet-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-background">
          <span className="text-white text-xs font-bold">!</span>
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground">No live classes yet</h3>
      <p className="text-muted-foreground mt-1 text-sm max-w-xs">
        {isTeacher
          ? "Schedule your first live class and share it with your students."
          : "Your teacher hasn't scheduled any live classes yet. Check back soon!"}
      </p>
      {isTeacher && (
        <Button
          className="mt-6 bg-violet-600 hover:bg-violet-700 text-white gap-2"
          onClick={onSchedule}
        >
          <Plus className="h-4 w-4" />
          Schedule First Class
        </Button>
      )}
    </div>
  );
}
