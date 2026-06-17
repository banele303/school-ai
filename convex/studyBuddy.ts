"use node";
declare const process: { env: Record<string, string | undefined> };
import { action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { api } from "./_generated/api";

export const askStudyBuddy = action({
  args: {
    question: v.string(),
    subjectId: v.optional(v.id("subjects")),
    conversationHistory: v.optional(v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
    }))),
  },
  handler: async (ctx, args): Promise<{ answer: string }> => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return { answer: "AI service is not configured. Please set DEEPSEEK_API_KEY in your Convex environment." };

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user: any = await ctx.runQuery(api.users.getCurrentUser);

    // Build context from subject materials if a subject is selected
    let contextText = "";
    if (args.subjectId) {
      const materials: any[] = await ctx.runQuery(api.lms.getMaterials, { subjectId: args.subjectId });
      if (materials.length > 0) {
        const materialsWithText = materials.filter((m: any) => m.extractedText);
        if (materialsWithText.length > 0) {
          contextText = `\n\nRELEVANT STUDY MATERIALS:\n${materialsWithText.map((m: any) => `--- ${m.title} ---\n${m.extractedText?.slice(0, 1500)}`).join("\n\n")}`;
        }
      }
    }

    // Build conversation history
    const history = (args.conversationHistory || []).slice(-6); // last 6 exchanges

    const systemPrompt: string = `You are an AI study assistant for ${user?.name || "a student"}.
Your role is to help students understand academic subjects, explain concepts clearly, and guide them through problems step by step.
Crucially, you must tailor your language and explanations for school students ranging from Grade 5 to Grade 12. Keep explanations accessible but age-appropriate.
You are a multilingual South African assistant. You must be able to understand and respond fluently in English, isiZulu, Sesotho, Afrikaans, Tshivenda, and isiXhosa. If a student asks a question in one of these languages, respond in that same language while maintaining your encouraging and educational persona.
If study materials are provided, prioritise using that information to answer questions.
If you don't know something, say so honestly and suggest how the student can find the answer.${contextText}`;

    const historyText = history.map((h: any) => `${h.role === "user" ? "Student" : "AI"}: ${h.content}`).join("\n");
    const prompt: string = `${historyText ? historyText + "\n" : ""}Student: ${args.question}\nAI:`;

    const openai = createOpenAI({ apiKey, baseURL: "https://api.deepseek.com/v1" });
    const { text } = await generateText({
      model: openai("deepseek-chat"),
      system: systemPrompt,
      prompt,
    });

    return { answer: String(text) };
  },
});
