import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) return null;

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive ?? true,
      isApproved: user.isApproved ?? true,
    };
  },
});

export const getUsers = query({
  args: { role: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized");
    }

    const currentUser = await ctx.db.get(userId);
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "teacher")) {
      throw new Error("Unauthorized");
    }

    let usersQuery = ctx.db.query("users");
    if (args.role) {
      usersQuery = usersQuery.filter((q) => q.eq(q.field("role"), args.role));
    }

    const allUsers = await usersQuery.collect();
    return allUsers.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive ?? true,
      isApproved: u.isApproved ?? true,
    }));
  },
});

export const updateUser = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.union(
      v.literal("admin"),
      v.literal("teacher"),
      v.literal("student"),
      v.literal("parent")
    )),
    isActive: v.optional(v.boolean()),
    isApproved: v.optional(v.boolean()),
    studentClass: v.optional(v.id("classes")),
    teacherSubject: v.optional(v.array(v.id("subjects"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized");
    }

    const currentUser = await ctx.db.get(userId);
    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const targetUser = await ctx.db.get(args.id);
    if (!targetUser) throw new Error("User not found");

    const { id, studentClass, teacherSubject, ...updates } = args;

    const patchData: any = { ...updates };
    if (studentClass !== undefined) {
      patchData.studentClass = studentClass;
    }
    if (teacherSubject !== undefined) {
      patchData.teacherSubject = teacherSubject;
    }

    await ctx.db.patch(id, patchData);

    // Sync class roster if studentClass changed
    if (studentClass !== undefined && studentClass !== targetUser.studentClass) {
      // Remove from old class
      if (targetUser.studentClass) {
        const oldClass = await ctx.db.get(targetUser.studentClass);
        if (oldClass) {
          const updatedStudents = (oldClass.students || []).filter((sId) => sId !== id);
          await ctx.db.patch(oldClass._id, { students: updatedStudents });
        }
      }
      // Add to new class
      if (studentClass) {
        const newClass = await ctx.db.get(studentClass);
        if (newClass) {
          const currentStudents = newClass.students || [];
          if (!currentStudents.includes(id)) {
            await ctx.db.patch(newClass._id, { students: [...currentStudents, id] });
          }
        }
      }
    }

    return { success: true };
  },
});

export const deleteUser = mutation({
  args: {
    id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized");
    }

    const currentUser = await ctx.db.get(userId);
    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const getAnalyticsStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Unauthorized");

    const [users, classes, submissions, fees, attendance] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("classes").collect(),
      ctx.db.query("submissions").collect(),
      ctx.db.query("fees").collect(),
      ctx.db.query("attendance").collect(),
    ]);

    const students = users.filter((u) => u.role === "student");
    const teachers = users.filter((u) => u.role === "teacher");
    const parents = users.filter((u) => u.role === "parent");
    const paidFees = fees.filter((f) => f.status === "paid").reduce((a, f) => a + f.amount, 0);
    const pendingFees = fees.filter((f) => f.status === "pending").reduce((a, f) => a + f.amount, 0);
    const presentCount = attendance.filter((a) => a.status === "present").length;
    const attendanceRate = attendance.length
      ? Math.round((presentCount / attendance.length) * 100)
      : 0;
    const avgScore = submissions.length
      ? Math.round(submissions.reduce((a, s) => a + s.score, 0) / submissions.length)
      : 0;

    return {
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalParents: parents.length,
      totalClasses: classes.length,
      paidFees,
      pendingFees,
      attendanceRate,
      avgExamScore: avgScore,
      totalSubmissions: submissions.length,
    };
  },
});

// Self-profile update (any authenticated user)
export const updateMyProfile = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    await ctx.db.patch(userId, { name: args.name });
    return { success: true };
  },
});
