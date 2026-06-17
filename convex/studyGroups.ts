import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── GET ALL PUBLIC GROUPS ──────────────────────────────────────

export const getAllGroups = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const groups = await ctx.db.query("studyGroups").collect();
    // Return public groups + private groups the user is a member of
    return groups.filter((g) => !g.isPrivate || g.members.includes(userId));
  },
});

// ─── GET MY GROUPS ──────────────────────────────────────────────

export const getMyGroups = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const allGroups = await ctx.db.query("studyGroups").collect();
    return allGroups.filter((g) => g.members.includes(userId));
  },
});

// ─── CREATE GROUP ───────────────────────────────────────────────

export const createGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    subject: v.optional(v.id("subjects")),
    grade: v.optional(v.number()),
    maxMembers: v.number(),
    isPrivate: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const groupId = await ctx.db.insert("studyGroups", {
      name: args.name,
      description: args.description,
      subject: args.subject!,
      creator: userId,
      members: [userId],
      maxMembers: args.maxMembers,
      isPrivate: args.isPrivate,
      inviteCode: args.isPrivate
        ? Math.random().toString(36).substring(2, 8).toUpperCase()
        : undefined,
      grade: args.grade,
    });

    return groupId;
  },
});

// ─── JOIN GROUP ─────────────────────────────────────────────────

export const joinGroup = mutation({
  args: { groupId: v.id("studyGroups") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    if (group.members.includes(userId)) throw new Error("Already a member");
    if (group.members.length >= group.maxMembers) throw new Error("Group is full");

    await ctx.db.patch(args.groupId, {
      members: [...group.members, userId],
    });

    return { success: true };
  },
});

// ─── LEAVE GROUP ────────────────────────────────────────────────

export const leaveGroup = mutation({
  args: { groupId: v.id("studyGroups") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");

    await ctx.db.patch(args.groupId, {
      members: group.members.filter((m) => m !== userId),
    });

    return { success: true };
  },
});

// ─── GET MESSAGES ───────────────────────────────────────────────

export const getMessages = query({
  args: { groupId: v.id("studyGroups") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const group = await ctx.db.get(args.groupId);
    if (!group) return [];
    if (!group.members.includes(userId)) return [];

    const messages = await ctx.db
      .query("studyGroupMessages")
      .withIndex("by_group", (q) => q.eq("group", args.groupId))
      .collect();

    // Enrich with sender names
    return await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.sender);
        return { ...msg, senderName: sender?.name || "Unknown" };
      })
    );
  },
});

// ─── SEND MESSAGE ───────────────────────────────────────────────

export const sendMessage = mutation({
  args: {
    groupId: v.id("studyGroups"),
    content: v.string(),
    attachmentUrl: v.optional(v.string()),
    attachmentName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    if (!group.members.includes(userId)) throw new Error("Not a member");

    const msgId = await ctx.db.insert("studyGroupMessages", {
      group: args.groupId,
      sender: userId,
      content: args.content,
      isPinned: false,
      attachmentUrl: args.attachmentUrl,
      attachmentName: args.attachmentName,
    });

    return msgId;
  },
});
