import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const makeArenaCode = () => `BATTLE-${Math.floor(100 + Math.random() * 900)}`;

const getUserName = (user: any) =>
  user?.name || user?.email?.split("@")[0] || "Learner";

export const createArena = mutation({
  args: {
    examId: v.id("exams"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Unauthorized");

    const exam = await ctx.db.get(args.examId);
    if (!exam) throw new Error("Exam not found");
    if (user.role !== "admin" && exam.teacher !== userId) {
      throw new Error("Only the teacher or an admin can host this arena");
    }

    let code = makeArenaCode();
    for (let i = 0; i < 5; i++) {
      const existing = await (ctx.db as any)
        .query("examArenas")
        .withIndex("by_code", (q: any) => q.eq("code", code))
        .unique();
      if (!existing) break;
      code = makeArenaCode();
    }

    const arenaId = await (ctx.db as any).insert("examArenas", {
      exam: args.examId,
      status: "waiting",
      code,
      host: userId,
      duration: exam.duration,
      participants: [
        {
          studentId: userId,
          name: getUserName(user),
          avatar: user.image,
          progress: 0,
          score: 0,
        },
      ],
    });

    return { arenaId, code };
  },
});

export const joinArena = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Unauthorized");

    const arena = await (ctx.db as any)
      .query("examArenas")
      .withIndex("by_code", (q: any) => q.eq("code", args.code.trim().toUpperCase()))
      .unique();
    if (!arena) throw new Error("Arena not found");
    if (arena.status !== "waiting") throw new Error("This arena has already started");

    const alreadyJoined = arena.participants.some((p: any) => p.studentId === userId);
    if (!alreadyJoined) {
      await (ctx.db as any).patch(arena._id, {
        participants: [
          ...arena.participants,
          {
            studentId: userId,
            name: getUserName(user),
            avatar: user.image,
            progress: 0,
            score: 0,
          },
        ],
      });
    }

    return { arenaId: arena._id, examId: arena.exam };
  },
});

export const startArena = mutation({
  args: { arenaId: v.id("examArenas" as any) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const arena = await (ctx.db as any).get(args.arenaId);
    if (!arena) throw new Error("Arena not found");
    if (arena.host !== userId) throw new Error("Only the host can start the arena");

    await (ctx.db as any).patch(args.arenaId, {
      status: "active",
      startedAt: Date.now(),
    });

    return { examId: arena.exam };
  },
});

export const updateArenaProgress = mutation({
  args: {
    arenaId: v.id("examArenas" as any),
    progress: v.number(),
    score: v.optional(v.number()),
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const arena = await (ctx.db as any).get(args.arenaId);
    if (!arena) throw new Error("Arena not found");

    const participants = arena.participants.map((participant: any) => {
      if (participant.studentId !== userId) return participant;
      return {
        ...participant,
        progress: Math.max(participant.progress, args.progress),
        score: args.score ?? participant.score,
        completedAt: args.completed ? Date.now() : participant.completedAt,
      };
    });

    const allComplete = participants.length > 0 && participants.every((p: any) => p.completedAt);

    await (ctx.db as any).patch(args.arenaId, {
      participants,
      status: allComplete ? "completed" : arena.status,
    });
  },
});

export const getArena = query({
  args: { arenaId: v.id("examArenas" as any) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const arena = await (ctx.db as any).get(args.arenaId);
    if (!arena) return null;

    const exam = await ctx.db.get(arena.exam);
    return { ...arena, examDetails: exam };
  },
});

export const getArenaByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const arena = await (ctx.db as any)
      .query("examArenas")
      .withIndex("by_code", (q: any) => q.eq("code", args.code.trim().toUpperCase()))
      .unique();
    if (!arena) return null;

    const exam = await ctx.db.get(arena.exam);
    return { ...arena, examDetails: exam };
  },
});

export const getActiveArenas = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const arenas = await (ctx.db as any)
      .query("examArenas")
      .withIndex("by_status", (q: any) => q.eq("status", "waiting"))
      .collect();

    return await Promise.all(
      arenas.map(async (arena: any) => ({
        ...arena,
        examDetails: await ctx.db.get(arena.exam),
      }))
    );
  },
});
