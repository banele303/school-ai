import { useState } from "react";
import { Plus, FileText, Clock, Users, Loader2, Zap, GraduationCap, BookOpen, Trophy, RotateCcw, Swords, RadioTower } from "lucide-react";
import { useAuth } from "@/hooks/AuthProvider";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { useNavigate } from "react-router";
import ExamGenerator from "@/components/lms/ExamGenerator";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const Exams = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const isStudent = user?.role === "student";

  const convexExams = useQuery(api.exams.getExams, {}) || [];
  const [isGenOpen, setIsGenOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "quiz" | "exam" | "arena">("all");
  const [arenaCode, setArenaCode] = useState("");
  const navigate = useNavigate();
  const activeArenas = useQuery((api as any).arenas.getActiveArenas, {}) || [];
  const joinArena = useMutation((api as any).arenas.joinArena);

  // Separate quizzes and exams
  const quizzes = convexExams.filter((e: any) => e.examType === "quiz");
  const exams = convexExams.filter((e: any) => e.examType === "exam");

  // For students, show quizzes first (they can do those)
  // For teachers, show exams first (they manage those)
  const defaultTab = isStudent ? "quiz" : "exam";

  const displayExams =
    activeTab === "all" ? convexExams : activeTab === "quiz" ? quizzes : exams;

  const handleJoinArena = async (code: string) => {
    try {
      const result = await joinArena({ code });
      navigate(`/lms/exams/${result.examId}?arena=${result.arenaId}`);
    } catch (error: any) {
      toast.error(error.message || "Could not join arena");
    }
  };

  if (convexExams === undefined) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assessments</h1>
          <p className="text-muted-foreground">
            {isTeacher
              ? "Create and manage quizzes and exams for your classes."
              : "Take quizzes for practice or write scheduled exams."}
          </p>
        </div>
        {isTeacher && (
          <Button onClick={() => setIsGenOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Assessment
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <BookOpen className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{convexExams.length}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Zap className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{quizzes.length}</div>
              <div className="text-xs text-muted-foreground">Quizzes</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <GraduationCap className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{exams.length}</div>
              <div className="text-xs text-muted-foreground">Exams</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Trophy className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {convexExams.filter((e: any) => e.isActive).length}
              </div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="quiz" className="flex items-center gap-1">
            <Zap className="h-3 w-3" /> Quizzes
          </TabsTrigger>
          <TabsTrigger value="exam" className="flex items-center gap-1">
            <GraduationCap className="h-3 w-3" /> Exams
          </TabsTrigger>
          <TabsTrigger value="arena" className="flex items-center gap-1">
            <Swords className="h-3 w-3" /> Arenas
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {activeTab === "arena" ? (
            <div className="space-y-4">
              <Card className="border-cyan-500/20 bg-zinc-950 text-zinc-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <RadioTower className="h-5 w-5 text-cyan-300" /> Join Live Battle
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <Input
                    value={arenaCode}
                    onChange={(event) => setArenaCode(event.target.value.toUpperCase())}
                    placeholder="BATTLE-293"
                    className="border-zinc-700 bg-zinc-900 text-zinc-50"
                  />
                  <Button onClick={() => handleJoinArena(arenaCode)} disabled={!arenaCode.trim()}>
                    Join Arena
                  </Button>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeArenas.map((arena: any) => (
                  <Card key={arena._id} className="border-cyan-500/20">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{arena.code}</Badge>
                        <Badge>{arena.status}</Badge>
                      </div>
                      <CardTitle className="text-lg">{arena.examDetails?.title || "Battle Arena"}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {arena.participants.length} contenders waiting
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" onClick={() => handleJoinArena(arena.code)}>
                        <Swords className="mr-2 h-4 w-4" /> Enter Lobby
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          ) : displayExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <div className="text-4xl mb-3">
                {activeTab === "quiz" ? "⚡" : activeTab === "exam" ? "🎓" : "📋"}
              </div>
              <p className="text-muted-foreground">
                {activeTab === "quiz"
                  ? "No quizzes yet. Quizzes are great for student practice and revision."
                  : activeTab === "exam"
                  ? "No exams yet. Create a formal exam for your class."
                  : "No assessments yet. Create your first quiz or exam!"}
              </p>
              {isTeacher && (
                <Button variant="outline" className="mt-4" onClick={() => setIsGenOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create {activeTab === "all" ? "Assessment" : activeTab === "quiz" ? "Quiz" : "Exam"}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayExams.map((exam: any) => (
                <Card
                  className="hover:shadow-md transition-shadow"
                  key={exam._id}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between pb-2">
                      <div className="flex items-center gap-2">
                        {/* Type badge */}
                        <Badge
                          variant={exam.examType === "quiz" ? "secondary" : "default"}
                          className={cn(
                            "text-xs",
                            exam.examType === "quiz"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          )}
                        >
                          {exam.examType === "quiz" ? (
                            <><Zap className="h-3 w-3 mr-1" /> Quiz</>
                          ) : (
                            <><GraduationCap className="h-3 w-3 mr-1" /> Exam</>
                          )}
                        </Badge>
                        <Badge variant={exam.isActive ? "default" : "outline"} className="text-xs">
                          {exam.isActive ? "Active" : "Draft"}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(exam.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <CardTitle className="mt-1 text-lg">{exam.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {exam.subject?.name || "Subject"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {exam.class?.name || "Class"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {exam.duration} mins • {exam.questions?.length || 0} questions
                      {exam.totalPoints ? ` • ${exam.totalPoints} pts` : ""}
                    </div>
                    {/* Quiz-specific info */}
                    {exam.examType === "quiz" && (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <RotateCcw className="h-3 w-3" />
                        {exam.maxAttempts || 3} attempts allowed
                        {exam.instantFeedback && " • Instant feedback"}
                      </div>
                    )}
                    {/* Topics */}
                    {exam.syllabusTopics && exam.syllabusTopics.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {exam.syllabusTopics.slice(0, 3).map((topic: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {topic}
                          </Badge>
                        ))}
                        {exam.syllabusTopics.length > 3 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{exam.syllabusTopics.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <div className="flex w-full gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate(`/lms/exams/${exam._id}`)}
                      >
                        {isTeacher
                          ? exam.isActive ? "Manage" : "Review & Publish"
                          : exam.examType === "quiz"
                          ? "Start Quiz"
                          : "Start Exam"}
                      </Button>
                      {isTeacher && exam.examType === "exam" && (
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => navigate(`/lms/exams/${exam._id}/arena`)}
                          title="Host battle arena"
                        >
                          <Swords className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ExamGenerator
        open={isGenOpen}
        onOpenChange={setIsGenOpen}
        onSuccess={() => {}}
      />
    </div>
  );
};

export default Exams;
