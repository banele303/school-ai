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
    invitedUsers: v.optional(v.array(v.id("users"))),
    invitedClasses: v.optional(v.array(v.id("classes"))),
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
      invitedUsers: args.invitedUsers || [],
      invitedClasses: args.invitedClasses || [],
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

    const user = await ctx.db.get(userId);

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

    // Filter private classes & restrict by grade for students
    if (user?.role === "student") {
      const studentClassId = user.studentClass;
      const studentGrade = await userPreferences_grade(userId, ctx);
      results = results.filter((c) => {
        if (c.accessMode === "school-only") {
          const isUserInvited = c.invitedUsers?.includes(userId) ?? false;
          const isClassAssigned = Boolean(c.class && c.class === studentClassId);
          const isClassInvited = Boolean(studentClassId && (c.invitedClasses?.includes(studentClassId) ?? false));
          const isGradeMatching = Boolean(studentGrade && c.targetGrades?.includes(studentGrade));
          
          // If specific class/users are designated for school-only, require match; otherwise allow for school students
          if ((c.class || (c.invitedClasses && c.invitedClasses.length > 0) || (c.invitedUsers && c.invitedUsers.length > 0)) &&
              !isUserInvited && !isClassAssigned && !isClassInvited && !isGradeMatching) {
            return false;
          }
        }
        
        // Filter by grade only if student's grade is resolved and targetGrades is specified
        if (c.targetGrades && c.targetGrades.length > 0 && studentGrade !== undefined) {
          const isClassInvited = Boolean(studentClassId && (c.invitedClasses?.includes(studentClassId) ?? false));
          const isUserInvited = c.invitedUsers?.includes(userId) ?? false;
          if (!c.targetGrades.includes(studentGrade) && !isClassInvited && !isUserInvited) {
            return false;
          }
        }
        
        return true;
      });
    }

    // Sort by start time ascending
    results.sort((a, b) => a.startTime - b.startTime);

    const withTeacher = [];
    for (const c of results) {
      const teacher = await ctx.db.get(c.teacher);
      withTeacher.push({
        ...c,
        teacherName: teacher?.name || teacher?.email || "Teacher",
      });
    }

    return withTeacher;
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

    if (user?.role !== "teacher" && user?.role !== "admin") {
      throw new Error("Unauthorized");
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

    // Verify invitation for school-only classes
    if (liveClass.accessMode === "school-only") {
      const studentClassId = user?.studentClass;
      const isUserInvited = liveClass.invitedUsers?.includes(userId) ?? false;
      const isClassAssigned = liveClass.class && liveClass.class === studentClassId;
      const isClassInvited = studentClassId && (liveClass.invitedClasses?.includes(studentClassId) ?? false);
      if (!isUserInvited && !isClassAssigned && !isClassInvited) {
        throw new Error("You are not invited to this private live class");
      }
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

// Helper to get student grade from userPreferences or user's assigned class name
async function userPreferences_grade(
  userId: any,
  ctx: any
): Promise<number | undefined> {
  const prefs = await ctx.db
    .query("userPreferences")
    .withIndex("by_student", (q: any) => q.eq("student", userId))
    .first();

  if (prefs?.grade) return prefs.grade;

  // Fallback: Resolve grade from student's class name (e.g. "Grade 12A" -> 12)
  const user = await ctx.db.get(userId);
  if (user?.studentClass) {
    const classDoc = await ctx.db.get(user.studentClass);
    if (classDoc?.name) {
      const match = classDoc.name.match(/\b(1[0-2]|[1-9])\b/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
  }

  return undefined;
}

export const getLiveChatMessages = query({
  args: { liveClassId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const liveClassId = ctx.db.normalizeId("liveClasses", args.liveClassId);
    if (!liveClassId) return [];

    const messages = await ctx.db
      .query("liveClassChatMessages")
      .withIndex("by_class", (q) => q.eq("liveClass", liveClassId))
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
  args: { liveClassId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const liveClassId = ctx.db.normalizeId("liveClasses", args.liveClassId);
    if (!liveClassId) return [];

    const hands = await ctx.db
      .query("liveClassRaisedHands")
      .withIndex("by_class", (q) => q.eq("liveClass", liveClassId))
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
    if (liveClass.status === "ended" || liveClass.status === "cancelled") {
      throw new Error("Hands cannot be raised in ended or cancelled classes");
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

export const searchUsersAndClasses = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const user = await ctx.db.get(userId);
    if (user?.role !== "teacher" && user?.role !== "admin") {
      throw new Error("Only teachers and admins can search for invitations");
    }

    const searchStr = args.query.trim().toLowerCase();
    if (!searchStr) return { users: [], classes: [] };

    // Search students
    const students = await ctx.db
      .query("users")
      .collect();
    
    const matchedStudents = students.filter(s => 
      s.role === "student" && 
      ((s.name && s.name.toLowerCase().includes(searchStr)) || 
       (s.email && s.email.toLowerCase().includes(searchStr)))
    ).map(s => ({
      _id: s._id,
      name: s.name || s.email || "Student",
      email: s.email || "",
      role: s.role,
    })).slice(0, 15);

    // Search classes
    const classes = await ctx.db
      .query("classes")
      .collect();

    const matchedClasses = classes.filter(c => 
      c.name.toLowerCase().includes(searchStr)
    ).map(c => ({
      _id: c._id,
      name: c.name,
    })).slice(0, 15);

    return { users: matchedStudents, classes: matchedClasses };
  }
});

export const inviteToLiveClass = mutation({
  args: {
    liveClassId: v.id("liveClasses"),
    invitedUsers: v.array(v.id("users")),
    invitedClasses: v.array(v.id("classes")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    const liveClass = await ctx.db.get(args.liveClassId);
    if (!liveClass) throw new Error("Live class not found");

    if (liveClass.teacher !== userId && user?.role !== "admin") {
      throw new Error("Unauthorized: you did not create this class");
    }

    await ctx.db.patch(args.liveClassId, {
      invitedUsers: args.invitedUsers,
      invitedClasses: args.invitedClasses,
    });

    return { success: true };
  }
});

export const sendReaction = mutation({
  args: {
    liveClassId: v.id("liveClasses"),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    await ctx.db.insert("liveClassReactions", {
      liveClass: args.liveClassId,
      user: userId,
      userName: user.name || user.email || "Learner",
      type: args.type,
      timestamp: Date.now(),
    });

    return { success: true };
  }
});

export const getRecentReactions = query({
  args: { liveClassId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const liveClassId = ctx.db.normalizeId("liveClasses", args.liveClassId);
    if (!liveClassId) return [];

    const now = Date.now();
    const reactions = await ctx.db
      .query("liveClassReactions")
      .withIndex("by_class", (q) => q.eq("liveClass", liveClassId))
      .collect();

    // Only return reactions from the last 10 seconds
    const recentReactions = reactions
      .filter((r) => now - r.timestamp < 10000)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 30);

    return recentReactions;
  }
});

// ─── WAITING ROOM / APPROVALS ────────────────────────────────────────────────

export const getApprovalStatus = query({
  args: { liveClassId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const liveClassId = ctx.db.normalizeId("liveClasses", args.liveClassId);
    if (!liveClassId) return null;

    const approval = await ctx.db
      .query("liveClassApprovals")
      .withIndex("by_student_class", (q) =>
        q.eq("student", userId).eq("liveClass", liveClassId)
      )
      .first();

    return approval;
  },
});

export const getPendingApprovals = query({
  args: { liveClassId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const liveClassId = ctx.db.normalizeId("liveClasses", args.liveClassId);
    if (!liveClassId) return [];

    const user = await ctx.db.get(userId);
    const liveClass = await ctx.db.get(liveClassId);
    if (!liveClass) return [];

    // Only teachers/admins can see pending approvals
    if (liveClass.teacher !== userId && user?.role !== "admin") {
      return [];
    }

    const approvals = await ctx.db
      .query("liveClassApprovals")
      .withIndex("by_class", (q) => q.eq("liveClass", liveClassId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return approvals;
  },
});

export const requestJoinClass = mutation({
  args: { liveClassId: v.id("liveClasses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const liveClass = await ctx.db.get(args.liveClassId);
    if (!liveClass) throw new Error("Live class not found");

    // Check if already has an approval record
    const existing = await ctx.db
      .query("liveClassApprovals")
      .withIndex("by_student_class", (q) =>
        q.eq("student", userId).eq("liveClass", args.liveClassId)
      )
      .first();

    if (existing) {
      if (existing.status === "pending") {
        return existing._id;
      }
      // If denied, allow them to re-request
      await ctx.db.patch(existing._id, {
        status: "pending",
        requestedAt: Date.now(),
      });
      return existing._id;
    }

    const approvalId = await ctx.db.insert("liveClassApprovals", {
      liveClass: args.liveClassId,
      student: userId,
      studentName: user.name || user.email || "Learner",
      status: "pending",
      requestedAt: Date.now(),
    });

    return approvalId;
  },
});

export const approveStudent = mutation({
  args: {
    approvalId: v.id("liveClassApprovals"),
    status: v.union(v.literal("approved"), v.literal("denied")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    const approval = await ctx.db.get(args.approvalId);
    if (!approval) throw new Error("Approval record not found");

    const liveClass = await ctx.db.get(approval.liveClass);
    if (!liveClass) throw new Error("Live class not found");

    // Only teachers/admins can approve
    if (liveClass.teacher !== userId && user?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.approvalId, {
      status: args.status,
    });

    return { success: true };
  },
});

export const getReactionStats = query({
  args: { liveClassId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { like: 0, love: 0, applause: 0, laugh: 0, surprised: 0 };

    const liveClassId = ctx.db.normalizeId("liveClasses", args.liveClassId);
    if (!liveClassId) return { like: 0, love: 0, applause: 0, laugh: 0, surprised: 0 };

    const reactions = await ctx.db
      .query("liveClassReactions")
      .withIndex("by_class", (q) => q.eq("liveClass", liveClassId))
      .collect();

    const counts: Record<string, number> = { like: 0, love: 0, applause: 0, laugh: 0, surprised: 0 };
    for (const r of reactions) {
      if (counts[r.type] !== undefined) {
        counts[r.type]++;
      }
    }
    return counts;
  },
});

export const getLiveClassParticipants = query({
  args: { liveClassId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const liveClassId = ctx.db.normalizeId("liveClasses", args.liveClassId);
    if (!liveClassId) return [];

    const liveClass = await ctx.db.get(liveClassId);
    if (!liveClass) return [];

    // Get active participants currently in the room
    const attendance = await ctx.db
      .query("liveClassAttendance")
      .withIndex("by_class", (q) => q.eq("liveClass", liveClassId))
      .collect();

    const activeMap = new Map();
    for (const record of attendance) {
      if (record.leftAt === undefined) {
        activeMap.set(record.student, record);
      }
    }

    const participants = [];
    
    // If the live class is assigned to a school class, get all students from that class
    if (liveClass.class) {
      const classDoc = await ctx.db.get(liveClass.class);
      if (classDoc && classDoc.students) {
        for (const studentId of classDoc.students) {
          const student = await ctx.db.get(studentId);
          if (student) {
            const record = activeMap.get(studentId);
             participants.push({
              studentId: student._id,
              name: student.name || student.email || "Student",
              email: student.email || "",
              isOnline: record !== undefined,
              isMuted: record?.isMuted ?? false,
              isCameraBlocked: record?.isCameraBlocked ?? false,
              canShareScreen: record?.canShareScreen ?? false,
              requestedScreenShare: record?.requestedScreenShare ?? false,
            });
          }
        }
        return participants;
      }
    }

    // Fallback: if no class assigned, just return the active ones in the room
    for (const record of attendance) {
      if (record.leftAt !== undefined) continue;
      const student = await ctx.db.get(record.student);
      if (student) {
        participants.push({
          studentId: student._id,
          name: student.name || student.email || "Student",
          email: student.email || "",
          isOnline: true,
          isMuted: record.isMuted ?? false,
          isCameraBlocked: record.isCameraBlocked ?? false,
          canShareScreen: record.canShareScreen ?? false,
          requestedScreenShare: record.requestedScreenShare ?? false,
        });
      }
    }
    return participants;
  },
});

export const leaveLiveClass = mutation({
  args: { liveClassId: v.id("liveClasses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const attendance = await ctx.db
      .query("liveClassAttendance")
      .withIndex("by_class", (q) => q.eq("liveClass", args.liveClassId))
      .filter((q) => q.eq(q.field("student"), userId))
      .first();

    if (attendance && attendance.leftAt === undefined) {
      await ctx.db.patch(attendance._id, {
        leftAt: Date.now(),
      });
    }
  },
});

export const evictStudent = mutation({
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

    if (liveClass.teacher !== userId && user?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const attendance = await ctx.db
      .query("liveClassAttendance")
      .withIndex("by_class", (q) => q.eq("liveClass", args.liveClassId))
      .filter((q) => q.eq(q.field("student"), args.studentId))
      .first();

    if (attendance) {
      await ctx.db.patch(attendance._id, {
        leftAt: Date.now(),
      });
    }

    const approval = await ctx.db
      .query("liveClassApprovals")
      .withIndex("by_student_class", (q) =>
        q.eq("student", args.studentId).eq("liveClass", args.liveClassId)
      )
      .first();

    if (approval) {
      await ctx.db.patch(approval._id, {
        status: "denied",
      });
    } else {
      await ctx.db.insert("liveClassApprovals", {
        liveClass: args.liveClassId,
        student: args.studentId,
        studentName: "Evicted Learner",
        status: "denied",
        requestedAt: Date.now(),
      });
    }

    const raisedHand = await ctx.db
      .query("liveClassRaisedHands")
      .withIndex("by_student_class", (q) =>
        q.eq("student", args.studentId).eq("liveClass", args.liveClassId)
      )
      .first();

    if (raisedHand) {
      await ctx.db.delete(raisedHand._id);
    }

    return { success: true };
  },
});

export const toggleMuteStudent = mutation({
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

    if (liveClass.teacher !== userId && user?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const attendance = await ctx.db
      .query("liveClassAttendance")
      .withIndex("by_class", (q) => q.eq("liveClass", args.liveClassId))
      .filter((q) => q.eq(q.field("student"), args.studentId))
      .first();

    if (attendance) {
      const nextMuteState = !attendance.isMuted;
      await ctx.db.patch(attendance._id, {
        isMuted: nextMuteState,
      });
      return { isMuted: nextMuteState };
    }
    return { isMuted: false };
  },
});

export const toggleBlockCameraStudent = mutation({
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

    if (liveClass.teacher !== userId && user?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const attendance = await ctx.db
      .query("liveClassAttendance")
      .withIndex("by_class", (q) => q.eq("liveClass", args.liveClassId))
      .filter((q) => q.eq(q.field("student"), args.studentId))
      .first();

    if (attendance) {
      const nextBlockState = !attendance.isCameraBlocked;
      await ctx.db.patch(attendance._id, {
        isCameraBlocked: nextBlockState,
      });
      return { isCameraBlocked: nextBlockState };
    }
    return { isCameraBlocked: false };
  },
});

export const updateStreamTimestamp = mutation({
  args: {
    liveClassId: v.id("liveClasses"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    const liveClass = await ctx.db.get(args.liveClassId);
    if (!liveClass) throw new Error("Live class not found");

    const attendance = await ctx.db
      .query("liveClassAttendance")
      .withIndex("by_class", (q) => q.eq("liveClass", args.liveClassId))
      .filter((q) => q.eq(q.field("student"), userId))
      .first();

    const isTeacher = user?.role === "teacher" || user?.role === "admin" || liveClass.teacher === userId;
    const canShare = attendance?.canShareScreen ?? false;

    if (!isTeacher && !canShare) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.liveClassId, {
      lastStreamUpdate: Date.now(),
    });

    return { success: true };
  },
});

export const requestScreenShare = mutation({
  args: {
    liveClassId: v.id("liveClasses"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const attendance = await ctx.db
      .query("liveClassAttendance")
      .withIndex("by_class", (q) => q.eq("liveClass", args.liveClassId))
      .filter((q) => q.eq(q.field("student"), userId))
      .first();

    if (!attendance) {
      throw new Error("Student not joined to class");
    }

    await ctx.db.patch(attendance._id, {
      requestedScreenShare: true,
    });

    return { success: true };
  },
});

export const toggleScreenSharePermission = mutation({
  args: {
    liveClassId: v.id("liveClasses"),
    studentId: v.id("users"),
    granted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    const liveClass = await ctx.db.get(args.liveClassId);
    if (!liveClass) throw new Error("Live class not found");

    if (liveClass.teacher !== userId && user?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const attendance = await ctx.db
      .query("liveClassAttendance")
      .withIndex("by_class", (q) => q.eq("liveClass", args.liveClassId))
      .filter((q) => q.eq(q.field("student"), args.studentId))
      .first();

    if (attendance) {
      await ctx.db.patch(attendance._id, {
        canShareScreen: args.granted,
        requestedScreenShare: false,
      });
      return { success: true, canShareScreen: args.granted };
    }
    return { success: false };
  },
});

// ─── WEBRTC AUDIO SIGNALING FOR STUDENT REPLIES ─────────────────────────────

export const sendWebRtcSignal = mutation({
  args: {
    liveClassId: v.string(),
    targetUserId: v.id("users"),
    signalType: v.union(v.literal("offer"), v.literal("answer"), v.literal("candidate")),
    sdp: v.optional(v.string()),
    candidate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    let liveClassId = ctx.db.normalizeId("liveClasses", args.liveClassId);
    if (!liveClassId) {
      const byRoom = await ctx.db
        .query("liveClasses")
        .filter((q) => q.eq(q.field("roomId"), args.liveClassId))
        .first();
      if (byRoom) liveClassId = byRoom._id;
    }
    if (!liveClassId) throw new Error("Live class not found");

    // Assign to const so TypeScript correctly narrows away null for db.insert
    const resolvedClassId = liveClassId;
    const resolvedUserId = userId;

    await ctx.db.insert("liveClassWebRtcSignals", {
      liveClass: resolvedClassId,
      sender: resolvedUserId,
      targetUser: args.targetUserId,
      signalType: args.signalType,
      sdp: args.sdp,
      candidate: args.candidate,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

export const getWebRtcSignals = query({
  args: {
    liveClassId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let liveClassId = ctx.db.normalizeId("liveClasses", args.liveClassId);
    if (!liveClassId) {
      const byRoom = await ctx.db
        .query("liveClasses")
        .filter((q) => q.eq(q.field("roomId"), args.liveClassId))
        .first();
      if (byRoom) liveClassId = byRoom._id;
    }
    if (!liveClassId) return [];

    // Assign to const so TypeScript correctly narrows away null for withIndex
    const resolvedClassId = liveClassId;
    const resolvedUserId = userId;

    const signals = await ctx.db
      .query("liveClassWebRtcSignals")
      .withIndex("by_target", (q) => q.eq("liveClass", resolvedClassId).eq("targetUser", resolvedUserId))
      .collect();

    return signals;
  },
});

export const clearWebRtcSignals = mutation({
  args: {
    liveClassId: v.string(),
    signalIds: v.array(v.id("liveClassWebRtcSignals")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    for (const signalId of args.signalIds) {
      const sig = await ctx.db.get(signalId);
      if (sig && (sig.targetUser === userId || sig.sender === userId)) {
        await ctx.db.delete(signalId);
      }
    }

    return { success: true };
  },
});


