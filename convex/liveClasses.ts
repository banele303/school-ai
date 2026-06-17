declare const process: { env: Record<string, string | undefined> };
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

// ─── WAITING ROOM (APPROVALS) ───────────────────────────────────────────────

export const requestJoinClass = mutation({
  args: { liveClassId: v.id("liveClasses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    // Check if a request already exists
    const existing = await ctx.db
      .query("liveClassApprovals")
      .withIndex("by_class_and_student", (q) =>
        q.eq("liveClassId", args.liveClassId).eq("studentId", userId)
      )
      .first();

    if (existing) {
      return existing; // Already requested or approved
    }

    const id = await ctx.db.insert("liveClassApprovals", {
      liveClassId: args.liveClassId,
      studentId: userId,
      status: "pending",
      requestedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

export const getApprovalStatus = query({
  args: { liveClassId: v.id("liveClasses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("liveClassApprovals")
      .withIndex("by_class_and_student", (q) =>
        q.eq("liveClassId", args.liveClassId).eq("studentId", userId)
      )
      .first();
  },
});

export const getPendingApprovals = query({
  args: { liveClassId: v.id("liveClasses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const classItem = await ctx.db.get(args.liveClassId);
    // Only teacher or admin can view pending approvals
    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "admin" && classItem?.teacher !== userId)) {
      return [];
    }

    const requests = await ctx.db
      .query("liveClassApprovals")
      .withIndex("by_class_and_status", (q) =>
        q.eq("liveClassId", args.liveClassId).eq("status", "pending")
      )
      .collect();

    // Attach student names
    const withNames = await Promise.all(
      requests.map(async (req) => {
        const student = await ctx.db.get(req.studentId);
        return {
          ...req,
          studentName: student?.name || student?.email || "Unknown",
        };
      })
    );

    return withNames.sort((a, b) => a.requestedAt - b.requestedAt);
  },
});

export const approveStudent = mutation({
  args: { approvalId: v.id("liveClassApprovals"), status: v.union(v.literal("approved"), v.literal("denied")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const approval = await ctx.db.get(args.approvalId);
    if (!approval) throw new Error("Approval request not found");

    const classItem = await ctx.db.get(approval.liveClassId);
    const user = await ctx.db.get(userId);

    if (!user || (user.role !== "admin" && classItem?.teacher !== userId)) {
      throw new Error("Only the teacher or admin can approve students");
    }

    await ctx.db.patch(args.approvalId, { status: args.status });
  },
});

// ─── REACTIONS (EMOJIS) ─────────────────────────────────────────────────────

export const sendReaction = mutation({
  args: { liveClassId: v.id("liveClasses"), type: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    await ctx.db.insert("liveClassReactions", {
      liveClassId: args.liveClassId,
      studentId: userId,
      type: args.type,
      timestamp: Date.now(),
    });
  },
});

export const getRecentReactions = query({
  args: { liveClassId: v.id("liveClasses") },
  handler: async (ctx, args) => {
    // Return reactions from the last 10 seconds to create the floating effect
    const tenSecondsAgo = Date.now() - 10000;

    const reactions = await ctx.db
      .query("liveClassReactions")
      .withIndex("by_class_and_time", (q) =>
        q.eq("liveClassId", args.liveClassId).gt("timestamp", tenSecondsAgo)
      )
      .collect();

    return reactions;
  },
});

// ─── LIVE CHAT MESSAGES ─────────────────────────────────────────────────

export const getLiveChatMessages = query({
  args: { liveClassId: v.id("liveClasses") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("liveChatMessages")
      .withIndex("by_live_class", (q) => q.eq("liveClassId", args.liveClassId))
      .collect();
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

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    await ctx.db.insert("liveChatMessages", {
      liveClassId: args.liveClassId,
      senderId: userId,
      senderName: user.name || "Unknown",
      senderRole: user.role || "student",
      content: args.content,
    });
  },
});

// ─── RAISED HANDS ────────────────────────────────────────────────────────

export const getRaisedHands = query({
  args: { liveClassId: v.id("liveClasses") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("liveRaisedHands")
      .withIndex("by_live_class", (q) => q.eq("liveClassId", args.liveClassId))
      .collect();
  },
});

export const toggleRaiseHand = mutation({
  args: { liveClassId: v.id("liveClasses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("liveRaisedHands")
      .withIndex("by_student_class", (q) =>
        q.eq("studentId", userId).eq("liveClassId", args.liveClassId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { raised: false };
    }

    const user = await ctx.db.get(userId);
    await ctx.db.insert("liveRaisedHands", {
      liveClassId: args.liveClassId,
      studentId: userId,
      studentName: user?.name || "Unknown",
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
    const existing = await ctx.db
      .query("liveRaisedHands")
      .withIndex("by_student_class", (q) =>
        q.eq("studentId", args.studentId).eq("liveClassId", args.liveClassId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// ─── NATIVE LIVE CLASS (STREAMING) ──────────────────────────────────────

export const startNativeLiveClass = mutation({
  args: {
    liveClassId: v.id("liveClasses"),
    rtmpsUrl: v.optional(v.string()),
    streamKey: v.optional(v.string()),
    srtUrl: v.optional(v.string()),
    srtStreamId: v.optional(v.string()),
    srtPassphrase: v.optional(v.string()),
    playbackUrl: v.optional(v.string()),
    streamInputId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const liveClass = await ctx.db.get(args.liveClassId);
    if (!liveClass) throw new Error("Live class not found");

    await ctx.db.patch(args.liveClassId, {
      status: "live",
      streamInputId: args.streamInputId || liveClass.streamInputId,
      playbackUrl: args.playbackUrl || liveClass.playbackUrl,
      rtmpsUrl: args.rtmpsUrl || (liveClass as any).rtmpsUrl,
      streamKey: args.streamKey || (liveClass as any).streamKey,
      srtUrl: args.srtUrl || (liveClass as any).srtUrl,
      srtStreamId: args.srtStreamId || (liveClass as any).srtStreamId,
      srtPassphrase: args.srtPassphrase || (liveClass as any).srtPassphrase,
      startTime: liveClass.startTime || Date.now(),
    });
  },
});

// ─── SEARCH USERS & CLASSES (FOR INVITE) ────────────────────────────────

export const searchUsersAndClasses = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const lower = args.query.toLowerCase();

    const users = await ctx.db.query("users").collect();
    const filteredUsers = users.filter(
      (u) =>
        u.name?.toLowerCase().includes(lower) ||
        u.email?.toLowerCase().includes(lower)
    );

    const classes = await ctx.db.query("classes").collect();
    const filteredClasses = classes.filter((c) =>
      c.name.toLowerCase().includes(lower)
    );

    return {
      users: filteredUsers.map((u) => ({
        _id: u._id,
        name: u.name || u.email || "Unknown",
        email: u.email,
        role: u.role,
      })),
      classes: filteredClasses.map((c) => ({
        _id: c._id,
        name: c.name,
      })),
    };
  },
});

// ─── INVITE TO LIVE CLASS ───────────────────────────────────────────────

export const inviteToLiveClass = mutation({
  args: {
    liveClassId: v.id("liveClasses"),
    invitedUsers: v.array(v.id("users")),
    invitedClasses: v.array(v.id("classes")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    await ctx.db.patch(args.liveClassId, {
      invitedUsers: args.invitedUsers as any,
      invitedClasses: args.invitedClasses as any,
    });

    for (const invitedUserId of args.invitedUsers) {
      await ctx.db.insert("notifications", {
        recipient: invitedUserId,
        title: "You've been invited to a live class!",
        message: "A teacher has invited you to join their live class.",
        isRead: false,
        type: "message",
        link: `/lives/room/${args.liveClassId}`,
      });
    }

    return { success: true };
  },
});
