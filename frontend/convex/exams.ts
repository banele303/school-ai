declare const process: { env: Record<string, string | undefined> };
import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { api } from "./_generated/api";

// ─── SUBJECT CATEGORY CONFIG ─────────────────────────────────────
// Maps subject categories to recommended question types
const CATEGORY_QUESTION_TYPES: Record<string, { types: string[]; label: string }> = {
  maths: {
    types: ["MCQ", "TRUE_FALSE", "FILL_BLANK", "CALCULATION", "MATCH_COLUMN"],
    label: "Mathematics",
  },
  science: {
    types: ["MCQ", "TRUE_FALSE", "FILL_BLANK", "CALCULATION", "DIAGRAM_LABEL", "MATCH_COLUMN"],
    label: "Science",
  },
  language: {
    types: ["MCQ", "SHORT_ANSWER", "ESSAY", "FILL_BLANK", "MATCH_COLUMN"],
    label: "Language",
  },
  humanities: {
    types: ["MCQ", "SHORT_ANSWER", "ESSAY", "SOURCE_ANALYSIS", "MAP_WORK"],
    label: "Humanities",
  },
  life_skills: {
    types: ["MCQ", "SHORT_ANSWER", "ESSAY", "TRUE_FALSE"],
    label: "Life Skills",
  },
  arts: {
    types: ["MCQ", "SHORT_ANSWER", "ESSAY", "TRUE_FALSE"],
    label: "Arts & Culture",
  },
  technology: {
    types: ["MCQ", "TRUE_FALSE", "FILL_BLANK", "SHORT_ANSWER", "MATCH_COLUMN"],
    label: "Technology",
  },
  other: {
    types: ["MCQ", "SHORT_ANSWER", "ESSAY", "TRUE_FALSE", "FILL_BLANK", "MATCH_COLUMN", "CALCULATION", "DIAGRAM_LABEL"],
    label: "General",
  },
};

