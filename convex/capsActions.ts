import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

declare const process: { env: Record<string, string | undefined> };

// ── LANGUAGES ──
export const getLanguages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("languages").collect();
  },
});

// ── CAPS SUBJECTS ──
export const getCapsSubjects = query({
  args: { grade: v.optional(v.number()) },
  handler: async (ctx, args) => {
    if (args.grade !== undefined) {
      return await ctx.db.query("capsSubjects")
        .withIndex("by_grade", (q) => q.eq("grade", args.grade!))
        .collect();
    }
    return await ctx.db.query("capsSubjects").collect();
  },
});

// ── SYLLABUS TOPICS ──
export const getSyllabusTopics = query({
  args: {
    grade: v.optional(v.number()),
    subjectId: v.optional(v.id("capsSubjects")),
    term: v.optional(v.number()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.grade !== undefined && args.language !== undefined) {
      return await ctx.db.query("syllabusTopics")
        .withIndex("by_grade_language", (q) => q.eq("grade", args.grade!).eq("language", args.language!))
        .collect();
    }
    if (args.subjectId !== undefined && args.term !== undefined) {
      return await ctx.db.query("syllabusTopics")
        .withIndex("by_subject_term", (q) => q.eq("capsSubject", args.subjectId!).eq("term", args.term!))
        .collect();
    }
    return await ctx.db.query("syllabusTopics").collect();
  },
});

// ── PAST PAPERS ──
export const getPastPapers = query({
  args: {
    grade: v.optional(v.number()),
    subjectId: v.optional(v.id("capsSubjects")),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.grade !== undefined && args.subjectId !== undefined) {
      return await ctx.db.query("pastPapers")
        .withIndex("by_grade_subject", (q) => q.eq("grade", args.grade!).eq("subject", args.subjectId!))
        .collect();
    }
    if (args.year !== undefined) {
      return await ctx.db.query("pastPapers")
        .withIndex("by_year", (q) => q.eq("year", args.year!))
        .collect();
    }
    return await ctx.db.query("pastPapers").collect();
  },
});

export const addPastPaper = mutation({
  args: {
    title: v.string(),
    grade: v.number(),
    subjectId: v.id("capsSubjects"),
    language: v.string(),
    year: v.number(),
    term: v.number(),
    paperType: v.string(),
    fileUrl: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    extractedText: v.optional(v.string()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Only admins can upload past papers");
    return await ctx.db.insert("pastPapers", {
      title: args.title,
      grade: args.grade,
      subject: args.subjectId,
      language: args.language,
      year: args.year,
      term: args.term,
      paperType: args.paperType,
      fileUrl: args.fileUrl,
      fileType: args.fileType,
      fileSize: args.fileSize,
      extractedText: args.extractedText,
      uploadedBy: userId,
      isPublished: true,
      tags: args.tags,
    });
  },
});

export const deletePastPaper = mutation({
  args: { id: v.id("pastPapers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Only admins can delete");
    await ctx.db.delete(args.id);
  },
});

// ── STUDY RESOURCES ──
export const getStudyResources = query({
  args: {
    grade: v.optional(v.number()),
    subjectId: v.optional(v.id("capsSubjects")),
    resourceType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.grade !== undefined && args.subjectId !== undefined) {
      return await ctx.db.query("studyResources")
        .withIndex("by_grade_subject", (q) => q.eq("grade", args.grade!).eq("subject", args.subjectId!))
        .collect();
    }
    if (args.resourceType !== undefined) {
      return await ctx.db.query("studyResources")
        .withIndex("by_type", (q) => q.eq("resourceType", args.resourceType!))
        .collect();
    }
    return await ctx.db.query("studyResources").collect();
  },
});

export const addStudyResource = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    grade: v.number(),
    subjectId: v.id("capsSubjects"),
    language: v.string(),
    resourceType: v.string(),
    fileUrl: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    extractedText: v.optional(v.string()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Only admins can upload resources");
    return await ctx.db.insert("studyResources", {
      title: args.title,
      description: args.description,
      grade: args.grade,
      subject: args.subjectId,
      language: args.language,
      resourceType: args.resourceType,
      fileUrl: args.fileUrl,
      fileType: args.fileType,
      fileSize: args.fileSize,
      extractedText: args.extractedText,
      uploadedBy: userId,
      isPublished: true,
      tags: args.tags,
    });
  },
});

export const deleteStudyResource = mutation({
  args: { id: v.id("studyResources") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Only admins can delete");
    await ctx.db.delete(args.id);
  },
});

