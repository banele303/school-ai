import { useState, useRef } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/AuthProvider";
import { Sparkles, Upload, Camera, CheckCircle, XCircle, Clock, History, Send, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

declare const process: { env: Record<string, string | undefined }>;

export default function HomeworkCheckerPage() {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [studentAnswer, setStudentAnswer] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subjects = useQuery(api.subjects.getSubjects);
  const homeworks = useQuery(api.homework.getMyHomework, user?.role === "student" ? {} : "skip");
  const allHomeworks = useQuery(api.homework.getAllHomework, user?.role !== "student" ? {} : "skip");

  const submitHomework = useAction(api.homework.submitHomework);
  const reviewHomework = useMutation(api.homework.reviewHomework);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setImagePreview(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!question.trim()) { toast.error("Please enter your question"); return; }
    try {
      // Convert image to base64 for storage (in production, upload to R2 first)
      let imageUrl = undefined;
      if (imagePreview) {
        imageUrl = imagePreview; // Simplified - in prod, upload to R2 first
      }
      await submitHomework({ subjectId, question, studentAnswer, imageUrl });
      toast.success("Homework submitted for AI review!");
      setQuestion(""); setStudentAnswer(""); setImagePreview(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    }
  };

  const handleTeacherReview = async (hwId: any, review: string) => {
    try {
      await reviewHomework({ homeworkId: hwId, teacherReview: review });
      toast.success("Review saved!");
    } catch (e: any) { toast.error(e.message); }
  };

  const mySubmissions = user?.role === "student" ? homeworks : allHomeworks;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          AI Homework Checker
        </h1>
        <p className="text-muted-foreground mt-1">
          Submit your homework and get instant AI-powered feedback
        </p>
      </div>

      <Tabs defaultValue="submit">
        <TabsList>
          <TabsTrigger value="submit" className="gap-2"><Send className="h-4 w-4" /> Submit</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> My Submissions</TabsTrigger>
        </TabsList>

        {/* Submit Tab */}
        <TabsContent value="submit" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Submission Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-amber-500" /> Submit Homework</CardTitle>
                <CardDescription>Type your question, upload a photo, or both</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Subject</Label>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger><SelectValue placeholder="Select subject..." /></SelectTrigger>
                    <SelectContent>
                      {subjects?.map((s: any) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Question / Problem *</Label>
                  <Textarea
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="Type the homework question here..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Your Answer (optional)</Label>
                  <Textarea
                    value={studentAnswer}
                    onChange={e => setStudentAnswer(e.target.value)}
                    placeholder="Write your attempt at solving it..."
                    rows={3}
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <Label>Upload Photo (optional)</Label>
                  <div className="mt-1">
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} alt="Homework" className="w-full max-h-64 object-contain rounded-lg border" />
                        <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => setImagePreview(null)}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 flex flex-col items-center gap-2 hover:border-amber-500 transition-colors"
                      >
                        <Camera className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Click to upload a photo of your homework</span>
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </div>
                </div>

                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={handleSubmit} disabled={!question.trim()}>
                  <Sparkles className="h-4 w-4 mr-2" /> Submit for AI Review
                </Button>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <div className="space-y-4">
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-900">
                <CardHeader>
                  <CardTitle className="text-base">How It Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
                    <p>Type your homework question or upload a photo</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
                    <p>Optionally write your answer attempt</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0">3</div>
                    <p>Our AI grades it and gives detailed feedback</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0">4</div>
                    <p>Your teacher can also review it</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Tips for Best Results</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>• Write the full question, not just "question 5"</p>
                  <p>• Include your working/attempt</p>
                  <p>• Good lighting for photo uploads</p>
                  <p>• Be specific about what you need help with</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          {!mySubmissions || mySubmissions.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">No submissions yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Submit your first homework to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mySubmissions.map((hw: any) => (
                <Card key={hw._id} className={cn(
                  "border-l-4",
                  hw.status === "graded" ? "border-l-green-500" : "border-l-amber-500"
                )}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge className={hw.status === "graded" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                        {hw.status === "graded" ? <><CheckCircle className="h-3 w-3 mr-1" /> Graded</> : <><Clock className="h-3 w-3 mr-1" /> Pending</>}
                      </Badge>
                      {hw.aiScore !== undefined && (
                        <Badge variant="outline" className="text-sm font-bold">{hw.aiScore}/100</Badge>
                      )}
                    </div>
                    <CardTitle className="text-sm mt-2">{hw.question}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {hw.studentAnswer && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Your Answer:</p>
                        <p className="text-sm">{hw.studentAnswer}</p>
                      </div>
                    )}
                    {hw.imageUrl && (
                      <img src={hw.imageUrl} alt="Homework" className="max-h-48 rounded-lg border" />
                    )}
                    {hw.aiFeedback && (
                      <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                        <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">AI Feedback:</p>
                        <p className="text-sm">{hw.aiFeedback}</p>
                      </div>
                    )}
                    {hw.aiCorrectAnswer && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">AI Suggested Answer:</p>
                        <p className="text-sm">{hw.aiCorrectAnswer}</p>
                      </div>
                    )}
                    {hw.teacherReview && (
                      <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg">
                        <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">Teacher Review:</p>
                        <p className="text-sm">{hw.teacherReview}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