// ─── EXAM TEMPLATES CONFIG ───────────────────────────────────────
const EXAM_TEMPLATES = [
  {
    id: "quick_quiz",
    name: "Quick Quiz",
    description: "5 MCQ questions — fast knowledge check",
    icon: "⚡",
    examType: "quiz" as const,
    defaultDuration: 10,
    defaultQuestionCount: 5,
    questionTypeMix: [{ type: "MCQ", count: 5, points: 1 }],
    defaultDifficulty: "Medium",
    recommendedFor: ["maths", "science", "language", "humanities", "life_skills", "arts", "technology", "other"],
  },
  {
    id: "topic_test",
    name: "Topic Test",
    description: "10 questions — MCQ + short answer on one topic",
    icon: "📝",
    examType: "exam" as const,
    defaultDuration: 30,
    defaultQuestionCount: 10,
    questionTypeMix: [
      { type: "MCQ", count: 6, points: 1 },
      { type: "SHORT_ANSWER", count: 4, points: 3 },
    ],
    defaultDifficulty: "Medium",
    recommendedFor: ["maths", "science", "language", "humanities", "life_skills", "arts", "technology", "other"],
  },
  {
    id: "multi_topic_exam",
    name: "Multi-Topic Exam",
    description: "20 questions across multiple syllabus topics",
    icon: "📚",
    examType: "exam" as const,
    defaultDuration: 60,
    defaultQuestionCount: 20,
    questionTypeMix: [
      { type: "MCQ", count: 10, points: 1 },
      { type: "SHORT_ANSWER", count: 6, points: 3 },
      { type: "ESSAY", count: 4, points: 5 },
    ],
    defaultDifficulty: "Medium",
    recommendedFor: ["language", "humanities", "life_skills", "arts"],
  },
  {
    id: "maths_test",
    name: "Mathematics Test",
    description: "Mix of calculations, MCQs and problem solving",
    icon: "🔢",
    examType: "exam" as const,
    defaultDuration: 45,
    defaultQuestionCount: 15,
    questionTypeMix: [
      { type: "MCQ", count: 5, points: 1 },
      { type: "CALCULATION", count: 5, points: 3 },
      { type: "FILL_BLANK", count: 3, points: 2 },
      { type: "MATCH_COLUMN", count: 2, points: 2 },
    ],
    defaultDifficulty: "Medium",
    recommendedFor: ["maths"],
  },
  {
    id: "science_practical",
    name: "Science Assessment",
    description: "MCQ, diagram labelling, calculations and theory",
    icon: "🔬",
    examType: "exam" as const,
    defaultDuration: 60,
    defaultQuestionCount: 18,
    questionTypeMix: [
      { type: "MCQ", count: 6, points: 1 },
      { type: "TRUE_FALSE", count: 4, points: 1 },
      { type: "CALCULATION", count: 3, points: 3 },
      { type: "DIAGRAM_LABEL", count: 2, points: 3 },
      { type: "SHORT_ANSWER", count: 3, points: 4 },
    ],
    defaultDifficulty: "Medium",
    recommendedFor: ["science"],
  },
  {
    id: "comprehension_test",
    name: "Comprehension Test",
    description: "Passage-based MCQ and written responses",
    icon: "📖",
    examType: "exam" as const,
    defaultDuration: 45,
    defaultQuestionCount: 12,
    questionTypeMix: [
      { type: "MCQ", count: 6, points: 1 },
      { type: "SHORT_ANSWER", count: 4, points: 3 },
      { type: "ESSAY", count: 2, points: 5 },
    ],
    defaultDifficulty: "Medium",
    recommendedFor: ["language"],
  },
  {
    id: "true_false_quiz",
    name: "True/False Quiz",
    description: "Quick true or false knowledge check",
    icon: "✅",
    examType: "quiz" as const,
    defaultDuration: 5,
    defaultQuestionCount: 10,
    questionTypeMix: [{ type: "TRUE_FALSE", count: 10, points: 1 }],
    defaultDifficulty: "Easy",
    recommendedFor: ["maths", "science", "language", "humanities", "life_skills", "arts", "technology", "other"],
  },
  {
    id: "final_exam",
    name: "Final Examination",
    description: "Full formal exam — all question types, all topics",
    icon: "🎓",
    examType: "exam" as const,
    defaultDuration: 120,
    defaultQuestionCount: 40,
    questionTypeMix: [
      { type: "MCQ", count: 15, points: 1 },
      { type: "TRUE_FALSE", count: 5, points: 1 },
      { type: "FILL_BLANK", count: 5, points: 2 },
      { type: "SHORT_ANSWER", count: 8, points: 3 },
      { type: "ESSAY", count: 5, points: 5 },
      { type: "MATCH_COLUMN", count: 2, points: 2 },
    ],
    defaultDifficulty: "Hard",
    recommendedFor: ["maths", "science", "language", "humanities", "life_skills", "arts", "technology", "other"],
  },
];

// ─── QUERIES ─────────────────────────────────────────────────────

export const getExams = query({
  args: {
    classId: v.optional(v.id("classes")),
    examType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Unauthorized");

    let examsQuery = ctx.db.query("exams");

    // Filter by class if provided
    if (args.classId) {
      examsQuery = examsQuery.filter((q) => q.eq(q.field("class"), args.classId));
    }

    let exams = await examsQuery.collect();

    // Filter by exam type if provided
    if (args.examType) {
      exams = exams.filter((e) => e.examType === args.examType);
    }

    // Role-based filtering
    if (user.role === "student") {
      // Students only see active exams/quizzes for their class
      exams = exams.filter(
        (e) => e.isActive && e.class === user.studentClass
      );
    } else if (user.role === "teacher") {
      // Teachers see what they created
      exams = exams.filter((e) => e.teacher === user._id);
    }
    // Admins see all

    return await Promise.all(
      exams.map(async (exam) => {
        const subject = await ctx.db.get(exam.subject);
        const classObj = await ctx.db.get(exam.class);
        const teacher = await ctx.db.get(exam.teacher);
        return { ...exam, subject, class: classObj, teacher };
      })
    );
  },
});

