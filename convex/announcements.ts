declare const process: { env: Record<string, string | undefined> };
import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

// ── QUERIES ──────────────────────────────────────────────────────────────────

export const getAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    const role = user?.role || "student";

    const all = await ctx.db.query("announcements").order("desc").collect();

    // Filter by target role
    return all.filter(
      (a) => a.targetRoles.includes("all") || a.targetRoles.includes(role)
    );
  },
});

// ── MUTATIONS ─────────────────────────────────────────────────────────────────

export const createAnnouncement = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    targetRoles: v.array(v.string()),
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("urgent")),
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      throw new Error("Unauthorized");
    }
    return await ctx.db.insert("announcements", {
      ...args,
      author: userId,
    });
  },
});

export const deleteAnnouncement = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Unauthorized");
    await ctx.db.delete(args.id);
  },
});

// ── AI ACTION ─────────────────────────────────────────────────────────────────

export const generateAnnouncement = action({
  args: {
    bulletPoints: v.string(),
    tone: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return { text: "AI service is not configured. Please set DEEPSEEK_API_KEY in your Convex environment." };

    const prompt = `You are a professional South African school administrator. Write a clear, friendly school announcement based on these bullet points.
    If the bullet points imply a specific language (like isiZulu, Sesotho, Afrikaans, Tshivenda, or isiXhosa), write the announcement entirely in that language. Otherwise, use English.
    
Bullet points: ${args.bulletPoints}
Tone: ${args.tone || "professional and friendly"}

Write ONLY the announcement text (title on first line, then body). No markdown, no extra explanation.`;

    const openai = createOpenAI({ apiKey, baseURL: "https://api.deepseek.com/v1" });
    const { text } = await generateText({
      model: openai.chat("deepseek-chat"),
      prompt,
    });

    return { text };
  },
});
