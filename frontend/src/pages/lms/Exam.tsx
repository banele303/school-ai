import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Loader2,
  Clock,
  Calendar,
  Award,
  ArrowLeft,
  Printer,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Languages,
  Lightbulb,
  Mic,
  ShieldAlert,
  Swords,
  Users,
} from "lucide-react";

import { useAuth } from "@/hooks/AuthProvider";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import ExamRadio from "@/components/lms/ExamRadio";
import CognitiveRadar from "@/components/lms/CognitiveRadar";
import { cn } from "@/lib/utils";

const Exam = () => {
  const { id } = useParams();
  const searchParams = new URLSearchParams(window.location.search);
  const arenaId = searchParams.get("arena");
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  const [exam, setExam] = useState<any>(null);
  const convexExam = useQuery(api.exams.getExam, id ? { id: id as any } : "skip");
  const convexSubmissions = useQuery(api.submissions.getSubmissions, id ? { examId: id as any } : "skip");
  const submitConvexExam = useMutation(api.submissions.submitExam);
  const toggleExam = useMutation(api.exams.toggleExamActive);
  const deleteExamM = useMutation(api.exams.deleteExam);
  const arena = useQuery(
    (api as any).arenas.getArena,
    arenaId ? { arenaId: arenaId as any } : "skip"
  );
  const updateArenaProgress = useMutation((api as any).arenas.updateArenaProgress);
  
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<{
    score: number;
    answers: { questionId: string; answer: string }[];
    attemptNumber?: number;
  } | null>(null);
  // Student Answers State: { [questionId]: "Selected Option" }
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState<"en" | "zu" | "af">("en");
  const [hintedQuestions, setHintedQuestions] = useState<Record<string, boolean>>({});
  const [simulatorMode, setSimulatorMode] = useState(false);

  // Print & PDF Customizer Options
  const [printIncludeHeader, setPrintIncludeHeader] = useState(true);
  const [printIncludeLines, setPrintIncludeLines] = useState(true);
  const [printIncludeMemo, setPrintIncludeMemo] = useState(false);

  useEffect(() => {
    if (convexExam !== undefined) {
      setExam(convexExam);
      setLoading(false);
    }
  }, [convexExam]);

  useEffect(() => {
    if (isStudent && convexSubmissions !== undefined) {
      // Find submission for current user if returned
      if (convexSubmissions.length > 0) {
        setSubmission(convexSubmissions[0]);
      }
    }
  }, [isStudent, convexSubmissions]);

  useEffect(() => {
    if (!arenaId || !exam || !isStudent || submission) return;
    const answered = exam.questions.filter((q: any) => answers[q._id] || answers[q.questionText]).length;
    updateArenaProgress({
      arenaId: arenaId as any,
      progress: answered,
    }).catch(() => undefined);
  }, [answers, arenaId, exam, isStudent, submission, updateArenaProgress]);

  useEffect(() => {
    if (!simulatorMode) return;
    const block = (event: Event) => event.preventDefault();
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "Strict simulator mode is active.";
    };
    document.addEventListener("copy", block);
    document.addEventListener("paste", block);
    window.addEventListener("beforeunload", warn);
    document.documentElement.requestFullscreen?.().catch(() => undefined);
    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("paste", block);
      window.removeEventListener("beforeunload", warn);
    };
  }, [simulatorMode]);

  const getQuestionText = (q: any) => {
    if (language === "zu" && q.questionTextZulu) return q.questionTextZulu;
    if (language === "af" && q.questionTextAfrikaans) return q.questionTextAfrikaans;
    return q.questionText;
  };

  const getOptions = (q: any) => {
    if (language === "zu" && q.optionsZulu?.length) return q.optionsZulu;
    if (language === "af" && q.optionsAfrikaans?.length) return q.optionsAfrikaans;
    return q.options;
  };

  const requestHint = (q: any) => {
    const key = q._id || q.questionText;
    setHintedQuestions((prev) => ({ ...prev, [key]: true }));
    toast.info(`Hint: identify the ${q.cognitiveLevel || "key"} step before answering. Hint use caps this item.`);
  };

  const startDictation = (q: any) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech dictation is not supported in this browser");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = language === "af" ? "af-ZA" : language === "zu" ? "zu-ZA" : "en-ZA";
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join(" ");
      setAnswers((prev) => ({ ...prev, [q._id]: `${prev[q._id] || ""} ${transcript}`.trim() }));
    };
    recognition.start();
  };

  const totalPoints = exam
    ? (exam.totalPoints || exam.questions.reduce((s: number, q: any) => s + (q.points || 0), 0))
    : 0;
  const percentage =
    submission && totalPoints > 0
      ? Math.round((submission.score / totalPoints) * 100)
      : 0;

  if (loading || convexExam === undefined || (isStudent && convexSubmissions === undefined)) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!exam) {
    navigate("/lms/exams");
    return null;
  }

  if (!exam.isActive && !isTeacher) {
    navigate("/lms/exams");
    return null;
  }

  const isExpired = exam.isActive && new Date() > new Date(exam.dueDate);
  if ((!exam.isActive || isExpired) && !isTeacher) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
        <Clock className="h-12 w-12 text-accent-foreground" />
        <h2 className="text-xl font-bold">Exam Unavailable</h2>
        <p className="text-muted-foreground">
          This exam is currently closed or has expired.
        </p>
        <Button onClick={() => navigate("/lms/quizzes")}>Back to List</Button>
      </div>
    );
  }

  const handleStudentSubmit = async () => {
    if (!exam) return;

    // Build answer payload — map each question to its answer
    const payload: { questionId: string; answer: string }[] = [];
    let unanswered = 0;

    for (const q of exam.questions) {
      if (q.type === "MATCH_COLUMN" && q.matchPairs) {
        // For match column, include each pair's answer
        for (let i = 0; i < q.matchPairs.length; i++) {
          const matchKey = `${q._id}_${i}`;
          const ans = answers[matchKey] || "";
          if (!ans) unanswered++;
          payload.push({
            questionId: `${q.questionText} [${q.matchPairs[i].left}]`,
            answer: ans,
          });
        }
      } else {
        const hinted = hintedQuestions[q._id || q.questionText];
        const baseAns = answers[q._id] || "";
        const ans = `${baseAns}${hinted ? "\n[HINT_USED]" : ""}`;
        if (!baseAns.trim()) unanswered++;
        payload.push({
          questionId: q.questionText,
          answer: ans,
        });
      }
    }

    if (unanswered > 0) {
      toast.error(`Please answer all questions. ${unanswered} unanswered.`);
      return;
    }

    try {
      setSubmitting(true);

      const data = await submitConvexExam({
        examId: id as any,
        answers: payload,
      });

      if (arenaId) {
        await updateArenaProgress({
          arenaId: arenaId as any,
          progress: exam.questions.length,
          score: data.score,
          completed: true,
        });
      }

      const msg = exam.examType === "quiz"
        ? `Quiz submitted! Score: ${data.score}/${exam.totalPoints || exam.questions.reduce((s: number, q: any) => s + (q.points || 0), 0)} (Attempt ${data.attemptNumber})`
        : `Exam submitted! Score: ${data.score}/${exam.totalPoints || exam.questions.reduce((s: number, q: any) => s + (q.points || 0), 0)}`;

      toast.success(msg);
      navigate("/lms/exams");
    } catch (error: any) {
      toast.error(error.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const result = await toggleExam({ examId: id as any });
      toast.success(`Now ${result.isActive ? "Active" : "Inactive"}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this assessment? This cannot be undone.")) return;
    try {
      await deleteExamM({ examId: id as any });
      toast.success("Deleted");
      navigate("/lms/exams");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  return (
    <div className={cn("mx-auto p-6 space-y-6 printable-area", arenaId ? "max-w-6xl" : "max-w-3xl")}>
      {/* Printable CSS Rules Injected Natively */}
      <style>{`
        @media print {
          @page {
            margin: 1.5cm !important;
          }
          body {
            background: white !important;
            color: black !important;
            font-size: 11pt !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          nav, header, footer, button, .no-print, [role="tablist"], .sidebar, aside, .teacher-controls, .results-card, .toast-container {
            display: none !important;
          }
          .printable-area {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .printable-card {
            border: 1px solid #000 !important;
            border-radius: 0px !important;
            box-shadow: none !important;
            margin-bottom: 25px !important;
            page-break-inside: avoid !important;
          }
          .page-break-before {
            page-break-before: always !important;
          }
        }
      `}</style>

      {/* Header Section */}
      <div className="space-y-2 no-print">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{exam.title}</h1>
            <Badge variant={exam.examType === "quiz" ? "secondary" : "default"}>
              {exam.examType === "quiz" ? "Quiz" : "Exam"}
            </Badge>
          </div>
          <Badge variant={exam.isActive ? "default" : "secondary"}>
            {exam.isActive ? "Active" : "Draft"}
          </Badge>
        </div>
        <div className="flex gap-4 text-muted-foreground text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" /> {exam.duration} Minutes
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" /> Due:{" "}
            {new Date(exam.dueDate).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1">
            {exam.questions.length} questions • {exam.totalPoints || exam.questions.reduce((acc: number, cur: any) => acc + (cur.points || 0), 0)} pts
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <div className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs">
            <Languages className="h-4 w-4" />
            <Select value={language} onValueChange={(value) => setLanguage(value as any)}>
              <SelectTrigger className="h-7 w-[132px] border-0 px-2 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zu">isiZulu</SelectItem>
                <SelectItem value="af">Afrikaans</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isStudent && (
            <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Simulator
              <Switch checked={simulatorMode} onCheckedChange={setSimulatorMode} />
            </label>
          )}
          {arenaId && (
            <Badge className="bg-cyan-500/15 text-cyan-700 dark:text-cyan-200">
              <Swords className="mr-1 h-3.5 w-3.5" /> Battle mode
            </Badge>
          )}
        </div>
        {/* Quiz info */}
        {exam.examType === "quiz" && (
          <div className="flex gap-2">
            {exam.maxAttempts && (
              <Badge variant="outline" className="text-xs">
                Max {exam.maxAttempts} attempts
              </Badge>
            )}
            {exam.instantFeedback && (
              <Badge variant="outline" className="text-xs">
                Instant feedback
              </Badge>
            )}
          </div>
        )}
        {/* Topics */}
        {exam.syllabusTopics && exam.syllabusTopics.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {exam.syllabusTopics.map((t: string) => (
              <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Printable Exam Paper Header (Standard CAPS Curriculum Assessment Layout) */}
      <div className={cn(
        "border-2 border-black p-4 rounded-none space-y-4 my-6 print:block hidden",
        printIncludeHeader ? "print:block" : "print:hidden"
      )}>
        <div className="text-center font-black tracking-widest text-lg uppercase border-b-2 border-black pb-1.5">
          Vhembe Rising Star Academy Curriculum Assessment
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
          <div>SUBJECT: <span className="underline ml-1 font-semibold">{exam.subject?.name}</span></div>
          <div>CLASS / GRADE: <span className="underline ml-1 font-semibold">{exam.class?.name}</span></div>
          <div>TEACHER: <span className="underline ml-1 font-semibold">{exam.teacher?.name}</span></div>
          <div>DURATION: <span className="underline ml-1 font-semibold">{exam.duration} Minutes</span></div>
        </div>
        <div className="border-t border-black pt-3 grid grid-cols-2 gap-y-3 gap-x-6 text-[10px] font-extrabold uppercase">
          <div className="flex items-center gap-1">STUDENT NAME: <span className="flex-1 border-b border-black h-4 min-w-32 inline-block"></span></div>
          <div className="flex items-center gap-1">DATE: <span className="flex-1 border-b border-black h-4 min-w-32 inline-block"></span></div>
          <div className="flex items-center gap-1">MARKS OBTAINED: <span className="border border-black px-3 py-0.5 ml-1 text-xs"> / {exam.questions.reduce((acc: number, cur: any) => acc + (cur.points || 0), 0)}</span></div>
          <div className="flex items-center gap-1">SIGNATURE: <span className="flex-1 border-b border-black h-4 min-w-32 inline-block"></span></div>
        </div>
      </div>

      {/* Teacher Control: Toggle Status */}
      {isTeacher && (
        <div className="no-print">
          <Separator />
          <div className="bg-card p-4 rounded-lg flex items-center justify-between border teacher-controls">
            <div className="text-lg font-semibold">Teacher Controls</div>
            <div className="flex gap-2 ml-2">
              <Button onClick={() => navigate("/lms/exams")}>
                Back to List
              </Button>
              <Button
                variant={exam.isActive ? "destructive" : "default"}
                onClick={handleToggleStatus}
              >
                {exam.isActive ? "Unpublish Exam" : "Publish Exam"}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
          <Separator />
        </div>
      )}

      {/* Student Results Section */}
      {isStudent && submission && (
        <div className="no-print results-card">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <Award className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="text-center">
                <h1 className="text-3xl font-bold">
                  {exam.examType === "quiz" ? "Quiz Results" : "Exam Results"}
                </h1>
                <p className="text-muted-foreground">You scored</p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-primary">
                  {submission.score}
                </span>
                <span className="text-2xl text-muted-foreground">
                  / {totalPoints}
                </span>
              </div>
              <Badge
                variant={percentage >= 50 ? "default" : "destructive"}
                className="text-lg px-4 py-1"
              >
                {percentage}%
              </Badge>
              {exam.examType === "quiz" && submission.attemptNumber && (
                <Badge variant="outline" className="text-xs">
                  Attempt {submission.attemptNumber}
                  {exam.maxAttempts ? ` of ${exam.maxAttempts}` : ""}
                </Badge>
              )}
            </CardContent>
          </Card>
          <div className="flex items-center gap-2 mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/lms/exams")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to List
            </Button>
            <h2 className="text-xl font-semibold ml-auto">Review Answers</h2>
          </div>
        </div>
      )}

      {/* Print / PDF Customizer Panel */}
      <Card className="no-print border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-hidden">
        <CardHeader className="py-3 bg-zinc-100/50 dark:bg-zinc-900/60 flex flex-row items-center gap-2 border-b">
          <Printer className="w-4 h-4 text-violet-600" />
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">🖨️ PDF & Exam Paper Print Center</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Generate and print a pristine, curriculum-standard physical exam paper or save it directly as a vector PDF. Customize dotted handwriting columns and grading memorandum sheets.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded bg-background border hover:bg-muted/30 transition-colors select-none">
              <input 
                type="checkbox" 
                checked={printIncludeHeader} 
                onChange={(e) => setPrintIncludeHeader(e.target.checked)}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500 h-4 w-4"
              />
              <div className="text-xs">
                <span className="font-semibold block">Exam Info Header</span>
                <span className="text-[10px] text-muted-foreground">Name, marks, signature fields</span>
              </div>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded bg-background border hover:bg-muted/30 transition-colors select-none">
              <input 
                type="checkbox" 
                checked={printIncludeLines} 
                onChange={(e) => setPrintIncludeLines(e.target.checked)}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500 h-4 w-4"
              />
              <div className="text-xs">
                <span className="font-semibold block">Handwriting Lines</span>
                <span className="text-[10px] text-muted-foreground">Injects dotted lines for open answers</span>
              </div>
            </label>
            
            {isTeacher && (
              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded bg-background border hover:bg-muted/30 transition-colors select-none">
                <input 
                  type="checkbox" 
                  checked={printIncludeMemo} 
                  onChange={(e) => setPrintIncludeMemo(e.target.checked)}
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500 h-4 w-4"
                />
                <div className="text-xs">
                  <span className="font-semibold block text-green-700 dark:text-green-400">Append Answer Key</span>
                  <span className="text-[10px] text-muted-foreground">Includes grading memorandum key</span>
                </div>
              </label>
            )}
          </div>
          
          <Button 
            onClick={() => window.print()} 
            className="w-full bg-violet-600 text-white hover:bg-violet-700 font-bold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" /> Open Print & PDF Generator
          </Button>
        </CardContent>
      </Card>

      <div className={cn("grid gap-6", arenaId ? "lg:grid-cols-[1fr_280px]" : "grid-cols-1")}>
      {/* questions list */}
      <div className="space-y-6">
        {exam.questions.map((q: any, index: number) => (
          <Card key={q._id || index} className="printable-card">
            <CardHeader className="pb-3 print:pb-2">
              <CardTitle className="text-lg font-medium flex gap-2 items-start print:text-sm print:font-bold">
                <span className="text-muted-foreground print:text-black">{index + 1}.</span>
                <span className="flex-1">{getQuestionText(q)}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {q.cognitiveLevel && (
                    <span className="text-[10px] font-normal text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded dark:bg-cyan-950 dark:text-cyan-200">
                      {q.cognitiveLevel.replace("_", " ")}
                    </span>
                  )}
                  {q.topic && (
                    <span className="text-[10px] font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {q.topic}
                    </span>
                  )}
                  <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-1 rounded print:bg-transparent print:text-black print:font-extrabold print:border print:border-black">
                    {q.points} pts
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="print:pt-1">
              {isStudent && !submission && (
                <div className="no-print mb-3 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => requestHint(q)}>
                    <Lightbulb className="mr-2 h-4 w-4" /> Hint
                  </Button>
                </div>
              )}
              {/* ─── MCQ ─────────────────────────── */}
              {q.type === "MCQ" && (
                <div>
                  {isTeacher ? (
                    <ul className="space-y-2 print:space-y-1">
                      {getOptions(q)?.map((opt: string, i: number) => (
                        <li key={i} className={`p-3 rounded-md border flex items-center gap-2 print:text-xs print:p-1.5 ${opt === q.correctAnswer ? "bg-primary font-medium print:bg-zinc-200 print:border-black print:font-bold" : "bg-black/20 dark:bg-black/70 print:bg-transparent"}`}>
                          {opt === q.correctAnswer && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
                          <span className="text-sm print:text-xs">{opt}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="no-print">
                      <ExamRadio answers={answers} question={{ ...q, options: getOptions(q) || q.options }} setAnswers={setAnswers} submission={submission as any} />
                    </div>
                  )}
                  {!isTeacher && !submission && (
                    <ul className="hidden print:block space-y-1.5 mt-2">
                      {getOptions(q)?.map((opt: string, i: number) => (
                        <li key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-3.5 h-3.5 rounded-full border border-black inline-block shrink-0" />
                          <span>{opt}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* ─── TRUE / FALSE ────────────────── */}
              {q.type === "TRUE_FALSE" && (
                <div>
                  {isTeacher ? (
                    <div className="flex gap-3">
                      {["True", "False"].map((opt) => (
                        <div key={opt} className={`p-3 rounded-md border flex items-center gap-2 ${opt === q.correctAnswer ? "bg-green-50 border-green-500 dark:bg-green-900/20 font-medium" : "bg-black/20 dark:bg-black/70"}`}>
                          {opt === q.correctAnswer && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                          <span className="text-sm">{opt}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-print space-y-2">
                      {["True", "False"].map((opt) => (
                        <button
                          key={opt}
                          disabled={!!submission}
                          onClick={() => { if (!submission) setAnswers(prev => ({ ...prev, [q._id]: opt })); }}
                          className={`w-full text-left p-3 rounded-md border flex items-center gap-2 transition-all ${
                            submission
                              ? opt === q.correctAnswer
                                ? "bg-green-50 border-green-500 dark:bg-green-900/20"
                                : submission?.answers.find(a => a.questionId === q._id)?.answer === opt
                                  ? "bg-red-50 border-red-500 dark:bg-red-900/20"
                                  : "opacity-50"
                              : answers[q._id] === opt
                                ? "border-primary bg-primary/5"
                                : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full border-2 border-current shrink-0 flex items-center justify-center">
                            {(answers[q._id] === opt || (submission && submission.answers.find(a => a.questionId === q._id)?.answer === opt)) && (
                              <span className="w-2 h-2 rounded-full bg-current" />
                            )}
                          </span>
                          <span className="text-sm">{opt}</span>
                          {submission && opt === q.correctAnswer && <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />}
                          {submission && opt !== q.correctAnswer && submission?.answers.find(a => a.questionId === q._id)?.answer === opt && (
                            <span className="ml-auto text-xs text-red-500 font-medium">Your answer</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── FILL IN THE BLANK ───────────── */}
              {q.type === "FILL_BLANK" && (
                <div>
                  {isTeacher ? (
                    <div className="p-4 bg-muted/50 dark:bg-[#1c1c1c] border rounded-lg">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Correct Answer:</span>
                      <p className="text-sm font-medium">{q.correctAnswer}</p>
                    </div>
                  ) : (
                    <div className="no-print">
                      <Input
                        placeholder="Type your answer..."
                        className="text-sm"
                        value={submission ? (submission.answers.find(a => a.questionId === q._id)?.answer || "") : (answers[q._id] || "")}
                        onChange={(e) => { if (!submission) setAnswers(prev => ({ ...prev, [q._id]: e.target.value })); }}
                        disabled={!!submission}
                      />
                      {submission && (
                        <div className={`mt-2 p-3 rounded-md text-sm ${submission.answers.find(a => a.questionId === q._id)?.answer?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase() ? "bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800" : "bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"}`}>
                          <span className="font-medium">Correct answer: </span>{q.correctAnswer}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── CALCULATION ─────────────────── */}
              {q.type === "CALCULATION" && (
                <div>
                  {isTeacher ? (
                    <div className="p-4 bg-muted/50 dark:bg-[#1c1c1c] border rounded-lg">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Expected Result:</span>
                      <p className="text-sm font-medium font-mono">{q.correctAnswer}</p>
                    </div>
                  ) : (
                    <div className="no-print space-y-2">
                      <Textarea
                        placeholder="Show your working step by step, then state the final answer."
                        className="min-h-[140px] text-sm font-mono"
                        value={submission ? (submission.answers.find(a => a.questionId === q._id)?.answer || "") : (answers[q._id] || "")}
                        onChange={(e) => { if (!submission) setAnswers(prev => ({ ...prev, [q._id]: e.target.value })); }}
                        disabled={!!submission}
                      />
                      {q.calculationSteps?.length > 0 && !submission && (
                        <div className="rounded-md border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-muted-foreground">
                          CAPS mark scheme will award partial credit for visible method steps.
                        </div>
                      )}
                      {submission && (
                        <div className={`mt-2 p-3 rounded-md text-sm ${submission.answers.find(a => a.questionId === q._id)?.answer?.trim() === q.correctAnswer.trim() ? "bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800" : "bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"}`}>
                          <span className="font-medium">Correct answer: </span>
                          <span className="font-mono">{q.correctAnswer}</span>
                        </div>
                      )}
                      {printIncludeLines && (
                        <div className="hidden print:block space-y-4 pt-4">
                          <div className="border-b border-dashed border-gray-400 h-6" />
                          <div className="border-b border-dashed border-gray-400 h-6" />
                          <div className="border-b border-dashed border-gray-400 h-6" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── MATCH COLUMN ────────────────── */}
              {q.type === "MATCH_COLUMN" && q.matchPairs && (
                <div>
                  {isTeacher ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Column A</span>
                        <ul className="space-y-1">
                          {q.matchPairs.map((p: any, i: number) => (
                            <li key={i} className="p-2 bg-muted/50 rounded text-sm">{p.left}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Column B</span>
                        <ul className="space-y-1">
                          {q.matchPairs.map((p: any, i: number) => (
                            <li key={i} className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm border border-green-200 dark:border-green-800">
                              {p.right}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="no-print space-y-3">
                      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                        {q.matchPairs.map((p: any, i: number) => {
                          const matchKey = `${q._id}_${i}`;
                          return (
                            <div key={i} className="contents">
                              <div className="p-2 bg-muted/50 rounded text-sm">{p.left}</div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                              <Select
                                value={answers[matchKey] || ""}
                                onValueChange={(val) => { if (!submission) setAnswers(prev => ({ ...prev, [matchKey]: val })); }}
                                disabled={!!submission}
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue placeholder="Match..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {q.matchPairs.map((mp: any, j: number) => (
                                    <SelectItem key={j} value={mp.right}>{mp.right}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── DIAGRAM LABEL ───────────────── */}
              {q.type === "DIAGRAM_LABEL" && (
                <div>
                  {q.diagramUrl && (
                    <div className="mb-4">
                      <img src={q.diagramUrl} alt="Diagram" className="max-w-full rounded border" />
                    </div>
                  )}
                  {isTeacher ? (
                    <div className="p-4 bg-muted/50 dark:bg-[#1c1c1c] border rounded-lg">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Labeling Guide:</span>
                      <p className="text-sm">{q.correctAnswer}</p>
                    </div>
                  ) : (
                    <div className="no-print space-y-3">
                      {q.diagramHotspots?.length > 0 && (
                        <div className="relative min-h-[260px] overflow-hidden rounded-md border bg-zinc-950">
                          {q.diagramUrl ? (
                            <img src={q.diagramUrl} alt="Diagram hotspots" className="h-full min-h-[260px] w-full object-contain" />
                          ) : (
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.24),transparent_32%),linear-gradient(135deg,rgba(15,23,42,1),rgba(39,39,42,1))]" />
                          )}
                          {q.diagramHotspots.map((spot: any, spotIndex: number) => (
                            <div
                              key={`${spot.label}-${spotIndex}`}
                              className="absolute -translate-x-1/2 -translate-y-1/2"
                              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                            >
                              <div className="grid h-7 w-7 place-items-center rounded-full border border-cyan-200 bg-cyan-400 text-xs font-bold text-zinc-950 shadow-lg shadow-cyan-950/40">
                                {spotIndex + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <Textarea
                        placeholder="Enter each hotspot label, for example: 1. Nucleus"
                        className="min-h-[100px] text-sm"
                        value={submission ? (submission.answers.find(a => a.questionId === q._id)?.answer || "") : (answers[q._id] || "")}
                        onChange={(e) => { if (!submission) setAnswers(prev => ({ ...prev, [q._id]: e.target.value })); }}
                        disabled={!!submission}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ─── SHORT ANSWER / ESSAY ────────── */}
              {(q.type === "SHORT_ANSWER" || q.type === "ESSAY") && (
                <div className="space-y-3 print:space-y-0">
                  {isTeacher ? (
                    <div className="p-4 bg-muted/50 dark:bg-[#1c1c1c] border rounded-lg space-y-1.5 print:bg-transparent print:border-black">
                      <span className="text-xs font-bold text-muted-foreground print:text-black uppercase tracking-wider block">
                        📝 Model Solution / Grading Guidelines:
                      </span>
                      <p className="text-sm leading-relaxed text-foreground/95 italic print:text-black print:not-italic">
                        {q.correctAnswer}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 no-print">
                      {!submission && (
                        <div className="flex justify-end">
                          <Button variant="outline" size="sm" onClick={() => startDictation(q)}>
                            <Mic className="mr-2 h-4 w-4" /> Dictate
                          </Button>
                        </div>
                      )}
                      <Textarea
                        placeholder={q.type === "ESSAY" ? "Write your essay response here..." : "Type your answer..."}
                        className={`bg-background/50 border-muted focus:border-primary transition-all resize-y text-sm leading-relaxed ${q.type === "ESSAY" ? "min-h-[200px]" : "min-h-[100px]"}`}
                        value={submission ? (submission.answers.find(a => a.questionId === q._id)?.answer || "") : (answers[q._id] || "")}
                        onChange={(e) => { if (!submission) setAnswers(prev => ({ ...prev, [q._id]: e.target.value })); }}
                        disabled={!!submission}
                      />
                      {submission && (
                        <div className="mt-3 p-4 bg-violet-600/10 dark:bg-violet-600/5 border border-violet-600/20 rounded-lg space-y-1.5">
                          <div className="text-xs font-bold text-violet-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> Model Answer:
                          </div>
                          <p className="text-sm leading-relaxed text-foreground/90 italic">{q.correctAnswer}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {printIncludeLines && (
                    <div className="hidden print:block space-y-4 pt-4">
                      {q.type === "ESSAY" ? (
                        <>
                          <div className="border-b border-dashed border-gray-400 h-6" />
                          <div className="border-b border-dashed border-gray-400 h-6" />
                          <div className="border-b border-dashed border-gray-400 h-6" />
                          <div className="border-b border-dashed border-gray-400 h-6" />
                          <div className="border-b border-dashed border-gray-400 h-6" />
                          <div className="border-b border-dashed border-gray-400 h-6" />
                          <div className="border-b border-dashed border-gray-400 h-6" />
                          <div className="border-b border-dashed border-gray-400 h-6" />
                        </>
                      ) : (
                        <>
                          <div className="border-b border-dashed border-gray-400 h-6" />
                          <div className="border-b border-dashed border-gray-400 h-6" />
                          <div className="border-b border-dashed border-gray-400 h-6" />
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {arenaId && (
        <aside className="no-print space-y-4">
          <Card className="sticky top-4 border-cyan-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-cyan-500" /> Battle Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(arena?.participants || []).map((participant: any) => (
                <div key={participant.studentId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{participant.name}</span>
                    <span className="text-muted-foreground">
                      {participant.progress}/{exam.questions.length}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-cyan-500"
                      style={{ width: `${(participant.progress / Math.max(exam.questions.length, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              <CognitiveRadar questions={exam.questions} className="pt-2 text-muted-foreground" />
            </CardContent>
          </Card>
        </aside>
      )}
      </div>

      {/* Printable Memo Section */}
      {printIncludeMemo && isTeacher && (
        <div className="hidden print:block page-break-before space-y-6 pt-8 border-t-2 border-double border-black">
          <div className="text-center font-black tracking-widest text-lg uppercase border-b-2 border-black pb-1.5">
            MEMORANDUM / ANSWER KEY (CONFIDENTIAL)
          </div>
          <div className="space-y-4">
            {exam.questions.map((q: any, index: number) => (
              <div key={q._id || index} className="border border-black p-4 rounded-none space-y-2 page-break-inside-avoid">
                <div className="font-bold flex justify-between text-xs">
                  <span>Question {index + 1}: {q.questionText}</span>
                  <span>[{q.points} Marks]</span>
                </div>
                <div className="text-xs bg-zinc-100 p-2 rounded-none border border-black font-semibold">
                  {q.type === "MCQ" ? (
                    <span>Correct Answer Option: <strong className="text-black font-extrabold">{q.correctAnswer}</strong></span>
                  ) : (
                    <div>
                      <span className="text-[10px] uppercase font-extrabold block mb-0.5">Model Answer Guide:</span>
                      <p className="font-normal italic text-zinc-950">{q.correctAnswer}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex justify-end gap-4 pt-4 no-print">
        {isStudent && !submission && (
          <Button
            size="lg"
            className="w-full md:w-auto min-w-50"
            onClick={handleStudentSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Submit Exam"
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default Exam;