export const getExam = query({
  args: { id: v.id("exams") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Unauthorized");

    const exam = await ctx.db.get(args.id);
    if (!exam) return null;

    // Students can only view active exams
    if (user.role === "student" && !exam.isActive) return null;
    if (user.role === "student" && exam.class !== user.studentClass) return null;

    const subject = await ctx.db.get(exam.subject);
    const classObj = await ctx.db.get(exam.class);
    const teacher = await ctx.db.get(exam.teacher);

    return { ...exam, subject, class: classObj, teacher };
  },
});

// Get syllabus topics for a subject (for multi-topic picker)
export const getSyllabusTopics = query({
  args: { subjectId: v.optional(v.id("subjects")), grade: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    let query = ctx.db.query("syllabusTopics");

    if (args.subjectId) {
      const subject = await ctx.db.get(args.subjectId);
      if (!subject) return [];

      const capsSubjects = await ctx.db.query("capsSubjects").collect();
      let bestMatch = capsSubjects.find((cs) => {
        if (args.grade !== undefined && cs.grade !== args.grade) return false;
        const codeMatch = subject.code.toUpperCase().startsWith(cs.code.toUpperCase()) ||
                          cs.code.toUpperCase().startsWith(subject.code.toUpperCase());
        const nameMatch = subject.name.toLowerCase().includes(cs.name.toLowerCase()) ||
                          cs.name.toLowerCase().includes(subject.name.toLowerCase());
        return codeMatch || nameMatch;
      });

      if (!bestMatch) {
        bestMatch = capsSubjects.find((cs) => {
          const codeMatch = subject.code.toUpperCase().startsWith(cs.code.toUpperCase()) ||
                            cs.code.toUpperCase().startsWith(subject.code.toUpperCase());
          const nameMatch = subject.name.toLowerCase().includes(cs.name.toLowerCase()) ||
                            cs.name.toLowerCase().includes(subject.name.toLowerCase());
          return codeMatch || nameMatch;
        });
      }

      if (!bestMatch) return [];

      query = query.filter((q) => q.eq(q.field("capsSubject"), bestMatch._id));
    }
    if (args.grade !== undefined) {
      query = query.filter((q) => q.eq(q.field("grade"), args.grade));
    }

    return await query.collect();
  },
});

// Get subject category config
export const getSubjectCategoryConfig = query({
  args: { subjectId: v.id("subjects") },
  handler: async (ctx, args) => {
    const subject = await ctx.db.get(args.subjectId);
    if (!subject) return CATEGORY_QUESTION_TYPES["other"];
    const cat = (subject.category || "other").toLowerCase();
    return CATEGORY_QUESTION_TYPES[cat] || CATEGORY_QUESTION_TYPES["other"];
  },
});

// Get exam templates
export const getExamTemplates = query({
  args: {},
  handler: async (_ctx, _args) => {
    return EXAM_TEMPLATES;
  },
});

// ─── MUTATIONS ───────────────────────────────────────────────────

export const createExam = mutation({
  args: {
    title: v.string(),
    subject: v.id("subjects"),
    class: v.id("classes"),
    duration: v.number(),
    dueDate: v.string(),
    examType: v.string(), // "quiz" or "exam"
    maxAttempts: v.optional(v.number()),
    instantFeedback: v.optional(v.boolean()),
    syllabusTopics: v.optional(v.array(v.string())),
    subjectCategory: v.optional(v.string()),
    templateUsed: v.optional(v.string()),
    capsPhase: v.optional(v.union(v.literal("Senior"), v.literal("FET"))),
    grade: v.optional(v.number()),
    southAfricanExamType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "teacher" && user.role !== "admin")) {
      throw new Error("Only teachers and admins can create exams");
    }

    const examId = await ctx.db.insert("exams", {
      title: args.title,
      subject: args.subject,
      class: args.class,
      teacher: user._id,
      duration: args.duration,
      dueDate: args.dueDate,
      isActive: false,
      examType: args.examType as "quiz" | "exam",
      maxAttempts: args.maxAttempts,
      instantFeedback: args.instantFeedback,
      syllabusTopics: args.syllabusTopics,
      subjectCategory: args.subjectCategory,
      templateUsed: args.templateUsed,
      capsPhase: args.capsPhase,
      grade: args.grade,
      southAfricanExamType: args.southAfricanExamType,
      totalPoints: 0,
      questions: [],
    });

    return { examId };
  },
});

