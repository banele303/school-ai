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
    const cfWorkerUrl = process.env.CLOUDFLARE_WORKER_URL || "https://edunexus-ai.edusqwizooor.workers.dev";
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;

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

    let text = "";

    if (apiKey) {
      try {
        const openai = createOpenAI({
          apiKey,
          baseURL: process.env.DEEPSEEK_API_KEY ? "https://api.deepseek.com/v1" : undefined,
        });
        const res = await generateText({
          prompt,
          model: openai.chat("deepseek-chat"),
        });
        text = res.text;
      } catch (err) {
        console.warn("Primary AI provider failed, trying Cloudflare Workers AI:", err);
      }
    }

    if (!text) {
      try {
        const cfRes = await fetch(`${cfWorkerUrl}/api/generate-path`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        if (cfRes.ok) {
          const cfData: any = await cfRes.json();
          text = typeof cfData === "string" ? cfData : JSON.stringify(cfData);
        }
      } catch (cfErr) {
        console.error("Cloudflare Workers AI generate-path failed:", cfErr);
      }
    }

    if (!text) {
      return { plan: "AI service is currently unavailable. Please verify your Cloudflare Worker or API key setup." };
    }

    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();

    await ctx.runMutation(api.learningPaths.saveLearningPath, {
      studentId: args.studentId,
      academicYearId: args.academicYearId,
      plan: cleanJson,
    });

    return { success: true };
  },
});
