import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { api } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

// ─── GET MY HOMEWORK SUBMISSIONS ────────────────────────────────

export const getMyHomework = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("homeworkSubmissions")
      .withIndex("by_student", (q) => q.eq("student", userId))
      .collect();
  },
});

// ─── GET ALL HOMEWORK (for teachers) ────────────────────────────

export const getAllHomework = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (user?.role !== "teacher" && user?.role !== "admin") {
      throw new Error("Only teachers and admins can view all homework");
    }

    return await ctx.db.query("homeworkSubmissions").collect();
  },
});

// ─── SUBMIT HOMEWORK (AI action) ────────────────────────────────

export const submitHomework = action({
  args: {
    subjectId: v.optional(v.id("subjects")),
    question: v.string(),
    studentAnswer: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    let aiScore: number | undefined;
    let aiFeedback: string | undefined;
    let aiCorrectAnswer: string | undefined;
    let status: "pending" | "graded" = "pending";

    if (apiKey) {
      try {
        const prompt = `You are an experienced South African teacher helping a student with their homework. Grade 5-12 level.

HOMEWORK QUESTION: ${args.question}

${args.studentAnswer ? `STUDENT'S ANSWER: ${args.studentAnswer}` : ""}

Provide:
1. A score out of 100 (be fair but thorough)
2. Detailed, encouraging feedback explaining what's correct and what needs improvement
3. The correct answer or suggested solution

If the question is in a South African language (isiZulu, Sesotho, Afrikaans, etc.), respond in that language.

Respond in JSON format:
{
  "score": 85,
  "feedback": "Detailed feedback here...",
  "correctAnswer": "The correct answer or solution here..."
}`;

        const openai = createOpenAI({ apiKey, baseURL: "https://api.deepseek.com/v1" });
        const { text } = await generateText({
          model: openai("deepseek-chat"),
          prompt,
        });

        const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const start = clean.indexOf("{");
        const end = clean.lastIndexOf("}");
        if (start !== -1 && end !== -1) {
          const parsed = JSON.parse(clean.substring(start, end + 1));
          aiScore = parsed.score;
          aiFeedback = parsed.feedback;
          aiCorrectAnswer = parsed.correctAnswer;
          status = "graded";
        }
      } catch (e) {
        console.error("AI grading failed:", e);
      }
    }

    // Save to database
    await ctx.runMutation(api.homework.saveHomework, {
      studentId: userId,
      subjectId: args.subjectId,
      question: args.question,
      studentAnswer: args.studentAnswer,
      imageUrl: args.imageUrl,
      aiScore,
      aiFeedback,
      aiCorrectAnswer,
      status,
    });

    return { success: true, aiScore, aiFeedback, aiCorrectAnswer, status };
  },
});

// ─── SAVE HOMEWORK (internal mutation) ──────────────────────────

export const saveHomework = mutation({
  args: {
    studentId: v.id("users"),
    subjectId: v.optional(v.id("subjects")),
    question: v.string(),
    studentAnswer: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    aiScore: v.optional(v.number()),
    aiFeedback: v.optional(v.string()),
    aiCorrectAnswer: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("graded")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("homeworkSubmissions", {
      student: args.studentId,
      subject: args.subjectId!,
      question: args.question,
      studentAnswer: args.studentAnswer,
      imageUrl: args.imageUrl,
      aiScore: args.aiScore,
      aiFeedback: args.aiFeedback,
      aiCorrectAnswer: args.aiCorrectAnswer,
      status: args.status,
      teacherReview: undefined,
    });
  },
});

// ─── TEACHER REVIEW ─────────────────────────────────────────────

export const reviewHomework = mutation({
  args: {
    homeworkId: v.id("homeworkSubmissions"),
    teacherReview: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (user?.role !== "teacher" && user?.role !== "admin") {
      throw new Error("Only teachers can review homework");
    }

    await ctx.db.patch(args.homeworkId, {
      teacherReview: args.teacherReview,
    });

    return { success: true };
  },
});