export const updateExamQuestions = mutation({
  args: {
    examId: v.id("exams"),
    questions: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Unauthorized");

    const exam = await ctx.db.get(args.examId);
    if (!exam) throw new Error("Exam not found");
    if (user.role !== "admin" && exam.teacher !== user._id) {
      throw new Error("Not authorized");
    }

    const totalPoints = args.questions.reduce(
      (sum: number, q: any) => sum + (q.points || 0),
      0
    );

    await ctx.db.patch(args.examId, {
      questions: args.questions,
      totalPoints,
    });
  },
});

export const toggleExamActive = mutation({
  args: { examId: v.id("exams") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Unauthorized");

    const exam = await ctx.db.get(args.examId);
    if (!exam) throw new Error("Exam not found");
    if (user.role !== "admin" && exam.teacher !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.examId, { isActive: !exam.isActive });
    return { isActive: !exam.isActive };
  },
});

export const deleteExam = mutation({
  args: { examId: v.id("exams") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Unauthorized");

    const exam = await ctx.db.get(args.examId);
    if (!exam) throw new Error("Exam not found");
    if (user.role !== "admin" && exam.teacher !== user._id) {
      throw new Error("Not authorized");
    }

    // Delete related submissions
    const submissions = await ctx.db
      .query("submissions")
      .filter((q) => q.eq(q.field("exam"), args.examId))
      .collect();
    for (const sub of submissions) {
      await ctx.db.delete(sub._id);
    }

    await ctx.db.delete(args.examId);
    return { success: true };
  },
});

// ─── AI EXAM GENERATION ──────────────────────────────────────────

