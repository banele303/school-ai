import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getEvents = query({
  args: {
    month: v.optional(v.string()), // "2025-11"
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("events").withIndex("by_date");
    if (args.month) {
      q = q.filter((q) => q.gte(q.field("date"), args.month + "-01"))
           .filter((q) => q.lt(q.field("date"), args.month + "-32"));
    }
    const events = await q.order("asc").collect();
    return await Promise.all(
      events.map(async (e) => ({
        ...e,
        createdBy: await ctx.db.get(e.createdBy),
      }))
    );
  },
});

export const getUpcomingEvents = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];
    return await ctx.db
      .query("events")
      .withIndex("by_date", (q) => q.gte("date", today))
      .take(5);
  },
});

export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    endDate: v.optional(v.string()),
    type: v.union(
      v.literal("exam"),
      v.literal("sports"),
      v.literal("holiday"),
      v.literal("meeting"),
      v.literal("other")
    ),
    targetRoles: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin" && user?.role !== "teacher") throw new Error("Unauthorized");
    return await ctx.db.insert("events", { ...args, createdBy: userId });
  },
});

export const deleteEvent = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin" && user?.role !== "teacher") throw new Error("Unauthorized");
    await ctx.db.delete(args.id);
  },
});
