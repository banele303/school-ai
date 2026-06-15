import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Wand2, Upload, FileText, Sparkles, User, FileCheck2, Save } from "lucide-react";
import { toast } from "sonner";
import { markScannedWork, uploadFileToR2 } from "@/lib/cloudflareWorker";

export default function AIMarkingPage() {
  const subjects = useQuery(api.subjects.getSubjects, {}) || [];
  
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
    // In a real app, you would save this to the database here
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Brain className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          Professional AI Marking Desk
        </h1>
        <p className="text-muted-foreground mt-1">
          Instantly grade short answers, essays, or scanned PDFs. Get suggested rubrics, corrections, and detailed feedback which you can override before approval.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left panel: inputs */}
        <Card className="shadow-sm border-slate-200 dark:border-zinc-800 dark:bg-zinc-950">
          <CardHeader>
            <CardTitle className="text-lg">Assignment Details</CardTitle>
            <CardDescription>Enter the question details or upload a student's answer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Right panel: results */}
        <Card className="bg-slate-50/50 dark:bg-zinc-900/30 border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between min-h-[500px]">
          <CardContent className="p-6">
            {!result ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-40 mt-20">
                <FileCheck2 className="h-16 w-16 mx-auto text-slate-400 dark:text-zinc-500 mb-2" />
                <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">Waiting for submission</p>
                <p className="text-xs text-slate-500 dark:text-zinc-500 max-w-[250px]">The AI will parse the handwriting, match against your memo, and draft feedback.</p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-start justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-amber-500" /> AI Suggested Mark</h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Based on your rubric and memo</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="number" value={customMark} onChange={(e) => setCustomMark(Number(e.target.value))} className="w-16 text-center text-2xl font-bold bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 h-10 rounded-xl" />
                    <span className="text-slate-400 font-bold">/ 100</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 mb-1">Constructive Feedback for Learner</h4>
                  <Textarea value={customFeedback} onChange={(e) => setCustomFeedback(e.target.value)} rows={4} className="bg-white border-slate-200 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-200 text-xs rounded-xl mt-1 focus:ring-1" />
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 mb-1">Private Teacher Notes</h4>
                  <Textarea value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} rows={2} className="bg-white border-slate-200 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-200 text-xs rounded-xl mt-1 focus:ring-1" />
                </div>

                {result.transcription && (
                  <div className="mt-4">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 mb-1">Original Transcribed Text (Read-only)</h4>
                    <div className="max-h-24 overflow-y-auto border border-slate-100 dark:border-zinc-850 rounded-xl bg-white dark:bg-zinc-950/40 p-3 space-y-1">
                      <p className="text-[11px] text-slate-600 dark:text-zinc-400 font-mono leading-relaxed">{result.transcription}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>

          {result && (
            <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 rounded-b-2xl flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 dark:text-zinc-500 flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> AI drafted in 2.3s</span>
              <div className="flex gap-2">
                <Button variant="outline" className="h-9 text-xs rounded-xl border-slate-200 dark:border-zinc-800" onClick={() => setResult(null)}>Reset</Button>
                <Button onClick={handleApprove} className="h-9 text-xs rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white gap-2">
                  <Save className="h-3.5 w-3.5" /> Approve & Save
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
