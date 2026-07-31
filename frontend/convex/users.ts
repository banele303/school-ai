import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const ADMIN_EMAILS = [
  "alexsouthflow@gmail.com",
  "ramadimukondi13@gmail.com",
  "alexsouthflow2@gmail.com",
  "alxsouthflow2@gmail.com",
];

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const isAdminEmail = Boolean(user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
    const effectiveRole = isAdminEmail ? "admin" : (user.role || "student");
    const defaultApproved = effectiveRole === "admin" || effectiveRole === "parent";

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: effectiveRole,
      isActive: user.isActive ?? true,
      isApproved: user.isApproved ?? defaultApproved,
      studentClass: user.studentClass,
      teacherSubject: user.teacherSubject,
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
    const isCurrentUserAdmin = Boolean(
      currentUser?.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase())
    );
    const currentUserRole = isCurrentUserAdmin ? "admin" : currentUser?.role;

    if (!currentUser || (currentUserRole !== "admin" && currentUserRole !== "teacher")) {
      throw new Error("Unauthorized");
    }

    const allUsers = await ctx.db.query("users").collect();

    const processedUsers = await Promise.all(
      allUsers.map(async (u) => {
        const isAdmin = Boolean(u.email && ADMIN_EMAILS.includes(u.email.toLowerCase()));
        const role = isAdmin ? "admin" : (u.role || "student");
        const defaultApproved = role === "admin" || role === "parent";

        let studentClassDoc = null;
        if (u.studentClass) {
          studentClassDoc = await ctx.db.get(u.studentClass);
        }

        let teacherSubjectsDocs: any[] = [];
        if (u.teacherSubject && Array.isArray(u.teacherSubject)) {
          const subjects = await Promise.all(
            u.teacherSubject.map((sId) => ctx.db.get(sId))
          );
          teacherSubjectsDocs = subjects.filter(Boolean);
        }

        return {
          _id: u._id,
          name: u.name,
          email: u.email,
          role,
          isActive: u.isActive ?? true,
          isApproved: u.isApproved ?? defaultApproved,
          studentClass: studentClassDoc
            ? { _id: studentClassDoc._id, name: studentClassDoc.name }
            : u.studentClass,
          teacherSubject: u.teacherSubject,
          teacherSubjects: teacherSubjectsDocs.map((s: any) => ({
            _id: s._id,
            name: s.grade ? `${s.name} (Grade ${s.grade})` : s.name,
            code: s.code,
            grade: s.grade,
          })),
          linkedStudents: u.linkedStudents || [],
          assignedTeachers: u.assignedTeachers || [],
          assignedStudents: u.assignedStudents || [],
        };
      })
    );

    if (args.role) {
      return processedUsers.filter((u) => u.role === args.role);
    }
    return processedUsers;
  },
});

