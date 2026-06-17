import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getQuestions = query({
  args: {
    subject: v.optional(v.id("subjects")),
    topic: v.optional(v.string()),
    type: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    let query = ctx.db.query("questionBank");

    if (args.subject) {
      query = query.filter((q) => q.eq(q.field("subject"), args.subject));
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
    if (args.createdBy) {
      query = query.filter((q) => q.eq(q.field("createdBy"), args.createdBy));
    }

    return await query.collect();
  },
});

export const addQuestion = mutation({
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
    options: v.optional(v.array(v.string())),
    correctAnswer: v.string(),
    points: v.number(),
    topic: v.optional(v.string()),
    subTopic: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    subject: v.optional(v.id("subjects")),
    grade: v.optional(v.number()),
    matchPairs: v.optional(v.array(v.object({ left: v.string(), right: v.string() }))),
    diagramUrl: v.optional(v.string()),
    questionTextZulu: v.optional(v.string()),
    questionTextAfrikaans: v.optional(v.string()),
    optionsZulu: v.optional(v.array(v.string())),
    optionsAfrikaans: v.optional(v.array(v.string())),
    correctAnswerZulu: v.optional(v.string()),
    correctAnswerAfrikaans: v.optional(v.string()),
    cognitiveLevel: v.optional(v.string()),
    calculationSteps: v.optional(v.array(v.string())),
    diagramHotspots: v.optional(v.array(v.object({ label: v.string(), x: v.number(), y: v.number() }))),
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

export const updateQuestion = mutation({
  args: {
    questionId: v.id("questionBank"),
    questionText: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal("MCQ"),
      v.literal("SHORT_ANSWER"),
      v.literal("ESSAY"),
      v.literal("TRUE_FALSE"),
      v.literal("FILL_BLANK"),
      v.literal("MATCH_COLUMN"),
      v.literal("CALCULATION"),
      v.literal("DIAGRAM_LABEL")
    )),
    options: v.optional(v.array(v.string())),
    correctAnswer: v.optional(v.string()),
    points: v.optional(v.number()),
    topic: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    questionTextZulu: v.optional(v.string()),
    questionTextAfrikaans: v.optional(v.string()),
    optionsZulu: v.optional(v.array(v.string())),
    optionsAfrikaans: v.optional(v.array(v.string())),
    correctAnswerZulu: v.optional(v.string()),
    correctAnswerAfrikaans: v.optional(v.string()),
    cognitiveLevel: v.optional(v.string()),
    calculationSteps: v.optional(v.array(v.string())),
    diagramHotspots: v.optional(v.array(v.object({ label: v.string(), x: v.number(), y: v.number() }))),
    tags: v.optional(v.array(v.string())),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const { questionId, ...updates } = args;
    const existing = await ctx.db.get(questionId);
    if (!existing) throw new Error("Question not found");
    if (existing.createdBy !== userId) throw new Error("Not authorized");

    await ctx.db.patch(questionId, updates);
    return { success: true };
  },
});

export const deleteQuestion = mutation({
  args: { questionId: v.id("questionBank") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const existing = await ctx.db.get(args.questionId);
    if (!existing) throw new Error("Question not found");
    if (existing.createdBy !== userId) throw new Error("Not authorized");

    await ctx.db.delete(args.questionId);
    return { success: true };
  },
});

export const incrementTimesUsed = mutation({
  args: { questionId: v.id("questionBank") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.questionId);
    if (!existing) return;

    await ctx.db.patch(args.questionId, {
      timesUsed: (existing.timesUsed || 0) + 1,
    });
  },
});
