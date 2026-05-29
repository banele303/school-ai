import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/AuthProvider";
import { Play, Search, Clock, Eye, BookOpen, Filter, Plus, Youtube, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function VideoLibraryPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [nowPlaying, setNowPlaying] = useState<any>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  const subjects = useQuery(api.subjects.getSubjects);
  const videos = useQuery(api.videoLibrary.getVideos, {});
  const myProgress = user?.role === "student" ? useQuery(api.videoLibrary.getMyProgress, {}) : null;

  const createVideo = useMutation(api.videoLibrary.createVideo);
  const incrementView = useMutation(api.videoLibrary.incrementViewCount);

  const filteredVideos = (videos || []).filter((v: any) => {
    if (activeTab === "completed" && user?.role === "student") {
      const progress = myProgress?.find((p: any) => p.video === v._id);
      if (!progress?.completed) return false;
    }
    if (activeTab === "in-progress" && user?.role === "student") {
      const progress = myProgress?.find((p: any) => p.video === v._id);
      if (progress?.completed || !progress) return false;
    }
    if (selectedGrade !== "all" && v.grade !== Number(selectedGrade)) return false;
    if (selectedSubject !== "all" && v.subject !== selectedSubject) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return v.title?.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q) || v.tags?.some((t: string) => t.toLowerCase().includes(q));
    }
    return true;
  });

  const handlePlayVideo = (video: any) => {
    setNowPlaying(video);
    try { incrementView({ videoId: video._id }); } catch {}
  };

  const getYoutubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  // Group videos by playlist
  const playlists = [...new Set((videos || []).filter((v: any) => v.playlist).map((v: any) => v.playlist))];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
              <Play className="h-5 w-5 text-white" />
            </div>
            Video Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Watch lessons, tutorials, and recorded classes
          </p>
        </div>
        {isTeacher && (
          <Button onClick={() => setShowUploadDialog(true)} className="gap-2 bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4" /> Add Video
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search videos..." className="pl-9" />
        </div>
        <Select value={selectedGrade} onValueChange={setSelectedGrade}>
          <SelectTrigger className="w-full md:w-36">
            <Filter className="h-4 w-4 mr-2" /> {selectedGrade === "all" ? "All Grades" : `Grade ${selectedGrade}`}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
              <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-full md:w-44">
            <BookOpen className="h-4 w-4 mr-2" /> {selectedSubject === "all" ? "All Subjects" : subjects?.find((s: any) => s._id === selectedSubject)?.name || "Subject"}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects?.map((s: any) => (
              <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Videos</TabsTrigger>
          {user?.role === "student" && <TabsTrigger value="in-progress">In Progress</TabsTrigger>}
          {user?.role === "student" && <TabsTrigger value="completed">Completed</TabsTrigger>}
          {playlists.map(p => (
            <TabsTrigger key={p} value={p} className="hidden md:inline-flex">{p}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredVideos.length === 0 ? (
            <div className="text-center py-16">
              <Play className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">No videos found</h3>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredVideos.map((video: any) => {
                const subject = subjects?.find((s: any) => s._id === video.subject);
                const progress = myProgress?.find((p: any) => p.video === video._id);

                return (
                  <Card key={video._id} className="hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={() => handlePlayVideo(video)}>
                    <div className="relative aspect-video bg-gray-100 dark:bg-gray-900 rounded-t-lg overflow-hidden">
                      {video.thumbnailUrl ? (
                        <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Youtube className="h-12 w-12 text-red-500" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                          <Play className="h-7 w-7 text-gray-900 ml-1" />
                        </div>
                      </div>
                      {video.duration && (
                        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                          {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, "0")}
                        </span>
                      )}
                      {progress?.completed && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="h-6 w-6 text-green-500 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm line-clamp-2">{video.title}</CardTitle>
                      {video.description && (
                        <CardDescription className="text-xs line-clamp-1">{video.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {subject && <Badge variant="secondary" className="text-[10px]">{subject.name}</Badge>}
                        {video.grade && <Badge variant="outline" className="text-[10px]">Gr {video.grade}</Badge>}
                        {video.viewCount > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {video.viewCount}
                          </span>
                        )}
                      </div>
                      {progress && !progress.completed && (
                        <div className="mt-2">
                          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${progress.percentage}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{Math.round(progress.percentage)}% watched</span>
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

      {/* Video Player Dialog */}
      <Dialog open={!!nowPlaying} onOpenChange={() => setNowPlaying(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {nowPlaying && (
            <>
              <DialogHeader className="p-4 pb-0">
                <DialogTitle className="flex items-center justify-between">
                  <span className="text-base pr-8">{nowPlaying.title}</span>
                  <Button size="icon" variant="ghost" onClick={() => setNowPlaying(null)} className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </DialogTitle>
              </DialogHeader>
              <div className="aspect-video bg-black mt-2">
                {nowPlaying.videoType === "youtube" ? (
                  <iframe
                    src={getYoutubeEmbedUrl(nowPlaying.videoUrl)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video src={nowPlaying.videoUrl} className="w-full h-full" controls autoPlay />
                )}
              </div>
              {nowPlaying.description && (
                <div className="p-4 text-sm text-muted-foreground">{nowPlaying.description}</div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Video Dialog */}
      {isTeacher && (
        <UploadVideoDialog
          open={showUploadDialog}
          onClose={() => setShowUploadDialog(false)}
          subjects={subjects}
          createVideo={createVideo}
          userId={user?._id}
        />
      )}
    </div>
  );
}

function UploadVideoDialog({ open, onClose, subjects, createVideo }: any) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoType, setVideoType] = useState("youtube");
  const [subjectId, setSubjectId] = useState("");
  const [grade, setGrade] = useState("");
  const [playlist, setPlaylist] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!title || !videoUrl) { toast.error("Title and URL required"); return; }
    setSaving(true);
    try {
      await createVideo({ title, description, subject: subjectId, videoUrl, videoType, grade: grade ? Number(grade) : undefined, playlist: playlist || undefined });
      toast.success("Video added!");
      onClose();
      setTitle(""); setDescription(""); setVideoUrl(""); setGrade(""); setPlaylist("");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Video</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Introduction to Algebra" /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></div>
          <div><Label>Video URL *</Label><Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="YouTube embed URL or direct link" /></div>
          <div><Label>Type</Label>
            <Select value={videoType} onValueChange={setVideoType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="r2">Direct (R2)</SelectItem>
                <SelectItem value="external">External Link</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>{subjects?.map((s: any) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                <SelectContent>{[1,2,3,4,5,6,7,8,9,10,11,12].map(g => <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Playlist</Label><Input value={playlist} onChange={e => setPlaylist(e.target.value)} placeholder="e.g. Grade 10 Maths Term 1" /></div>
          <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={handleCreate} disabled={saving}>
            {saving ? "Adding..." : "Add Video"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