export const generateExam = action({
  args: {
    subjectId: v.id("subjects"),
    classId: v.id("classes"),
    /** @deprecated Use `topics` — kept for older deployed clients */
    topic: v.optional(v.string()),
    topics: v.optional(v.array(v.string())),
    difficulty: v.string(),
    count: v.number(),
    title: v.string(),
    examType: v.optional(v.string()), // "quiz" or "exam"
    questionType: v.optional(v.string()),
    questionTypeMix: v.optional(v.array(v.object({
      type: v.string(),
      count: v.number(),
      points: v.number(),
    }))),
    syllabusTopicIds: v.optional(v.array(v.string())),
    templateUsed: v.optional(v.string()),
    maxAttempts: v.optional(v.number()),
    instantFeedback: v.optional(v.boolean()),
    grade: v.optional(v.number()),
    southAfricanExamType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user: any = await ctx.runQuery(api.users.getCurrentUser);
    if (!user) throw new Error("Unauthorized");

    const topics =
      args.topics && args.topics.length > 0
        ? args.topics
        : args.topic
          ? args.topic.split(/[,;]/).map((t) => t.trim()).filter(Boolean)
          : [];
    if (topics.length === 0) {
      throw new Error("At least one syllabus topic is required");
    }

    const examType = args.examType ?? "exam";

    // Get subject info
    const subjects: any = await ctx.runQuery(api.subjects.getSubjects);
    const subject = subjects.find((s: any) => s._id === args.subjectId);
    const subjectName = subject?.name || "General";
    const subjectCategory = (subject?.category || "other").toLowerCase();
    const grade = args.grade || subject?.grade || 8;
    const capsPhase = grade >= 10 ? "FET" : "Senior";
    const southAfricanExamType =
      args.southAfricanExamType ||
      (grade >= 12 ? "NSC Paper Simulation" : grade >= 10 ? "CAPS Formal Test" : "Senior Phase Term Test");

    // Create the exam record
    const { examId }: any = await ctx.runMutation("exams:createExam" as any, {
      title: args.title,
      subject: args.subjectId,
      class: args.classId,
      duration: examType === "quiz" ? Math.max(5, Math.ceil(args.count * 2)) : Math.max(30, args.count * 3),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      examType,
      maxAttempts: args.maxAttempts || (examType === "quiz" ? 3 : 1),
      instantFeedback: args.instantFeedback ?? (examType === "quiz"),
      syllabusTopics: topics,
      subjectCategory,
      templateUsed: args.templateUsed,
      capsPhase,
      grade,
      southAfricanExamType,
    });

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return { examId, questions: [] };

    // Build question type mix
    const qMix =
      args.questionTypeMix ||
      (args.questionType
        ? [{ type: args.questionType, count: args.count, points: 1 }]
        : [{ type: "MCQ", count: args.count, points: 1 }]);

    // Build per-topic distribution
    const topicsList = topics.join(", ");
    const questionsPerTopic = Math.ceil(args.count / topics.length);

    // Build the prompt based on question types
    const typeDescriptions: Record<string, string> = {
      MCQ: '"MCQ" — Multiple choice with 4 options (A, B, C, D)',
      SHORT_ANSWER: '"SHORT_ANSWER" — Written short answer (2-5 sentence response)',
      ESSAY: '"ESSAY" — Long-form essay question (paragraph-level response)',
      TRUE_FALSE: '"TRUE_FALSE" — True or False statement',
      FILL_BLANK: '"FILL_BLANK" — Fill-in-the-blank with a missing word/phrase',
      MATCH_COLUMN: '"MATCH_COLUMN" — Match items from Column A to Column B',
      CALCULATION: '"CALCULATION" — Mathematical calculation or problem-solving',
      DIAGRAM_LABEL: '"DIAGRAM_LABEL" — Identify/label parts of a diagram or image',
    };

    const typeExamples: Record<string, string> = {
      MCQ: `{
  "questionText": "What is the capital of South Africa?",
  "type": "MCQ",
  "options": ["Johannesburg", "Cape Town", "Pretoria", "Durban"],
  "correctAnswer": "Pretoria",
  "points": 1,
  "topic": "TOPIC_NAME",
  "difficulty": "DIFFICULTY"
}`,
      TRUE_FALSE: `{
  "questionText": "The Earth is the third planet from the Sun.",
  "type": "TRUE_FALSE",
  "options": ["True", "False"],
  "correctAnswer": "True",
  "points": 1,
  "topic": "TOPIC_NAME",
  "difficulty": "DIFFICULTY"
}`,
      FILL_BLANK: `{
  "questionText": "The chemical symbol for water is _____.",
  "type": "FILL_BLANK",
  "options": [],
  "correctAnswer": "H2O",
  "points": 2,
  "topic": "TOPIC_NAME",
  "difficulty": "DIFFICULTY"
}`,
      SHORT_ANSWER: `{
  "questionText": "Explain the process of photosynthesis in plants.",
  "type": "SHORT_ANSWER",
  "options": [],
  "correctAnswer": "Photosynthesis is the process by which plants convert sunlight, water, and carbon dioxide into glucose and oxygen. It occurs in the chloroplasts and involves light-dependent and light-independent reactions.",
  "points": 5,
  "topic": "TOPIC_NAME",
  "difficulty": "DIFFICULTY"
}`,
      ESSAY: `{
  "questionText": "Discuss the causes and effects of climate change on South Africa's agricultural sector.",
  "type": "ESSAY",
  "options": [],
  "correctAnswer": "A comprehensive answer should include: causes (greenhouse gas emissions, deforestation, industrial agriculture), effects (drought, reduced crop yields, water scarcity, food insecurity), and specific South African examples (Western Cape drought, maize production decline).",
  "points": 10,
  "topic": "TOPIC_NAME",
  "difficulty": "DIFFICULTY"
}`,
      MATCH_COLUMN: `{
  "questionText": "Match each scientist with their discovery.",
  "type": "MATCH_COLUMN",
  "options": [],
  "correctAnswer": "See matchPairs for correct pairings",
  "points": 2,
  "topic": "TOPIC_NAME",
  "difficulty": "DIFFICULTY",
  "matchPairs": [
    {"left": "Isaac Newton", "right": "Laws of Motion"},
    {"left": "Albert Einstein", "right": "Theory of Relativity"},
    {"left": "Marie Curie", "right": "Radioactivity"},
    {"left": "Charles Darwin", "right": "Theory of Evolution"}
  ]
}`,
      CALCULATION: `{
  "questionText": "Solve for x: 3x + 7 = 22. Show your working.",
  "type": "CALCULATION",
  "options": [],
  "correctAnswer": "x = 5. Working: 3x + 7 = 22 → 3x = 22 - 7 → 3x = 15 → x = 15/3 → x = 5",
  "points": 3,
  "topic": "TOPIC_NAME",
  "difficulty": "DIFFICULTY"
}`,
      DIAGRAM_LABEL: `{
  "questionText": "Label the parts of a plant cell: A) _____ B) _____ C) _____ D) _____",
  "type": "DIAGRAM_LABEL",
  "options": [],
  "correctAnswer": "A) Cell Wall, B) Chloroplast, C) Nucleus, D) Vacuole",
  "points": 4,
  "topic": "TOPIC_NAME",
  "difficulty": "DIFFICULTY"
}`,
    };

    const mixDescription = qMix
      .map((m) => `  - ${m.count} x ${typeDescriptions[m.type] || m.type} (${m.points} pts each)`)
      .join("\n");

    const exampleQuestions = qMix
      .filter((m) => typeExamples[m.type])
      .map((m) =>
        typeExamples[m.type]
          .replace(/TOPIC_NAME/g, topics[0] || "the topic")
          .replace(/DIFFICULTY/g, args.difficulty)
      )
      .join(",\n");

    const prompt = `You are an expert South African CAPS curriculum teacher creating a ${examType === "quiz" ? "practice quiz" : "formal exam"}.

CONTEXT:
- Subject: ${subjectName} (${subjectCategory})
- Topics: ${topicsList}
- Grade: ${grade} (${capsPhase} Phase)
- Assessment type: ${southAfricanExamType}
- Difficulty: ${args.difficulty}
- Total Questions: ${args.count}
- Target approximately ${questionsPerTopic} questions per topic
- Questions should be distributed across the topics proportionally
- Apply CAPS cognitive weighting approximately: Knowledge & Recall 25%, Routine Procedures 30%, Complex Procedures 30%, Problem Solving / Creative Analysis 15%.

QUESTION TYPE MIX:
${mixDescription}

STRICT JSON SCHEMA — Output a JSON array of exactly ${args.count} question objects.
Each question must include: questionText, type, options, correctAnswer, points, topic, difficulty, cognitiveLevel.
For MATCH_COLUMN questions, also include matchPairs array.
For CALCULATION questions, include calculationSteps array with expected mark-bearing working steps.
For DIAGRAM_LABEL questions, include diagramHotspots array with percentage x/y coordinates.
Where possible, include bilingual fields: questionTextZulu, questionTextAfrikaans, optionsZulu, optionsAfrikaans, correctAnswerZulu, correctAnswerAfrikaans.

Example question formats:
[${exampleQuestions}]

RULES:
1. Output ONLY raw JSON array. No markdown, no conversational text.
2. Distribute questions across ALL topics: ${topicsList}
3. For MCQ: exactly 4 options, correctAnswer must match one option exactly.
4. For TRUE_FALSE: options must be ["True", "False"].
5. For FILL_BLANK: options must be empty []. correctAnswer is the exact missing word/phrase.
6. For MATCH_COLUMN: include matchPairs array with 3-5 pairs.
7. For SHORT_ANSWER/ESSAY: options must be []. correctAnswer is a detailed model answer for grading.
8. For CALCULATION: correctAnswer must include the full working/solution and calculationSteps must show partial-mark steps.
9. For DIAGRAM_LABEL: correctAnswer lists all labels and diagramHotspots must contain 3-6 hotspots.
10. Each question's "topic" field must be ONE of: ${topicsList}
11. Questions should be appropriate for ${args.difficulty} difficulty level.
12. Use South African contexts, rand values, local provinces, CAPS terminology, NSC/IEB-style phrasing where relevant.
13. cognitiveLevel must be one of: knowledge, routine, complex, problem_solving.`;

    const openai = createOpenAI({ apiKey, baseURL: "https://api.deepseek.com/v1" });
    const { text } = await generateText({
      prompt,
      model: openai.chat("deepseek-chat"),
    });

    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const questions = JSON.parse(cleanJson);

    await ctx.runMutation("exams:updateExamQuestions" as any, {
      examId,
      questions,
    });

    // Also save to question bank for reuse
    for (const q of questions) {
      await ctx.runMutation("questionBank:addQuestion" as any, {
        questionText: q.questionText,
        type: q.type,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        points: q.points,
        topic: q.topic,
        difficulty: q.difficulty || args.difficulty,
        subject: args.subjectId,
        matchPairs: q.matchPairs,
        diagramUrl: q.diagramUrl,
        questionTextZulu: q.questionTextZulu,
        questionTextAfrikaans: q.questionTextAfrikaans,
        optionsZulu: q.optionsZulu,
        optionsAfrikaans: q.optionsAfrikaans,
        correctAnswerZulu: q.correctAnswerZulu,
        correctAnswerAfrikaans: q.correctAnswerAfrikaans,
        cognitiveLevel: q.cognitiveLevel,
        calculationSteps: q.calculationSteps,
        diagramHotspots: q.diagramHotspots,
        tags: [subjectName, q.topic, q.type, args.difficulty],
        isPublished: true,
      });
    }

    return { success: true, examId, questionCount: questions.length };
  },
});

