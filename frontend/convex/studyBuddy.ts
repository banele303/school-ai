"use node";
declare const process: { env: Record<string, string | undefined> };
import { action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { api } from "./_generated/api";

const SCHOOL_ASSISTANT_GREETING =
  "Hello! I'm EduBot, your AI study buddy. I can help with school subjects, homework, exam preparation, study plans, summaries, and step-by-step explanations. What would you like to learn today?";

const FORBIDDEN_IDENTITY_PATTERNS = [
  /sqwizflow/i,
  /construction tender/i,
  /tender lifecycle/i,
  /pricing intelligence/i,
  /BOQ/i,
  /CIDB/i,
  /BBBEE/i,
  /COIDA/i,
  /supplier sourcing/i,
];

function sanitizeStudyBuddyAnswer(answer: string) {
  if (FORBIDDEN_IDENTITY_PATTERNS.some((pattern) => pattern.test(answer))) {
    return SCHOOL_ASSISTANT_GREETING;
  }
  return answer;
}

export const askStudyBuddy = action({
  args: {
    question: v.string(),
    subjectId: v.optional(v.id("subjects")),
    persona: v.optional(v.string()),
    conversationHistory: v.optional(v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
    }))),
  },
  handler: async (ctx, args): Promise<{ answer: string }> => {
    const apiKey = process.env.DEEPSEEK_API_KEY || "sk-6f00b232f9f0492fa87aa1e12920f50a";
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

    // Adjust persona prompt
    let personaPrompt = "";
    if (args.persona === "exam") {
      personaPrompt = "\nYour style is structured, strategic, and exam-focused. Break down points, provide practice tips, and highlight common exam pitfalls.";
    } else if (args.persona === "creative") {
      personaPrompt = "\nYour style is highly engaging and creative. Use rich analogies, real-world stories, and simple visual descriptions to make abstract concepts concrete.";
    } else {
      personaPrompt = "\nYour style is supportive, encouraging, and step-by-step. Guide the student carefully and build their confidence.";
    }

    const systemPrompt: string = `You are EduBot, a friendly and encouraging AI study assistant for ${user?.name || "a student"}.
You are only for this school learning platform. Never introduce yourself as Sqwizflow AI, a construction tender agent, a pricing intelligence agent, or a business/tender assistant.
Do not discuss tender search, BOQ extraction, CIDB, BBBEE, COIDA, construction pricing, supplier sourcing, or tender compliance unless the student explicitly asks about those topics as part of a school subject.
If the student greets you, greet them as EduBot and briefly offer school help: subjects, homework, exams, study plans, summaries, and step-by-step explanations.
Your role is to help students understand academic subjects, explain concepts clearly, and guide them through problems step by step.
Crucially, you must tailor your language and explanations for school students ranging from Grade 5 to Grade 12. Keep explanations accessible but age-appropriate.
You are a multilingual South African assistant. You must be able to understand and respond fluently in English, isiZulu, Sesotho, Afrikaans, Tshivenda, and isiXhosa. If a student asks a question in one of these languages, respond in that same language while maintaining your encouraging and educational persona.
If study materials are provided, prioritise using that information to answer questions.
If you don't know something, say so honestly and suggest how the student can find the answer.${contextText}${personaPrompt}`;

    const historyText = history.map((h: any) => `${h.role === "user" ? "Student" : "EduBot"}: ${h.content}`).join("\n");
    const prompt: string = `${historyText ? historyText + "\n" : ""}Student: ${args.question}\nEduBot:`;

    const openai = createOpenAI({ apiKey, baseURL: "https://api.deepseek.com/v1" });
    const { text } = await generateText({
      model: openai.chat("deepseek-chat"),
      system: systemPrompt,
      prompt,
    });

    return { answer: sanitizeStudyBuddyAnswer(String(text)) };
  },
});
