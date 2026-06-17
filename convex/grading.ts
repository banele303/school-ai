declare const process: { env: Record<string, string | undefined> };
import { mutation, action, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { api } from "./_generated/api";

export const getSubmissions = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assignmentSubmissions")
      .withIndex("by_assignment", (q) => q.eq("assignment", args.assignmentId))
      .collect();
  },
});

export const submitAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
    content: v.string(),
    fileUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    return await ctx.db.insert("assignmentSubmissions", {
      assignment: args.assignmentId,
      student: userId,
      content: args.content,
      fileUrl: args.fileUrl,
      submittedAt: Date.now(),
      status: "submitted",
    });
  },
});

export const gradeWithAI = action({
  args: {
    submissionId: v.id("assignmentSubmissions"),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return { grade: 0, feedback: "AI service is not configured. Please set DEEPSEEK_API_KEY in your Convex environment." };

    // We need to fetch the submission and the assignment details
    // But action ctx doesn't have direct DB access. We need a query.
    const submission = await ctx.runQuery(api.grading.getSubmissionDetail, { id: args.submissionId });
    if (!submission || !submission.assignment) throw new Error("Submission or assignment not found");

    const prompt = `
      You are an expert teacher grading a student's short-answer assignment.
      
      Assignment Title: ${submission.assignment.title}
      Assignment Description: ${submission.assignment.description}
      Max Points: ${submission.assignment.maxPoints || 100}
      
      Student's Answer:
      "${submission.content}"
      
      Provide a suggested grade (as a number) and constructive feedback.
      Return ONLY raw JSON in this format:
      {
        "suggestedGrade": number,
        "feedback": "string"
      }
    `;

    const openai = createOpenAI({ apiKey, baseURL: "https://api.deepseek.com/v1" });
    const { text } = await generateText({
      prompt,
      model: openai("deepseek-chat"),
    });

    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanJson);

    await ctx.runMutation(api.grading.saveAIGrade, {
      submissionId: args.submissionId,
      aiFeedback: result.feedback,
      suggestedGrade: result.suggestedGrade,
    });

    return result;
  },
});

export const getSubmissionDetail = query({
  args: { id: v.id("assignmentSubmissions") },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.id);
    if (!sub) return null;
    const assignment = await ctx.db.get(sub.assignment);
    return { ...sub, assignment };
  },
});

export const saveAIGrade = mutation({
  args: {
    submissionId: v.id("assignmentSubmissions"),
    aiFeedback: v.string(),
    suggestedGrade: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.submissionId, {
      aiFeedback: args.aiFeedback,
      feedback: `AI Suggestion: ${args.aiFeedback}`,
      grade: args.suggestedGrade,
      status: "graded",
    });
  },
});
