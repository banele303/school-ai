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
    streamInputId: v.optional(v.string()),
    whipUrl: v.optional(v.string()),
    whepUrl: v.optional(v.string()),
    rtmpsUrl: v.optional(v.string()),
    streamKey: v.optional(v.string()),
    srtUrl: v.optional(v.string()),
    srtStreamId: v.optional(v.string()),
    srtPassphrase: v.optional(v.string()),
    streamVideoUid: v.optional(v.string()),
    playbackUrl: v.optional(v.string()),
    roomId: v.optional(v.string()),
    accessMode: v.optional(v.union(
      v.literal("school-only"),
      v.literal("school-and-public"),
      v.literal("public-support")
    )),
    resourceUrls: v.optional(v.array(v.string())),
    lessonPlan: v.optional(v.string()),
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
      streamInputId: args.streamInputId,
      whipUrl: args.whipUrl,
      whepUrl: args.whepUrl,
      rtmpsUrl: args.rtmpsUrl,
      streamKey: args.streamKey,
      srtUrl: args.srtUrl,
      srtStreamId: args.srtStreamId,
      srtPassphrase: args.srtPassphrase,
      streamVideoUid: args.streamVideoUid,
      playbackUrl: args.playbackUrl,
      roomId: args.roomId || crypto.randomUUID(),
      accessMode: args.accessMode || "school-and-public",
      resourceUrls: args.resourceUrls,
      lessonPlan: args.lessonPlan,
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

export const startNativeLiveClass = mutation({
  args: {
    liveClassId: v.id("liveClasses"),
    streamInputId: v.optional(v.string()),
    whipUrl: v.optional(v.string()),
    whepUrl: v.optional(v.string()),
    rtmpsUrl: v.optional(v.string()),
    streamKey: v.optional(v.string()),
    srtUrl: v.optional(v.string()),
    srtStreamId: v.optional(v.string()),
    srtPassphrase: v.optional(v.string()),
    playbackUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (user?.role !== "teacher" && user?.role !== "admin") {
      throw new Error("Only teachers and admins can start live classes");
    }

    const liveClass = await ctx.db.get(args.liveClassId);
    if (!liveClass) throw new Error("Live class not found");

    if (liveClass.teacher !== userId && user?.role !== "admin") {
      throw new Error("Unauthorized: you are not the teacher of this class");
    }

    await ctx.db.patch(args.liveClassId, {
      status: "live",
      streamInputId: args.streamInputId || liveClass.streamInputId,
      whipUrl: args.whipUrl || liveClass.whipUrl,
      whepUrl: args.whepUrl || liveClass.whepUrl,
      rtmpsUrl: args.rtmpsUrl || liveClass.rtmpsUrl,
      streamKey: args.streamKey || liveClass.streamKey,
      srtUrl: args.srtUrl || liveClass.srtUrl,
      srtStreamId: args.srtStreamId || liveClass.srtStreamId,
      srtPassphrase: args.srtPassphrase || liveClass.srtPassphrase,
      playbackUrl: args.playbackUrl || liveClass.playbackUrl,
    });

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

    const chatMessages = await ctx.db
      .query("liveClassChatMessages")
      .withIndex("by_class", (q) => q.eq("liveClass", args.liveClassId))
      .collect();

    for (const message of chatMessages) {
      await ctx.db.delete(message._id);
    }

    const raisedHands = await ctx.db
      .query("liveClassRaisedHands")
      .withIndex("by_class", (q) => q.eq("liveClass", args.liveClassId))
      .collect();

    for (const hand of raisedHands) {
      await ctx.db.delete(hand._id);
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
    const studentGrade = await userPreferences_grade(userId, ctx);

    const upcoming = allClasses.filter((c) => {
      // Class is assigned to student's class
      if (c.class && c.class === studentClassId) return true;
      // No class restriction and grade matches or no grade restriction
      if (!c.class) {
        if (!c.targetGrades || c.targetGrades.length === 0) return true;
        return studentGrade ? c.targetGrades.includes(studentGrade) : false;
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

export const getLiveChatMessages = query({
  args: { liveClassId: v.id("liveClasses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const messages = await ctx.db
      .query("liveClassChatMessages")
      .withIndex("by_class", (q) => q.eq("liveClass", args.liveClassId))
      .collect();

    messages.sort((a, b) => a.createdAt - b.createdAt);
    return messages;
  },
});

export const sendLiveChatMessage = mutation({
  args: {
    liveClassId: v.id("liveClasses"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const liveClass = await ctx.db.get(args.liveClassId);
    if (!liveClass) throw new Error("Live class not found");
    if (liveClass.status === "ended" || liveClass.status === "cancelled") {
      throw new Error("This class is closed");
    }

    const content = args.content.trim();
    if (!content) throw new Error("Message cannot be empty");
    if (content.length > 1000) throw new Error("Message is too long");

    const user = await ctx.db.get(userId);
    return await ctx.db.insert("liveClassChatMessages", {
      liveClass: args.liveClassId,
      sender: userId,
      senderName: user?.name || user?.email || "Learner",
      senderRole: user?.role,
      content,
      createdAt: Date.now(),
    });
  },
});

export const getRaisedHands = query({
  args: { liveClassId: v.id("liveClasses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const hands = await ctx.db
      .query("liveClassRaisedHands")
      .withIndex("by_class", (q) => q.eq("liveClass", args.liveClassId))
      .collect();

    hands.sort((a, b) => a.raisedAt - b.raisedAt);
    return hands.map((hand) => ({
      ...hand,
      studentId: hand.student,
    }));
  },
});

export const toggleRaiseHand = mutation({
  args: { liveClassId: v.id("liveClasses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (user?.role === "teacher" || user?.role === "admin") {
      throw new Error("Only students can raise hands");
    }

    const liveClass = await ctx.db.get(args.liveClassId);
    if (!liveClass) throw new Error("Live class not found");
    if (liveClass.status !== "live") {
      throw new Error("Hands can only be raised while the class is live");
    }

    const existing = await ctx.db
      .query("liveClassRaisedHands")
      .withIndex("by_student_class", (q) =>
        q.eq("student", userId).eq("liveClass", args.liveClassId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { raised: false };
    }

    await ctx.db.insert("liveClassRaisedHands", {
      liveClass: args.liveClassId,
      student: userId,
      studentName: user?.name || user?.email || "Learner",
      raisedAt: Date.now(),
    });

    return { raised: true };
  },
});

export const lowerStudentHand = mutation({
  args: {
    liveClassId: v.id("liveClasses"),
    studentId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    const liveClass = await ctx.db.get(args.liveClassId);
    if (!liveClass) throw new Error("Live class not found");

    const isTeacher = user?.role === "teacher" || user?.role === "admin";
    if (!isTeacher && args.studentId !== userId) {
      throw new Error("Unauthorized");
    }
    if (isTeacher && liveClass.teacher !== userId && user?.role !== "admin") {
      throw new Error("Unauthorized: you are not the teacher of this class");
    }

    const existing = await ctx.db
      .query("liveClassRaisedHands")
      .withIndex("by_student_class", (q) =>
        q.eq("student", args.studentId).eq("liveClass", args.liveClassId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
});