// ── AI EXAM GENERATOR ──
export const generateExamFromSyllabus = action({
  args: {
    grade: v.number(),
    subjectId: v.id("capsSubjects"),
    language: v.string(),
    term: v.number(),
    topics: v.array(v.string()),
    questionCount: v.number(),
    difficulty: v.string(),
    duration: v.number(),
  },
  handler: async (ctx, args): Promise<any> => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return { questions: [], error: "AI not configured" };

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    let topicContext = "";
    try {
      const topics = await ctx.runQuery("capsActions:getSyllabusTopics" as any, {
        grade: args.grade,
        subjectId: args.subjectId,
        term: args.term,
        language: args.language,
      });
      topicContext = topics.map((t: any) => `${t.topic}: ${t.contentOutline}`).join("\n");
    } catch { /* ignore */ }

    const langName = args.language === "en" ? "English" : args.language === "af" ? "Afrikaans" : args.language === "zu" ? "isiZulu" : args.language === "xh" ? "isiXhosa" : args.language;

    const prompt = `You are an expert South African CAPS teacher. Generate a ${args.questionCount}-question exam for Grade ${args.grade}.

TERM: ${args.term}
LANGUAGE: ${langName}
DIFFICULTY: ${args.difficulty}
DURATION: ${args.duration} minutes

SYLLABUS TOPICS:
${topicContext || "General curriculum topics for this grade and term."}

SPECIFIC TOPICS: ${args.topics.join(", ")}

RULES:
1. Output ONLY raw JSON — no markdown
2. Mix: 60% MCQ, 40% SHORT_ANSWER
3. Distribute across topics
4. Include correct answers
5. Points: 1-5 per question
6. MCQ: exactly 4 options (A, B, C, D)
7. Write ALL questions and answers in ${langName}

JSON FORMAT:
{
  "questions": [
    {
      "questionText": "The question text",
      "type": "MCQ",
      "options": "A) option1\nB) option2\nC) option3\nD) option4",
      "correctAnswer": "The correct answer text",
      "points": 2,
      "topic": "Topic name",
      "difficulty": "easy"
    }
  ],
  "totalPoints": 100,
  "duration": ${args.duration}
}`;

    try {
      const openai = createOpenAI({ apiKey, baseURL: "https://api.deepseek.com/v1" });
      const { text } = await generateText({ prompt, model: openai("deepseek-chat") });
      const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start === -1 || end === -1) return { questions: [], error: "AI response not valid JSON" };
      const result = JSON.parse(clean.substring(start, end + 1));

      let examId;
      try {
        examId = await ctx.runMutation("capsActions:saveGeneratedExam" as any, {
          title: `Grade ${args.grade} Exam - Term ${args.term}`,
          grade: args.grade,
          subject: args.subjectId,
          language: args.language,
          term: args.term,
          questions: result.questions || [],
          totalPoints: result.totalPoints || 0,
          duration: args.duration,
          generatedBy: userId,
          basedOnTopics: [],
          isFinalized: false,
        });
      } catch { /* ignore save error */ }

      return { success: true, examId, questions: result.questions, totalPoints: result.totalPoints };
    } catch (e: any) {
      return { questions: [], error: e.message };
    }
  },
});

export const saveGeneratedExam = mutation({
  args: {
    title: v.string(),
    grade: v.number(),
    subject: v.id("capsSubjects"),
    language: v.string(),
    term: v.number(),
    questions: v.array(v.object({
      questionText: v.string(),
      type: v.union(v.literal("MCQ"), v.literal("SHORT_ANSWER"), v.literal("ESSAY")),
      options: v.optional(v.array(v.string())),
      correctAnswer: v.string(),
      points: v.number(),
      topic: v.string(),
      difficulty: v.string(),
    })),
    totalPoints: v.number(),
    duration: v.number(),
    generatedBy: v.id("users"),
    basedOnTopics: v.array(v.id("syllabusTopics")),
    isFinalized: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("generatedExams", args);
  },
});

export const getGeneratedExams = query({
  args: {
    grade: v.optional(v.number()),
    subjectId: v.optional(v.id("capsSubjects")),
  },
  handler: async (ctx, args) => {
    if (args.grade !== undefined && args.subjectId !== undefined) {
      return await ctx.db.query("generatedExams")
        .withIndex("by_grade_subject", (q) => q.eq("grade", args.grade!).eq("subject", args.subjectId!))
        .collect();
    }
    return await ctx.db.query("generatedExams").collect();
  },
});
