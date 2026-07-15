import { useMemo, useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { useNavigate } from "react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Sparkles, Loader2, BookOpen, Zap, GraduationCap, ChevronDown, ChevronUp, Plus, Minus, LayoutTemplate } from "lucide-react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ─── QUESTION TYPE CONFIG BY CATEGORY ────────────────────────────
const QUESTION_TYPE_CONFIG: Record<
  string,
  { value: string; label: string; icon: string; description: string }[]
> = {
  maths: [
    { value: "MCQ", label: "Multiple Choice", icon: "🔘", description: "4 options, auto-graded" },
    { value: "TRUE_FALSE", label: "True / False", icon: "✅", description: "Quick knowledge check" },
    { value: "FILL_BLANK", label: "Fill in the Blank", icon: "✏️", description: "Missing word/phrase" },
    { value: "CALCULATION", label: "Calculation", icon: "🔢", description: "Math problem with working" },
    { value: "MATCH_COLUMN", label: "Match Columns", icon: "🔗", description: "Match A to B" },
  ],
  science: [
    { value: "MCQ", label: "Multiple Choice", icon: "🔘", description: "4 options, auto-graded" },
    { value: "TRUE_FALSE", label: "True / False", icon: "✅", description: "Quick knowledge check" },
    { value: "FILL_BLANK", label: "Fill in the Blank", icon: "✏️", description: "Missing term" },
    { value: "CALCULATION", label: "Calculation", icon: "🔢", description: "Formula/equation solving" },
    { value: "DIAGRAM_LABEL", label: "Diagram Labelling", icon: "🖼️", description: "Label parts of diagram" },
    { value: "MATCH_COLUMN", label: "Match Columns", icon: "🔗", description: "Match terms to definitions" },
    { value: "SHORT_ANSWER", label: "Short Answer", icon: "📝", description: "Brief written response" },
  ],
  language: [
    { value: "MCQ", label: "Multiple Choice", icon: "🔘", description: "Comprehension, grammar" },
    { value: "FILL_BLANK", label: "Fill in the Blank", icon: "✏️", description: "Missing word" },
    { value: "SHORT_ANSWER", label: "Short Answer", icon: "📝", description: "Brief written response" },
    { value: "ESSAY", label: "Essay", icon: "📄", description: "Long-form writing" },
    { value: "MATCH_COLUMN", label: "Match Columns", icon: "🔗", description: "Match words to meanings" },
  ],
  humanities: [
    { value: "MCQ", label: "Multiple Choice", icon: "🔘", description: "Factual recall" },
    { value: "SHORT_ANSWER", label: "Short Answer", icon: "📝", description: "Brief explanation" },
    { value: "ESSAY", label: "Essay", icon: "📄", description: "Extended writing" },
    { value: "MATCH_COLUMN", label: "Match Columns", icon: "🔗", description: "Match events to dates" },
    { value: "FILL_BLANK", label: "Fill in the Blank", icon: "✏️", description: "Missing term" },
  ],
  life_skills: [
    { value: "MCQ", label: "Multiple Choice", icon: "🔘", description: "Scenario-based" },
    { value: "TRUE_FALSE", label: "True / False", icon: "✅", description: "Quick check" },
    { value: "SHORT_ANSWER", label: "Short Answer", icon: "📝", description: "Brief response" },
    { value: "ESSAY", label: "Essay", icon: "📄", description: "Reflection writing" },
  ],
  arts: [
    { value: "MCQ", label: "Multiple Choice", icon: "🔘", description: "Theory questions" },
    { value: "TRUE_FALSE", label: "True / False", icon: "✅", description: "Quick check" },
    { value: "SHORT_ANSWER", label: "Short Answer", icon: "📝", description: "Brief response" },
    { value: "ESSAY", label: "Essay", icon: "📄", description: "Critical analysis" },
  ],
  technology: [
    { value: "MCQ", label: "Multiple Choice", icon: "🔘", description: "Theory questions" },
    { value: "TRUE_FALSE", label: "True / False", icon: "✅", description: "Quick check" },
    { value: "FILL_BLANK", label: "Fill in the Blank", icon: "✏️", description: "Missing term/code" },
    { value: "SHORT_ANSWER", label: "Short Answer", icon: "📝", description: "Brief explanation" },
    { value: "MATCH_COLUMN", label: "Match Columns", icon: "🔗", description: "Match terms" },
  ],
  other: [
    { value: "MCQ", label: "Multiple Choice", icon: "🔘", description: "4 options, auto-graded" },
    { value: "TRUE_FALSE", label: "True / False", icon: "✅", description: "Quick knowledge check" },
    { value: "FILL_BLANK", label: "Fill in the Blank", icon: "✏️", description: "Missing word/phrase" },
    { value: "SHORT_ANSWER", label: "Short Answer", icon: "📝", description: "Brief written response" },
    { value: "ESSAY", label: "Essay", icon: "📄", description: "Long-form writing" },
    { value: "MATCH_COLUMN", label: "Match Columns", icon: "🔗", description: "Match A to B" },
    { value: "CALCULATION", label: "Calculation", icon: "🔢", description: "Problem solving" },
    { value: "DIAGRAM_LABEL", label: "Diagram Labelling", icon: "🖼️", description: "Label parts" },
  ],
};

// ─── EXAM TEMPLATES ──────────────────────────────────────────────
const EXAM_TEMPLATES = [
  {
    id: "quick_quiz",
    name: "Quick Quiz",
    description: "5 MCQ — fast knowledge check",
    icon: "⚡",
    examType: "quiz" as const,
    duration: 10,
    questionMix: [{ type: "MCQ", count: 5, points: 1 }],
    difficulty: "Medium",
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "true_false_quiz",
    name: "True/False Quiz",
    description: "10 True or False questions",
    icon: "✅",
    examType: "quiz" as const,
    duration: 5,
    questionMix: [{ type: "TRUE_FALSE", count: 10, points: 1 }],
    difficulty: "Easy",
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "topic_test",
    name: "Topic Test",
    description: "10 questions — MCQ + short answer",
    icon: "📝",
    examType: "exam" as const,
    duration: 30,
    questionMix: [
      { type: "MCQ", count: 6, points: 1 },
      { type: "SHORT_ANSWER", count: 4, points: 3 },
    ],
    difficulty: "Medium",
    color: "from-blue-500 to-indigo-500",
  },
  {
    id: "maths_test",
    name: "Mathematics Test",
    description: "Calculations, MCQs and problem solving",
    icon: "🔢",
    examType: "exam" as const,
    duration: 45,
    questionMix: [
      { type: "MCQ", count: 5, points: 1 },
      { type: "CALCULATION", count: 5, points: 3 },
      { type: "FILL_BLANK", count: 3, points: 2 },
      { type: "MATCH_COLUMN", count: 2, points: 2 },
    ],
    difficulty: "Medium",
    color: "from-purple-500 to-violet-500",
  },
  {
    id: "science_assessment",
    name: "Science Assessment",
    description: "MCQ, diagrams, calculations and theory",
    icon: "🔬",
    examType: "exam" as const,
    duration: 60,
    questionMix: [
      { type: "MCQ", count: 6, points: 1 },
      { type: "TRUE_FALSE", count: 4, points: 1 },
      { type: "CALCULATION", count: 3, points: 3 },
      { type: "DIAGRAM_LABEL", count: 2, points: 3 },
      { type: "SHORT_ANSWER", count: 3, points: 4 },
    ],
    difficulty: "Medium",
    color: "from-cyan-500 to-teal-500",
  },
  {
    id: "comprehension_test",
    name: "Comprehension Test",
    description: "Passage-based MCQ and written responses",
    icon: "📖",
    examType: "exam" as const,
    duration: 45,
    questionMix: [
      { type: "MCQ", count: 6, points: 1 },
      { type: "SHORT_ANSWER", count: 4, points: 3 },
      { type: "ESSAY", count: 2, points: 5 },
    ],
    difficulty: "Medium",
    color: "from-rose-500 to-pink-500",
  },
  {
    id: "multi_topic_exam",
    name: "Multi-Topic Exam",
    description: "20 questions across multiple topics",
    icon: "📚",
    examType: "exam" as const,
    duration: 60,
    questionMix: [
      { type: "MCQ", count: 10, points: 1 },
      { type: "SHORT_ANSWER", count: 6, points: 3 },
      { type: "ESSAY", count: 4, points: 5 },
    ],
    difficulty: "Medium",
    color: "from-indigo-500 to-blue-500",
  },
  {
    id: "final_exam",
    name: "Final Examination",
    description: "Full formal exam — all question types",
    icon: "🎓",
    examType: "exam" as const,
    duration: 120,
    questionMix: [
      { type: "MCQ", count: 15, points: 1 },
      { type: "TRUE_FALSE", count: 5, points: 1 },
      { type: "FILL_BLANK", count: 5, points: 2 },
      { type: "SHORT_ANSWER", count: 8, points: 3 },
      { type: "ESSAY", count: 5, points: 5 },
      { type: "MATCH_COLUMN", count: 2, points: 2 },
    ],
    difficulty: "Hard",
    color: "from-slate-600 to-slate-800",
  },
];

// ─── FORM SCHEMA ─────────────────────────────────────────────────
const schema = z.object({
  subject: z.string().min(1, "Subject is required"),
  class: z.string().min(1, "Class is required"),
  examType: z.enum(["quiz", "exam"]),
  topics: z.array(z.string()).optional(),
  duration: z.coerce.number().min(5, "Duration must be at least 5 minutes"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  questionMix: z.array(
    z.object({
      type: z.string(),
      count: z.number().min(0),
      points: z.number().min(1),
    })
  ),
  title: z.string().min(3, "Title is required"),
  maxAttempts: z.coerce.number().min(1).max(10).optional(),
  instantFeedback: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ExamGenerator = ({ open, onOpenChange, onSuccess }: Props) => {
  const navigate = useNavigate();
  const convexSubjects = useQuery(api.subjects.getSubjects);
  const convexClasses = useQuery(api.classes.getClasses, { academicYear: undefined });
  const generateExamAction = useAction(api.exams.generateExam);
  const createExamMutation = useMutation(api.exams.createExam);

  const subjects = convexSubjects || [];
  const classes = convexClasses || [];
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"template" | "configure">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isScratch, setIsScratch] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      examType: "exam",
      topics: [],
      duration: 60,
      difficulty: "Medium",
      questionMix: [
        { type: "MCQ", count: 5, points: 1 },
      ],
      title: "",
      maxAttempts: 3,
      instantFeedback: true,
    },
  });

  const selectedSubjectId = form.watch("subject");
  const selectedExamType = form.watch("examType");
  const questionMix = form.watch("questionMix");
  const selectedTopics = form.watch("topics");
  const selectedClassId = form.watch("class");

  // Get subject category for question type recommendations
  const selectedSubject = subjects.find((s: any) => s._id === selectedSubjectId);
  const subjectCategory = (selectedSubject?.category || "other").toLowerCase();
  const availableQuestionTypes = QUESTION_TYPE_CONFIG[subjectCategory] || QUESTION_TYPE_CONFIG["other"];

  // Parse grade from class name (e.g. "Grade 10A" -> 10)
  const selectedClass = classes.find((c: any) => c._id === selectedClassId);
  const classGrade = selectedClass
    ? parseInt(selectedClass.name.replace(/\D/g, ""), 10)
    : undefined;

  // CAPS syllabus topics (capsActions is deployed on prod; exams.getSyllabusTopics may lag)
  const capsSubjects = useQuery(
    api.capsActions.getCapsSubjects,
    classGrade !== undefined ? { grade: classGrade } : {}
  );

  const matchedCapsSubjectId = useMemo(() => {
    if (!selectedSubject || !capsSubjects) return undefined;
    const matchCaps = (cs: { code: string; name: string; grade?: number }) => {
      if (classGrade !== undefined && cs.grade !== classGrade) return false;
      const codeMatch =
        selectedSubject.code.toUpperCase().startsWith(cs.code.toUpperCase()) ||
        cs.code.toUpperCase().startsWith(selectedSubject.code.toUpperCase());
      const nameMatch =
        selectedSubject.name.toLowerCase().includes(cs.name.toLowerCase()) ||
        cs.name.toLowerCase().includes(selectedSubject.name.toLowerCase());
      return codeMatch || nameMatch;
    };
    return (
      capsSubjects.find(matchCaps)?._id ??
      capsSubjects.find((cs) => {
        const codeMatch =
          selectedSubject.code.toUpperCase().startsWith(cs.code.toUpperCase()) ||
          cs.code.toUpperCase().startsWith(selectedSubject.code.toUpperCase());
        const nameMatch =
          selectedSubject.name.toLowerCase().includes(cs.name.toLowerCase()) ||
          cs.name.toLowerCase().includes(selectedSubject.name.toLowerCase());
        return codeMatch || nameMatch;
      })?._id
    );
  }, [selectedSubject, capsSubjects, classGrade]);

  const syllabusTopicsRaw = useQuery(
    api.capsActions.getSyllabusTopics,
    matchedCapsSubjectId ? { subjectId: matchedCapsSubjectId } : "skip"
  );

  const syllabusTopics = useMemo(() => {
    if (!syllabusTopicsRaw || !matchedCapsSubjectId) return syllabusTopicsRaw;
    return syllabusTopicsRaw.filter(
      (t: { capsSubject: string; grade: number }) =>
        t.capsSubject === matchedCapsSubjectId &&
        (classGrade === undefined || t.grade === classGrade)
    );
  }, [syllabusTopicsRaw, matchedCapsSubjectId, classGrade]);

  // Filter templates by exam type
  const filteredTemplates = EXAM_TEMPLATES.filter((t) => t.examType === selectedExamType);

  // Total questions from mix
  const totalQuestions = questionMix.reduce((sum, m) => sum + m.count, 0);
  const totalPoints = questionMix.reduce((sum, m) => sum + m.count * m.points, 0);

  const applyTemplate = (templateId: string) => {
    const template = EXAM_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    setSelectedTemplate(templateId);
    form.setValue("examType", template.examType);
    form.setValue("difficulty", template.difficulty as "Easy" | "Medium" | "Hard");
    form.setValue("questionMix", template.questionMix as any);
    if (template.examType === "quiz") {
      form.setValue("maxAttempts", 3);
      form.setValue("instantFeedback", true);
    }
    setStep("configure");
  };

  const addQuestionTypeRow = () => {
    const current = form.getValues("questionMix");
    form.setValue("questionMix", [...current, { type: "MCQ", count: 1, points: 1 }]);
  };

  const removeQuestionTypeRow = (index: number) => {
    const current = form.getValues("questionMix");
    if (current.length <= 1) return;
    form.setValue("questionMix", current.filter((_, i) => i !== index));
  };

  const updateQuestionMixCount = (index: number, delta: number) => {
    const current = form.getValues("questionMix");
    const updated = [...current];
    updated[index] = { ...updated[index], count: Math.max(0, updated[index].count + delta) };
    form.setValue("questionMix", updated);
  };

  const toggleTopic = (topic: string) => {
    const current = form.getValues("topics");
    if (current.includes(topic)) {
      form.setValue("topics", current.filter((t) => t !== topic));
    } else {
      form.setValue("topics", [...current, topic]);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (isScratch) {
      try {
        setLoading(true);
        const examId = await createExamMutation({
          title: values.title,
          subject: values.subject as any,
          class: values.class as any,
          duration: values.duration,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // default 1 week
          examType: values.examType,
          maxAttempts: values.maxAttempts,
          instantFeedback: values.instantFeedback,
          templateUsed: "scratch",
        });
        toast.success("Blank assessment created successfully!");
        onSuccess();
        onOpenChange(false);
        setStep("template");
        setSelectedTemplate(null);
        setIsScratch(false);
        navigate(`/lms/exams/${examId}`);
      } catch (error: any) {
        toast.error(error.message || "Failed to create assessment");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!values.topics || values.topics.length === 0) {
      toast.error("Please select at least one syllabus topic");
      return;
    }
    if (totalQuestions === 0) {
      toast.error("Please add at least one question");
      return;
    }

    try {
      setLoading(true);

      const mix = questionMix.filter((m) => m.count > 0);
      const topic = values.topics.join(", ");

      // Legacy shape — required for older Convex deployments (topic: string)
      const legacyPayload = {
        subjectId: values.subject as any,
        classId: values.class as any,
        topic,
        difficulty: values.difficulty,
        count: totalQuestions,
        title: values.title,
        questionType: mix[0]?.type ?? "MCQ",
      };

      // Full shape — multi-topic + question type mix (newer deployments)
      const fullPayload = {
        ...legacyPayload,
        topics: values.topics,
        examType: values.examType,
        questionTypeMix: mix,
        templateUsed: selectedTemplate || undefined,
        maxAttempts: values.maxAttempts,
        instantFeedback: values.instantFeedback,
      };

      try {
        await generateExamAction(legacyPayload);
      } catch (err: any) {
        const msg = err?.message || "";
        if (msg.includes("ArgumentValidation") || msg.includes("topic")) {
          await generateExamAction(fullPayload);
        } else {
          throw err;
        }
      }

      toast.success(
        `AI is generating your ${values.examType === "quiz" ? "quiz" : "exam"}! Check back in a moment.`
      );
      onSuccess();
      onOpenChange(false);
      // Reset
      setStep("template");
      setSelectedTemplate(null);
      setIsScratch(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to start generation");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("template");
      setSelectedTemplate(null);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-violet-600" />
            {step === "template" ? "Create Assessment" : "Configure Assessment"}
          </DialogTitle>
          <DialogDescription>
            {step === "template"
              ? "Choose a template to get started quickly, or build from scratch"
              : "Customize your assessment settings"}
          </DialogDescription>
        </DialogHeader>

        {step === "template" ? (
          <div className="space-y-6">
            {/* Exam Type Toggle */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                onClick={() => form.setValue("examType", "quiz")}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2",
                  selectedExamType === "quiz"
                    ? "bg-white shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Zap className="h-4 w-4" /> Quiz (Student Practice)
              </button>
              <button
                onClick={() => form.setValue("examType", "exam")}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2",
                  selectedExamType === "exam"
                    ? "bg-white shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <GraduationCap className="h-4 w-4" /> Exam (Formal Assessment)
              </button>
            </div>

            {/* Info banner */}
            <div className={cn(
              "p-3 rounded-lg text-sm",
              selectedExamType === "quiz"
                ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                : "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
            )}>
              {selectedExamType === "quiz" ? (
                <span>
                  <strong>Quizzes</strong> are self-paced practice assessments. Students can retry multiple times,
                  get instant feedback, and learn from mistakes. Great for revision and self-study.
                </span>
              ) : (
                <span>
                  <strong>Exams</strong> are formal timed assessments. Single attempt, teacher-controlled,
                  with full grading and analytics. Perfect for tests, mid-terms, and finals.
                </span>
              )}
            </div>

            {/* Templates Grid */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4" />
                {selectedExamType === "quiz" ? "Quiz" : "Exam"} Templates
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template.id)}
                    className={cn(
                      "relative p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] hover:shadow-md",
                      selectedTemplate === template.id
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                        : "border-border hover:border-violet-300 dark:hover:border-violet-700"
                    )}
                  >
                    <div className="text-2xl mb-2">{template.icon}</div>
                    <div className="font-semibold text-sm">{template.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{template.description}</div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {template.questionMix.reduce((s, m) => s + m.count, 0)} questions
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {template.duration} min
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Build from scratch */}
            <div className="relative">
              <Separator />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-background px-3 text-xs text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSelectedTemplate(null);
                setIsScratch(true);
                setStep("configure");
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Build from Scratch
            </Button>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="space-y-5">
              {/* Back button */}
              <button
                type="button"
                onClick={() => {
                  setStep("template");
                  setIsScratch(false);
                }}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                ← Back to templates
              </button>

              {/* Title */}
              <Controller
                name="title"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Assessment Title</FieldLabel>
                    <Input placeholder="e.g. Grade 10 Maths Term 2 Test" {...field} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {/* Subject & Class */}
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="subject"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Subject</FieldLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject..." />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((s: any) => (
                            <SelectItem key={s._id} value={s._id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />

                <Controller
                  name="class"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Class</FieldLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class..." />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((c: any) => (
                            <SelectItem key={c._id} value={c._id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
              </div>

              {/* Duration */}
              <Controller
                name="duration"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Duration (minutes)</FieldLabel>
                    <Input type="number" min={5} max={180} {...field} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {!isScratch && (
                <>
                  {/* Syllabus Topics Multi-Select */}
                  <Field>
                    <FieldLabel className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Syllabus Topics
                      {selectedTopics && selectedTopics.length > 0 && (
                        <Badge variant="secondary" className="ml-auto">
                          {selectedTopics.length} selected
                        </Badge>
                      )}
                    </FieldLabel>
                    {syllabusTopics && syllabusTopics.length > 0 ? (
                      <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
                        {syllabusTopics.map((t: any) => (
                          <button
                            key={t._id}
                            type="button"
                            onClick={() => toggleTopic(t.topic)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                              selectedTopics.includes(t.topic)
                                ? "bg-violet-600 text-white border-violet-600"
                                : "bg-background hover:bg-violet-50 dark:hover:bg-violet-950/30 border-border"
                            )}
                          >
                            {t.topic}
                            {t.subTopics?.length > 0 && (
                              <span className="ml-1 opacity-60">({t.subTopics.length} sub-topics)</span>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 border rounded-lg bg-muted/30 text-sm text-muted-foreground">
                        {selectedSubjectId
                          ? "No syllabus topics found for this subject. You can still generate questions."
                          : "Select a subject first to see syllabus topics."}
                      </div>
                    )}
                  </Field>

                  {/* Difficulty */}
                  <Controller
                    name="difficulty"
                    control={form.control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel>Difficulty Level</FieldLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Easy">🟢 Easy</SelectItem>
                            <SelectItem value="Medium">🟡 Medium</SelectItem>
                            <SelectItem value="Hard">🔴 Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />

                  {/* Question Type Mix */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FieldLabel className="mb-0">Question Types</FieldLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={addQuestionTypeRow}
                        className="h-7 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Type
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {questionMix.map((mix, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/20">
                          <Select
                            value={mix.type}
                            onValueChange={(val) => {
                              const updated = [...questionMix];
                              updated[index] = { ...updated[index], type: val };
                              form.setValue("questionMix", updated);
                            }}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableQuestionTypes.map((qt) => (
                                <SelectItem key={qt.value} value={qt.value}>
                                  {qt.icon} {qt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuestionMixCount(index, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">{mix.count}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuestionMixCount(index, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            ×
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              className="w-12 h-7 text-xs"
                              value={mix.points}
                              onChange={(e) => {
                                const updated = [...questionMix];
                                updated[index] = { ...updated[index], points: parseInt(e.target.value) || 1 };
                                form.setValue("questionMix", updated);
                              }}
                            />
                            pts
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 ml-auto text-muted-foreground hover:text-destructive"
                            onClick={() => removeQuestionTypeRow(index)}
                            disabled={questionMix.length <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Summary */}
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>Total: <strong className="text-foreground">{totalQuestions}</strong> questions</span>
                      <span>•</span>
                      <span>Points: <strong className="text-foreground">{totalPoints}</strong></span>
                      <span>•</span>
                      <span>Est. time: <strong className="text-foreground">{Math.max(5, Math.ceil(totalQuestions * 2))}</strong> min</span>
                    </div>
                  </div>
                </>
              )}

              {/* Quiz-specific options */}
              {selectedExamType === "quiz" && (
                <div className="space-y-3 p-3 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
                  <h4 className="text-sm font-semibold">Quiz Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      name="maxAttempts"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>Max Attempts</FieldLabel>
                          <Input type="number" min={1} max={10} {...field} />
                        </Field>
                      )}
                    />
                    <Controller
                      name="instantFeedback"
                      control={form.control}
                      render={({ field }) => (
                        <Field className="flex items-center gap-2 pt-6">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <FieldLabel className="mb-0">Instant Feedback</FieldLabel>
                        </Field>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Advanced toggle */}
              {!isScratch && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    Advanced Options
                  </button>

                  {showAdvanced && (
                    <div className="p-3 border rounded-lg bg-muted/20 text-xs text-muted-foreground space-y-2">
                      <p><strong>Subject Category:</strong> {subjectCategory}</p>
                      <p><strong>Available Question Types:</strong> {availableQuestionTypes.map((t) => t.label).join(", ")}</p>
                      <p className="text-[10px]">
                        Auto-graded types: MCQ, True/False, Fill-in-blank, Match Columns, Calculation.
                        Manual grading: Short Answer, Essay.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Submit */}
              <Button type="submit" className="w-full" disabled={loading || (!isScratch && totalQuestions === 0)}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isScratch ? "Creating..." : "Generating with AI..."}
                  </>
                ) : (
                  <>
                    {isScratch ? <Plus className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {isScratch 
                      ? `Create ${selectedExamType === "quiz" ? "Quiz" : "Exam"} from Scratch`
                      : `Generate ${selectedExamType === "quiz" ? "Quiz" : "Exam"} (${totalQuestions} questions)`}
                  </>
                )}
              </Button>
            </FieldGroup>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExamGenerator;