// ─── QUESTION BANK ───────────────────────────────────────────────

export const getQuestionBank = query({
  args: {
    subjectId: v.optional(v.id("subjects")),
    topic: v.optional(v.string()),
    type: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    let query = ctx.db.query("questionBank");

    if (args.subjectId) {
      query = query.filter((q) => q.eq(q.field("subject"), args.subjectId));
    }
    if (args.topic) {
      query = query.filter((q) => q.eq(q.field("topic"), args.topic));
    }
    if (args.type) {
      query = query.filter((q) => q.eq(q.field("type"), args.type));
    }
    if (args.difficulty) {
      query = query.filter((q) => q.eq(q.field("difficulty"), args.difficulty));
    }
    if (args.isPublished !== undefined) {
      query = query.filter((q) => q.eq(q.field("isPublished"), args.isPublished));
    }

    return await query.collect();
  },
});

export const addQuestionToBank = mutation({
  args: {
    questionText: v.string(),
    type: v.union(
      v.literal("MCQ"),
      v.literal("SHORT_ANSWER"),
      v.literal("ESSAY"),
      v.literal("TRUE_FALSE"),
      v.literal("FILL_BLANK"),
      v.literal("MATCH_COLUMN"),
      v.literal("CALCULATION"),
      v.literal("DIAGRAM_LABEL")
    ),
    options: v.array(v.string()),
    correctAnswer: v.string(),
    points: v.number(),
    topic: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    subject: v.optional(v.id("subjects")),
    grade: v.optional(v.number()),
    matchPairs: v.optional(v.array(v.object({ left: v.string(), right: v.string() }))),
    tags: v.array(v.string()),
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    return await ctx.db.insert("questionBank", {
      ...args,
      createdBy: userId,
      timesUsed: 0,
    });
  },
});

