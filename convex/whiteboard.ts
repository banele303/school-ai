// Convex actions for collaborative whiteboard
import { httpAction, query } from "convex/server";
import { v } from "convex/values";

// Create a new whiteboard
export const createWhiteboard = httpAction(async (ctx, { title, content, sharedWith }) => {
  const user = await ctx.auth.getUserIdentity();
  if (!user) throw new Error("Unauthenticated");
  const now = Date.now();
  const id = await ctx.db.insert("whiteboards", {
    ownerId: user.id,
    title,
    content: JSON.stringify(content ?? {}),
    sharedWith: sharedWith ?? [],
    createdAt: now,
    updatedAt: now,
  });
  return { id };
}, {
  args: {
    title: v.string(),
    content: v.optional(v.any()),
    sharedWith: v.optional(v.array(v.id("users"))),
  },
});

// Update board content or sharing list
export const updateWhiteboard = httpAction(async (ctx, { id, content, sharedWith }) => {
  const user = await ctx.auth.getUserIdentity();
  if (!user) throw new Error("Unauthenticated");
  const board = await ctx.db.get(id);
  if (!board) throw new Error("Board not found");
  if (board.ownerId !== user.id && !(board.sharedWith?.includes(user.id))) {
    throw new Error("Permission denied");
  }
  const updates: any = { updatedAt: Date.now() };
  if (content !== undefined) updates.content = JSON.stringify(content);
  if (sharedWith !== undefined) updates.sharedWith = sharedWith;
  await ctx.db.patch(id, updates);
  return { success: true };
}, {
  args: {
    id: v.id("whiteboards"),
    content: v.optional(v.any()),
    sharedWith: v.optional(v.array(v.id("users"))),
  },
});

// Get a whiteboard (owner or shared)
export const getWhiteboard = query(async (ctx, { id }) => {
  const user = await ctx.auth.getUserIdentity();
  if (!user) throw new Error("Unauthenticated");
  const board = await ctx.db.get(id);
  if (!board) throw new Error("Board not found");
  if (board.ownerId !== user.id && !(board.sharedWith?.includes(user.id))) {
    throw new Error("Permission denied");
  }
  return board;
}, {
  args: { id: v.id("whiteboards") },
});

// List boards owned or shared with the user
export const listUserWhiteboards = query(async (ctx) => {
  const user = await ctx.auth.getUserIdentity();
  if (!user) throw new Error("Unauthenticated");
  const owned = await ctx.db.query("whiteboards").filter((q) => q.eq(q.field("ownerId"), user.id)).collect();
  const shared = await ctx.db.query("whiteboards").filter((q) => q.arrayContains(q.field("sharedWith"), user.id)).collect();
  return [...owned, ...shared];
});
