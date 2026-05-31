import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── CREATE LIVE CLASS ──────────────────────────────────────────────────────

export const createLiveClass = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    subject: v.id("subjects"),
    class: v.optional(v.id("classes")),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    platform: v.string(),
    joinUrl: v.string(),
    recordingUrl: v.optional(v.string()),
    targetGrades: v.optional(v.array(v.number())),
    maxParticipants: v.optional(v.number()),
    notifyEnrolled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (user?.role !== "teacher" && user?.role !== "admin") {
      throw new Error("Only teachers and admins can create live classes");
    }

    const classId = await ctx.db.insert("liveClasses", {
      title: args.title,
      description: args.description,
      subject: args.subject,
      class: args.class,
      teacher: userId,
      startTime: args.startTime,
      endTime: args.endTime,
      platform: args.platform,
      joinUrl: args.joinUrl,
      recordingUrl: args.recordingUrl,
      status: "scheduled",
      targetGrades: args.targetGrades,
      maxParticipants: args.maxParticipants,
      notifyEnrolled: args.notifyEnrolled ?? false,
    });

    return classId;
  },
});

// ─── GET LIVE CLASSES (with optional filters) ───────────────────────────────

export const getLiveClasses = query({
  args: {
    subject: v.optional(v.id("subjects")),
    grade: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("scheduled"),
        v.literal("live"),
        v.literal("ended"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let results;

    if (args.status) {
      results = await ctx.db
        .query("liveClasses")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else if (args.subject) {
      results = await ctx.db
        .query("liveClasses")
        .withIndex("by_subject", (q) => q.eq("subject", args.subject!))
        .collect();
    } else {
      results = await ctx.db
        .query("liveClasses")
        .withIndex("by_start_time", (q) => q)
        .collect();
    }

    if (args.subject && args.status) {
      results = results.filter((c) => c.subject === args.subject);
    }
    if (args.grade) {
      results = results.filter(
        (c) =>
          !c.targetGrades ||
          c.targetGrades.length === 0 ||
          c.targetGrades.includes(args.grade!)
      );
    }

    // Sort by start time ascending
    results.sort((a, b) => a.startTime - b.startTime);

    return results;
  },
});

// ─── GET TEACHER LIVE CLASSES ────────────────────────────────────────────────

export const getTeacherLiveClasses = query({
  args: { teacherId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    const targetTeacherId = args.teacherId || userId;

    // If requesting another teacher's classes, must be admin
    if (args.teacherId && args.teacherId !== userId && user?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const classes = await ctx.db
      .query("liveClasses")
      .withIndex("by_teacher", (q) => q.eq("teacher", targetTeacherId))
      .collect();

    classes.sort((a, b) => a.startTime - b.startTime);
    return classes;
  },
});

// ─── UPDATE LIVE CLASS STATUS ────────────────────────────────────────────────

export const updateLiveClassStatus = mutation({
  args: {
    liveClassId: v.id("liveClasses"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("live"),
      v.literal("ended"),
      v.literal("cancelled")
    ),
    recordingUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (user?.role !== "teacher" && user?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const liveClass = await ctx.db.get(args.liveClassId);
    if (!liveClass) throw new Error("Live class not found");

    // Only the teacher who created the class or admin can update
    if (liveClass.teacher !== userId && user?.role !== "admin") {
      throw new Error("Unauthorized: you are not the teacher of this class");
    }

    const updates: Record<string, any> = { status: args.status };
    if (args.recordingUrl !== undefined) {
      updates.recordingUrl = args.recordingUrl;
    }
    if (args.status === "ended" && !liveClass.endTime) {
      updates.endTime = Date.now();
    }

    await ctx.db.patch(args.liveClassId, updates);
    return { success: true };
  },
});

// ─── DELETE LIVE CLASS ───────────────────────────────────────────────────────

export const deleteLiveClass = mutation({
  args: { liveClassId: v.id("liveClasses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    const liveClass = await ctx.db.get(args.liveClassId);
    if (!liveClass) throw new Error("Live class not found");

    if (liveClass.teacher !== userId && user?.role !== "admin") {
      throw new Error("Unauthorized: you are not the teacher of this class");
    }

    // Delete attendance records first
    const attendanceRecords = await ctx.db
      .query("liveClassAttendance")
      .withIndex("by_class", (q) => q.eq("liveClass", args.liveClassId))
      .collect();

    for (const record of attendanceRecords) {
      await ctx.db.delete(record._id);
    }

    await ctx.db.delete(args.liveClassId);
    return { success: true };
  },
});

// ─── JOIN LIVE CLASS (student attendance) ────────────────────────────────────

export const joinLiveClass = mutation({
  args: { liveClassId: v.id("liveClasses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (user?.role !== "student") {
      throw new Error("Only students can join live classes");
    }

    const liveClass = await ctx.db.get(args.liveClassId);
    if (!liveClass) throw new Error("Live class not found");

    if (liveClass.status === "ended" || liveClass.status === "cancelled") {
      throw new Error("This class has already ended or was cancelled");
    }

    // Check if already joined
    const existing = await ctx.db
      .query("liveClassAttendance")
      .withIndex("by_class", (q) => q.eq("liveClass", args.liveClassId))
      .filter((q) => q.eq(q.field("student"), userId))
      .first();

    if (existing) {
      return existing._id;
    }

    const attendanceId = await ctx.db.insert("liveClassAttendance", {
      liveClass: args.liveClassId,
      student: userId,
      joinedAt: Date.now(),
      leftAt: undefined,
      duration: undefined,
      watchPercentage: undefined,
    });

    return attendanceId;
  },
});

// ─── GET UPCOMING CLASSES FOR STUDENT ────────────────────────────────────────

export const getUpcomingClassesForStudent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (user?.role !== "student") return [];

    const now = Date.now();

    // Get all scheduled/live classes starting in the future
    const allClasses = await ctx.db
      .query("liveClasses")
      .withIndex("by_start_time", (q) => q.gte("startTime", now))
      .collect();

    // Filter by student's class or grade
    const studentClassId = user.studentClass;
    const studentGrade = userPreferences_grade(userId, ctx);

    const upcoming = allClasses.filter((c) => {
      // Class is assigned to student's class
      if (c.class && c.class === studentClassId) return true;
      // No class restriction and grade matches or no grade restriction
      if (!c.class) {
        if (!c.targetGrades || c.targetGrades.length === 0) return true;
        // We'll include all with matching target grades checked at query time
        return true;
      }
      return false;
    });

    upcoming.sort((a, b) => a.startTime - b.startTime);
    return upcoming;
  },
});

// Helper to get student grade from userPreferences (not directly on users table)
async function userPreferences_grade(
  userId: any,
  ctx: any
): Promise<number | undefined> {
  const prefs = await ctx.db
    .query("userPreferences")
    .withIndex("by_student", (q: any) => q.eq("student", userId))
    .first();
  return prefs?.grade;
}
