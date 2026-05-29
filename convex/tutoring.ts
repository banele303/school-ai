import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── GET OPEN REQUESTS ──────────────────────────────────────────

export const getOpenRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("tutoringRequests")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();
  },
});

// ─── GET MY REQUESTS ────────────────────────────────────────────

export const getMyRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("tutoringRequests")
      .filter((q) => q.eq(q.field("student"), userId))
      .collect();
  },
});

// ─── CREATE REQUEST ─────────────────────────────────────────────

export const createRequest = mutation({
  args: {
    subject: v.id("subjects"),
    topic: v.string(),
    description: v.string(),
    grade: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (user?.role !== "student") throw new Error("Only students can request tutoring");

    const requestId = await ctx.db.insert("tutoringRequests", {
      student: userId,
      subject: args.subject,
      topic: args.topic,
      description: args.description,
      status: "open",
      matchedTutor: undefined,
      grade: args.grade,
    });

    return requestId;
  },
});

// ─── ACCEPT REQUEST (become tutor) ──────────────────────────────

export const acceptRequest = mutation({
  args: { requestId: v.id("tutoringRequests") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (user?.role !== "student") throw new Error("Only students can become tutors");

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.status !== "open") throw new Error("Request is no longer open");
    if (request.student === userId) throw new Error("Cannot tutor your own request");

    await ctx.db.patch(args.requestId, {
      status: "matched",
      matchedTutor: userId,
    });

    return { success: true };
  },
});

// ─── CLOSE REQUEST ──────────────────────────────────────────────

export const closeRequest = mutation({
  args: { requestId: v.id("tutoringRequests") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.student !== userId) throw new Error("Only the student who created this request can close it");

    await ctx.db.patch(args.requestId, { status: "closed" });
    return { success: true };
  },
});
