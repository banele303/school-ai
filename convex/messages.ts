import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

// ─── CONVERSATIONS ─────────────────────────────────────────────

export const getConversations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const sent = await ctx.db
      .query("messages")
      .withIndex("by_sender", (q) => q.eq("sender", userId))
      .collect();

    const received = await ctx.db
      .query("messages")
      .withIndex("by_recipient_read", (q) => q.eq("recipient", userId))
      .collect();

    const contactIds = new Set<string>();
    [...sent, ...received].forEach((m) => {
      const other = m.sender === userId ? m.recipient : m.sender;
      contactIds.add(other);
    });

    const results = await Promise.all(
      Array.from(contactIds).map(async (contactId) => {
        const contact = await ctx.db.get(contactId as Id<"users">);
        const convId = [userId, contactId].sort().join("_");
        const lastMsg = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
          .order("desc")
          .first();
        const unread = await ctx.db
          .query("messages")
          .withIndex("by_recipient_read", (q) =>
            q.eq("recipient", userId).eq("isRead", false)
          )
          .filter((q) => q.eq(q.field("sender"), contactId as any))
          .collect();
        return { contact, lastMsg, unreadCount: unread.length };
      })
    );

    // Sort by last message time (most recent first)
    return results.sort((a, b) => {
      const aTime = a.lastMsg?._creationTime ?? 0;
      const bTime = b.lastMsg?._creationTime ?? 0;
      return bTime - aTime;
    });
  },
});

export const getConversationMessages = query({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const convId = [userId, args.otherUserId].sort().join("_");
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
      .order("asc")
      .collect();

    // Attach reactions to each message
    const withReactions = await Promise.all(
      messages.map(async (msg) => {
        const reactions = await ctx.db
          .query("messageReactions")
          .withIndex("by_message", (q) => q.eq("messageId", msg._id))
          .collect();

        // Attach replied-to message preview
        let replyToMsg = null;
        if (msg.replyTo) {
          replyToMsg = await ctx.db.get(msg.replyTo as Id<"messages">);
        }

        return {
          ...msg,
          reactions: reactions.map((r) => ({ userId: r.userId, emoji: r.emoji })),
          replyTo: replyToMsg ? { content: replyToMsg.content.substring(0, 100), sender: replyToMsg.sender } : null,
        };
      })
    );

    return withReactions;
  },
});

// ─── SEND MESSAGE ──────────────────────────────────────────────

export const sendMessage = mutation({
  args: {
    recipientId: v.id("users"),
    content: v.string(),
    subject: v.optional(v.string()),
    replyTo: v.optional(v.id("messages")),
    messageType: v.optional(v.string()),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    fileType: v.optional(v.string()),
    curriculumTopic: v.optional(v.string()),
    curriculumSubject: v.optional(v.string()),
    curriculumGrade: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const convId = [userId, args.recipientId].sort().join("_");

    const msgId = await ctx.db.insert("messages", {
      sender: userId,
      recipient: args.recipientId,
      content: args.content,
      subject: args.subject,
      replyTo: args.replyTo,
      messageType: (args.messageType as any) || "text",
      fileUrl: args.fileUrl,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileType: args.fileType,
      curriculumTopic: args.curriculumTopic,
      curriculumSubject: args.curriculumSubject,
      curriculumGrade: args.curriculumGrade,
      isRead: false,
      conversationId: convId,
    });

    // Notify recipient
    const sender = await ctx.db.get(userId);
    const preview = args.messageType === "file" ? "sent a file" :
      args.messageType === "image" ? "sent an image" :
      args.content.substring(0, 80) + (args.content.length > 80 ? "..." : "");

    await ctx.db.insert("notifications", {
      recipient: args.recipientId,
      title: `New message from ${sender?.name || "Someone"}`,
      message: preview,
      isRead: false,
      type: "message",
      link: `/messages`,
    });

    return msgId;
  },
});

// ─── READ RECEIPTS ─────────────────────────────────────────────

export const markConversationRead = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const unread = await ctx.db
      .query("messages")
      .withIndex("by_recipient_read", (q) =>
        q.eq("recipient", userId).eq("isRead", false)
      )
      .filter((q) => q.eq(q.field("sender"), args.otherUserId))
      .collect();
    await Promise.all(unread.map((m) => ctx.db.patch(m._id, { isRead: true })));
  },
});

// ─── GET MESSAGEABLE USERS ─────────────────────────────────────

export const getMessageableUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    const role = user?.role;

    let targetRoles: string[] = [];
    if (role === "admin") targetRoles = ["teacher", "student", "parent"];
    else if (role === "teacher") targetRoles = ["parent", "student", "admin"];
    else if (role === "parent") targetRoles = ["teacher", "admin"];
    else targetRoles = ["teacher", "admin"];

    const all = await ctx.db.query("users").collect();
    return all.filter(
      (u) => u._id !== userId && u.role && targetRoles.includes(u.role)
    );
  },
});

// ─── REACTIONS ─────────────────────────────────────────────────

export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("messageReactions")
      .withIndex("by_user_message", (q) =>
        q.eq("userId", userId).eq("messageId", args.messageId)
      )
      .filter((q) => q.eq(q.field("emoji"), args.emoji))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { action: "removed" };
    } else {
      await ctx.db.insert("messageReactions", {
        messageId: args.messageId,
        userId,
        emoji: args.emoji,
      });
      return { action: "added" };
    }
  },
});

// ─── SEARCH MESSAGES ───────────────────────────────────────────

export const searchMessages = query({
  args: {
    query: v.string(),
    otherUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let messagesToSearch;
    if (args.otherUserId) {
      const convId = [userId, args.otherUserId].sort().join("_");
      messagesToSearch = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
        .collect();
    } else {
      const sent = await ctx.db
        .query("messages")
        .withIndex("by_sender", (q) => q.eq("sender", userId))
        .collect();
      const received = await ctx.db
        .query("messages")
        .withIndex("by_recipient_read", (q) => q.eq("recipient", userId))
        .collect();
      messagesToSearch = [...sent, ...received];
    }

    const lowerQuery = args.query.toLowerCase();
    return messagesToSearch
      .filter((m) => m.content.toLowerCase().includes(lowerQuery))
      .slice(0, 50);
  },
});

// ─── CURRICULUM AI ASSISTANT ───────────────────────────────────

export const getCurriculumChatHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("curriculumChats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit ?? 20);
  },
});

export const saveCurriculumChat = mutation({
  args: {
    topic: v.string(),
    question: v.string(),
    answer: v.string(),
    subject: v.optional(v.string()),
    grade: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    return await ctx.db.insert("curriculumChats", {
      userId,
      topic: args.topic,
      question: args.question,
      answer: args.answer,
      subject: args.subject,
      grade: args.grade,
      createdAt: Date.now(),
    });
  },
});

// ─── GET USERS WITH ROLE INFO ──────────────────────────────────

export const getUserProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      role: user.role,
      email: user.email,
      image: user.image,
      isActive: user.isActive,
    };
  },
});
