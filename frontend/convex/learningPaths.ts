declare const process: { env: Record<string, string | undefined> };
import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { api } from "./_generated/api";

export const getLearningPaths = query({
  args: { studentId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let targetStudentId = args.studentId || userId;
    
    // Check if parent
    const user = await ctx.db.get(userId);
    if (user?.role === "parent" && user.linkedStudent) {
      targetStudentId = user.linkedStudent;
    }

    return await ctx.db
      .query("learningPaths")
      .withIndex("by_student", (q) => q.eq("student", targetStudentId as any))
      .order("desc")
      .collect();
  },
});

export const saveLearningPath = mutation({
  args: {
    studentId: v.id("users"),
    plan: v.string(),
    academicYearId: v.id("academicYears"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("learningPaths", {
      student: args.studentId,
      plan: args.plan,
      generatedAt: Date.now(),
      academicYear: args.academicYearId,
    });
  },
});

export const generateLearningPath = action({
  args: {
    studentId: v.id("users"),
    academicYearId: v.id("academicYears"),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return { plan: "AI service is not configured. Please set DEEPSEEK_API_KEY in your Convex environment." };

    // In a real app, we would fetch the student's past grades, attendance, and missed assignments here.
    // For now, we simulate pulling that context.
    
    const prompt = `
      You are an expert South African educator. Generate a personalized, weekly learning path for a student based on standard curriculum.
      Identify 3 key focus areas and suggest actionable study activities.
      Return the result as a raw JSON string (no markdown, just the object).
      
      Schema:
      {
        "overview": "Short encouraging message",
        "focusAreas": [
          { "topic": "Name of topic", "reason": "Why focus here", "activities": ["Activity 1", "Activity 2"] }
        ]
      }
    `;

    const openai = createOpenAI({ apiKey, baseURL: "https://api.deepseek.com/v1" });
    const { text } = await generateText({
      prompt,
      model: openai.chat("deepseek-chat"),
    });

    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();

    await ctx.runMutation(api.learningPaths.saveLearningPath, {
      studentId: args.studentId,
      academicYearId: args.academicYearId,
      plan: cleanJson,
    });

    return { success: true };
  },
});
