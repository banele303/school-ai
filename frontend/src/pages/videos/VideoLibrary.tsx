import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/AuthProvider";
import {
  BookOpen,
  CheckCircle,
  Eye,
  Filter,
  Library,
  Play,
  Plus,
  Search,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { uploadFileToR2 } from "@/lib/cloudflareWorker";

const grades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function VideoLibraryPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [nowPlaying, setNowPlaying] = useState<any>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const subjects = useQuery(api.subjects.getSubjects);
  const videos = useQuery(api.videoLibrary.getVideos, {}) || [];
  const myProgress = user?.role === "student" ? useQuery(api.videoLibrary.getMyProgress, {}) : null;
  const createVideo = useMutation(api.videoLibrary.createVideo);
  const incrementView = useMutation(api.videoLibrary.incrementViewCount);

  const playlists = useMemo(
    () => [...new Set(videos.filter((v: any) => v.playlist).map((v: any) => v.playlist))],
    [videos]
  );

  const filteredVideos = videos.filter((video: any) => {
    if (activeTab === "completed" && user?.role === "student") {
      const progress = myProgress?.find((p: any) => p.video === video._id);
      if (!progress?.completed) return false;
    } else if (activeTab === "in-progress" && user?.role === "student") {
      const progress = myProgress?.find((p: any) => p.video === video._id);
      if (progress?.completed || !progress) return false;
    } else if (!["all", "completed", "in-progress"].includes(activeTab) && video.playlist !== activeTab) {
      return false;
    }

    if (selectedGrade !== "all" && video.grade !== Number(selectedGrade)) return false;
    if (selectedSubject !== "all" && video.subject !== selectedSubject) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      video.title?.toLowerCase().includes(q) ||
      video.description?.toLowerCase().includes(q) ||
      video.tags?.some((tag: string) => tag.toLowerCase().includes(q))
    );
  });

  const handlePlayVideo = (video: any) => {
    setNowPlaying(video);
    void incrementView({ videoId: video._id });
  };

  const getYoutubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  return (
    <div className="min-h-full bg-slate-50 text-slate-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6">
        <section className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-zinc-800 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <Library className="h-4 w-4" />
              Learning media
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Video Library</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-zinc-400">
                Browse uploaded lessons, recorded classes, and teacher-curated playlists.
              </p>
            </div>
          </div>
          {isTeacher && (
            <Button onClick={() => setShowUploadDialog(true)} className="gap-2 bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200">
              <Plus className="h-4 w-4" />
              Add Video
            </Button>
          )}
        </section>

        <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-[1fr_160px_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search videos, topics, or tags" className="pl-9" />
          </div>
          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger>
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {grades.map((grade) => (
                <SelectItem key={grade} value={String(grade)}>Grade {grade}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger>
              <BookOpen className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects?.map((subject: any) => (
                <SelectItem key={subject._id} value={subject._id}>{subject.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto flex-wrap justify-start bg-white p-1 shadow-sm dark:bg-zinc-900">
            <TabsTrigger value="all">All Videos</TabsTrigger>
            {user?.role === "student" && <TabsTrigger value="in-progress">In Progress</TabsTrigger>}
            {user?.role === "student" && <TabsTrigger value="completed">Completed</TabsTrigger>}
            {playlists.map((playlist) => (
              <TabsTrigger key={playlist} value={playlist}>{playlist}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-5">
            {filteredVideos.length === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <Video className="mb-3 h-12 w-12 text-slate-300 dark:text-zinc-700" />
                <h3 className="text-base font-semibold">No videos found</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Try another search, grade, subject, or playlist.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredVideos.map((video: any) => {
                  const subject = subjects?.find((item: any) => item._id === video.subject);
                  const progress = myProgress?.find((item: any) => item.video === video._id);

                  return (
                    <Card key={video._id} className="group overflow-hidden border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                      <button type="button" className="block w-full text-left" onClick={() => handlePlayVideo(video)}>
                        <div className="relative aspect-video bg-slate-900">
                          {video.thumbnailUrl ? (
                            <img src={video.thumbnailUrl} alt={video.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950">
                              <Play className="h-12 w-12 text-white/80" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition group-hover:opacity-100">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-950 shadow-lg">
                              <Play className="ml-1 h-6 w-6" />
                            </span>
                          </div>
                          {!video.isPublished && isTeacher && (
                            <Badge className="absolute left-3 top-3 bg-amber-500 text-slate-950">Draft</Badge>
                          )}
                          {progress?.completed && <CheckCircle className="absolute right-3 top-3 h-6 w-6 rounded-full bg-white text-emerald-600" />}
                        </div>
                      </button>
                      <CardContent className="space-y-3 p-4">
                        <div>
                          <h2 className="line-clamp-2 text-sm font-semibold leading-5">{video.title}</h2>
                          {video.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-zinc-400">{video.description}</p>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {subject && <Badge variant="secondary">{subject.name}</Badge>}
                          {video.grade && <Badge variant="outline">Grade {video.grade}</Badge>}
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-400">
                            <Eye className="h-3.5 w-3.5" />
                            {video.viewCount || 0}
                          </span>
                        </div>
                        {progress && !progress.completed && (
                          <div className="space-y-1">
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress.percentage}%` }} />
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400">{Math.round(progress.percentage)}% watched</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={!!nowPlaying} onOpenChange={() => setNowPlaying(null)}>
          <DialogContent className="max-w-5xl overflow-hidden p-0">
            {nowPlaying && (
              <>
                <DialogHeader className="border-b p-4 dark:border-zinc-800">
                  <DialogTitle className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-base">{nowPlaying.title}</span>
                    <Button size="icon" variant="ghost" onClick={() => setNowPlaying(null)} className="h-8 w-8 shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </DialogTitle>
                </DialogHeader>
                <div className="aspect-video bg-black">
                  {nowPlaying.videoType === "youtube" ? (
                    <iframe
                      src={getYoutubeEmbedUrl(nowPlaying.videoUrl)}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video src={nowPlaying.videoUrl} className="h-full w-full" controls autoPlay playsInline preload="metadata" />
                  )}
                </div>
                {nowPlaying.description && <div className="p-4 text-sm text-slate-600 dark:text-zinc-400">{nowPlaying.description}</div>}
              </>
            )}
          </DialogContent>
        </Dialog>

        {isTeacher && (
          <UploadVideoDialog
            open={showUploadDialog}
            onClose={() => setShowUploadDialog(false)}
            subjects={subjects}
            createVideo={createVideo}
          />
        )}
      </div>
    </div>
  );
}

function UploadVideoDialog({ open, onClose, subjects, createVideo }: any) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoType, setVideoType] = useState("r2");
  const [subjectId, setSubjectId] = useState("");
  const [playlist, setPlaylist] = useState("");
  const [grade, setGrade] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setVideoUrl("");
    setSubjectId("");
    setGrade("");
    setPlaylist("");
    setVideoFile(null);
    setVideoType("r2");
  };

  const handleCreate = async () => {
    if (!title.trim()) return toast.error("Please add a video title.");
    if (!subjectId) return toast.error("Please choose a subject.");
    if (videoType === "r2" && !videoFile) return toast.error("Please choose a video file to upload.");
    if (videoType !== "r2" && !videoUrl.trim()) return toast.error("Please add a video URL.");

    setSaving(true);
    try {
      let finalUrl = videoUrl.trim();
      if (videoType === "r2" && videoFile) {
        const upload = await uploadFileToR2(videoFile, { title: title.trim(), description: description.trim() });
        finalUrl = upload.fileUrl;
      }

      await createVideo({
        title: title.trim(),
        description: description.trim() || undefined,
        subject: subjectId,
        videoUrl: finalUrl,
        videoType,
        grade: grade ? Number(grade) : undefined,
        playlist: playlist.trim() || undefined,
        isPublished: true,
      });

      toast.success("Video uploaded and published.");
      resetForm();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Video upload failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5" />
            Add Video
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Introduction to Algebra" />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Short lesson summary" />
          </div>
          <div className="grid gap-2">
            <Label>Source</Label>
            <Select value={videoType} onValueChange={setVideoType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="r2">Upload video file</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="external">External direct link</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {videoType === "r2" ? (
            <div className="grid gap-2">
              <Label>Video file *</Label>
              <Input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label>Video URL *</Label>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="YouTube URL or direct video file URL" />
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Subject *</Label>
              <Select value={subjectId} onValueChange={setSubjectId} disabled={!subjects?.length}>
                <SelectTrigger><SelectValue placeholder={subjects?.length ? "Choose subject" : "No subjects found"} /></SelectTrigger>
                <SelectContent>
                  {subjects?.map((subject: any) => (
                    <SelectItem key={subject._id} value={subject._id}>{subject.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue placeholder="Choose grade" /></SelectTrigger>
                <SelectContent>
                  {grades.map((item) => <SelectItem key={item} value={String(item)}>Grade {item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Playlist</Label>
            <Input value={playlist} onChange={(e) => setPlaylist(e.target.value)} placeholder="e.g. Grade 10 Maths Term 1" />
          </div>
          <Button onClick={handleCreate} disabled={saving} className="w-full gap-2 bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200">
            <UploadCloud className="h-4 w-4" />
            {saving ? "Uploading..." : "Upload and Publish"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