export const addQuestionFromBankToExam = mutation({
  args: {
    examId: v.id("exams"),
    bankQuestionId: v.id("questionBank"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Unauthorized");

    const exam = await ctx.db.get(args.examId);
    if (!exam) throw new Error("Exam not found");
    if (user.role !== "admin" && exam.teacher !== user._id) {
      throw new Error("Not authorized");
    }

    const bankQ = await ctx.db.get(args.bankQuestionId);
    if (!bankQ) throw new Error("Question not found");

    const newQuestion = {
      questionText: bankQ.questionText,
      type: bankQ.type,
      options: bankQ.options,
      correctAnswer: bankQ.correctAnswer,
      points: bankQ.points,
      topic: bankQ.topic,
      difficulty: bankQ.difficulty,
      matchPairs: bankQ.matchPairs,
      bankQuestionId: args.bankQuestionId,
    };

    const updatedQuestions = [...exam.questions, newQuestion];
    const totalPoints = updatedQuestions.reduce(
      (sum: number, q: any) => sum + (q.points || 0),
      0
    );

    await ctx.db.patch(args.examId, {
      questions: updatedQuestions,
      totalPoints,
    });

    // Increment timesUsed
    await ctx.db.patch(args.bankQuestionId, {
      timesUsed: (bankQ.timesUsed || 0) + 1,
    });

    return { success: true };
  },
});