export const completeOnboarding = mutation({
  args: {
    role: v.union(
      v.literal("teacher"),
      v.literal("student"),
      v.literal("parent")
    ),
    classId: v.optional(v.id("classes")),
    subjectIds: v.optional(v.array(v.id("subjects"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    if (user.onboardingCompleted) {
      throw new Error("Onboarding already completed");
    }

    const cleanClassId = args.classId && args.classId.trim() !== "" ? args.classId : undefined;
    const cleanSubjectIds = args.subjectIds && args.subjectIds.length > 0 ? args.subjectIds : undefined;

    const isApproved = args.role === "parent"; // Teachers and students need admin approval

    await ctx.db.patch(userId, {
      role: args.role,
      studentClass: args.role === "student" ? cleanClassId : undefined,
      studentSubjects: args.role === "student" ? cleanSubjectIds : undefined,
      teacherSubject: args.role === "teacher" ? cleanSubjectIds : undefined,
      onboardingCompleted: true,
      isApproved,
    });
    
    return { success: true };
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
    studentSubjects: v.optional(v.array(v.id("subjects"))),
    teacherSubject: v.optional(v.array(v.id("subjects"))),
    linkedStudents: v.optional(v.array(v.id("users"))),
    assignedTeachers: v.optional(v.array(v.id("users"))),
    assignedStudents: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized");
    }

    const currentUser = await ctx.db.get(userId);
    const isCurrentUserAdmin = Boolean(
      currentUser?.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase())
    );
    const currentUserRole = isCurrentUserAdmin ? "admin" : currentUser?.role;

    if (!currentUser || currentUserRole !== "admin") {
      throw new Error("Unauthorized");
    }

    const targetUser = await ctx.db.get(args.id);
    if (!targetUser) throw new Error("User not found");

    const { id, studentClass, teacherSubject, linkedStudents, assignedTeachers, assignedStudents, ...updates } = args;

    const cleanStudentClass = studentClass && (studentClass as string).trim() !== "" ? studentClass : undefined;
    const cleanTeacherSubject = teacherSubject && teacherSubject.length > 0 ? teacherSubject : undefined;

    const patchData: any = { ...updates };
    if (studentClass !== undefined) {
      patchData.studentClass = cleanStudentClass;
    }
    if (teacherSubject !== undefined) {
      patchData.teacherSubject = cleanTeacherSubject;
    }
    if (linkedStudents !== undefined) {
      patchData.linkedStudents = linkedStudents;
    }
    if (assignedTeachers !== undefined) {
      patchData.assignedTeachers = assignedTeachers;
    }
    if (assignedStudents !== undefined) {
      patchData.assignedStudents = assignedStudents;
    }

    await ctx.db.patch(id, patchData);

    // Sync class roster if studentClass changed
    if (studentClass !== undefined && studentClass !== targetUser.studentClass) {
      // Remove from old class
      if (targetUser.studentClass) {
        const oldClass: any = await ctx.db.get(targetUser.studentClass);
        if (oldClass) {
          const updatedStudents = (oldClass.students || []).filter((sId: any) => sId !== id);
          await ctx.db.patch(oldClass._id, { students: updatedStudents });
        }
      }
      // Add to new class
      if (studentClass) {
        const newClass: any = await ctx.db.get(studentClass);
        if (newClass) {
          const currentStudents = newClass.students || [];
          if (!currentStudents.includes(id)) {
            await ctx.db.patch(newClass._id, { students: [...currentStudents, id] });
          }
        }
      }
    }

    // Sync subjects' teacher array if teacherSubject changed
    if (teacherSubject !== undefined && Array.isArray(teacherSubject)) {
      const oldSubjectIds: string[] = targetUser.teacherSubject || [];
      const newSubjectIds: string[] = teacherSubject;

      // Remove teacher from subjects no longer assigned
      const removedSubjectIds = oldSubjectIds.filter((sId) => !newSubjectIds.includes(sId));
      for (const sId of removedSubjectIds) {
        const sub: any = await ctx.db.get(sId as any);
        if (sub && sub.teacher) {
          const updatedTeachers = (sub.teacher || []).filter((tId: any) => tId !== id);
          await ctx.db.patch(sub._id, { teacher: updatedTeachers });
        }
      }

      // Add teacher to newly assigned subjects
      for (const sId of newSubjectIds) {
        const sub: any = await ctx.db.get(sId as any);
        if (sub) {
          const currentTeachers = sub.teacher || [];
          if (!currentTeachers.includes(id as any)) {
            await ctx.db.patch(sub._id, { teacher: [...currentTeachers, id as any] });
          }
        }
      }
    }

    // Bidirectional sync for user links
    if (linkedStudents !== undefined) {
      // Parents linking to students (Parent -> Student)
      const oldLinks: string[] = targetUser.linkedStudents || [];
      const newLinks: string[] = linkedStudents;
      
      const removed = oldLinks.filter(sId => !newLinks.includes(sId));
      const added = newLinks.filter(sId => !oldLinks.includes(sId));
      
      // Update parents array in student if it exists (not strictly required if we just query, but good for completeness if we add assignedParents later)
      // Actually we don't have assignedParents, we just use linkedStudents on Parent.
    }

    if (assignedTeachers !== undefined) {
      // Students linking to teachers
      const oldTeachers: string[] = targetUser.assignedTeachers || [];
      const newTeachers: string[] = assignedTeachers;
      
      const removed = oldTeachers.filter(tId => !newTeachers.includes(tId));
      const added = newTeachers.filter(tId => !oldTeachers.includes(tId));
      
      for (const tId of removed) {
        const teacher: any = await ctx.db.get(tId as any);
        if (teacher) {
          const currentStudents = teacher.assignedStudents || [];
          await ctx.db.patch(teacher._id, { assignedStudents: currentStudents.filter((s: any) => s !== id) });
        }
      }
      for (const tId of added) {
        const teacher: any = await ctx.db.get(tId as any);
        if (teacher) {
          const currentStudents = teacher.assignedStudents || [];
          if (!currentStudents.includes(id)) {
            await ctx.db.patch(teacher._id, { assignedStudents: [...currentStudents, id] });
          }
        }
      }
    }

    if (assignedStudents !== undefined) {
      // Teachers linking to students
      const oldStudents: string[] = targetUser.assignedStudents || [];
      const newStudents: string[] = assignedStudents;
      
      const removed = oldStudents.filter(sId => !newStudents.includes(sId));
      const added = newStudents.filter(sId => !oldStudents.includes(sId));
      
      for (const sId of removed) {
        const student: any = await ctx.db.get(sId as any);
        if (student) {
          const currentTeachers = student.assignedTeachers || [];
          await ctx.db.patch(student._id, { assignedTeachers: currentTeachers.filter((t: any) => t !== id) });
        }
      }
      for (const sId of added) {
        const student: any = await ctx.db.get(sId as any);
        if (student) {
          const currentTeachers = student.assignedTeachers || [];
          if (!currentTeachers.includes(id)) {
            await ctx.db.patch(student._id, { assignedTeachers: [...currentTeachers, id] });
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

    const authAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", args.id as any))
      .collect();

    for (const account of authAccounts) {
      await ctx.db.delete(account._id);
    }

    const authSessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", args.id as any))
      .collect();

    for (const session of authSessions) {
      await ctx.db.delete(session._id);
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
    const user: any = await ctx.db.get(userId);
    const isUserAdmin = Boolean(user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
    if (!isUserAdmin && user?.role !== "admin") throw new Error("Unauthorized");

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
    role: v.optional(v.union(v.literal("student"), v.literal("teacher"), v.literal("parent"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    
    const user: any = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const patchData: any = {};
    if (args.name !== undefined) patchData.name = args.name;
    if (args.role !== undefined && user.role !== "admin") {
      patchData.role = args.role;
      patchData.isApproved = false; // Require approval on role change
    }

    await ctx.db.patch(userId, patchData);
    return { success: true };
  },
});

// Fix / restore admin role if previously overwritten or in ADMIN_EMAILS
export const fixAdminRole = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const user: any = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      await ctx.db.patch(userId, {
        role: "admin",
        isApproved: true,
        isActive: true,
      });
      return { success: true, fixed: true, role: "admin" };
    }
    return { success: true, fixed: false, role: user.role };
  },
});
