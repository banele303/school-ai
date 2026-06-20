import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const canAccess = (board: { ownerId: string; sharedWith?: string[] }, userId: string) =>
  board.ownerId === userId || (board.sharedWith ?? []).includes(userId);

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const owned = await ctx.db
      .query("whiteboards")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    const shared = (await ctx.db.query("whiteboards").collect()).filter((board) =>
      (board.sharedWith ?? []).includes(userId)
    );

    return [...owned, ...shared].sort(
      (a, b) => (b.updatedAt ?? b._creationTime) - (a.updatedAt ?? a._creationTime)
    );
  },
});

export const create = mutation({
  args: {
    title: v.optional(v.string()),
    name: v.optional(v.string()),
    content: v.optional(v.string()),
    sharedWith: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const now = Date.now();
    return await ctx.db.insert("whiteboards", {
      ownerId: userId,
      title: args.title ?? args.name ?? "Untitled Board",
      content: args.content ?? "",
      sharedWith: args.sharedWith ?? [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const get = query({
  args: { id: v.id("whiteboards") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const board = await ctx.db.get(args.id);
    if (!board) return null;
    if (!canAccess(board, userId)) throw new Error("Unauthorized");

    return board;
  },
});

export const update = mutation({
  args: {
    id: v.id("whiteboards"),
    title: v.optional(v.string()),
    name: v.optional(v.string()),
    content: v.optional(v.string()),
    sharedWith: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const board = await ctx.db.get(args.id);
    if (!board) throw new Error("Whiteboard not found");
    if (!canAccess(board, userId)) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, {
      ...(args.title !== undefined || args.name !== undefined
        ? { title: args.title ?? args.name }
        : {}),
      ...(args.content !== undefined ? { content: args.content } : {}),
      ...(args.sharedWith !== undefined ? { sharedWith: args.sharedWith } : {}),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
