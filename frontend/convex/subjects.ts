import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const ADMIN_EMAILS = [
  "alexsouthflow@gmail.com",
  "ramadimukondi13@gmail.com",
  "alexsouthflow2@gmail.com",
  "alxsouthflow2@gmail.com",
];

export const createSubject = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    teacherId: v.optional(v.array(v.id("users"))),
    isActive: v.boolean(),
    grade: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    const isAdmin = Boolean(user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
    if (!user || (!isAdmin && user.role !== "admin")) {
      throw new Error("Unauthorized");
    }

    const subjectId = await ctx.db.insert("subjects", {
      name: args.name,
      code: args.code,
      teacher: args.teacherId,
      isActive: args.isActive,
      grade: args.grade,
      category: args.category,
    });

    // Sync assigned teachers' teacherSubject array in users table
    if (args.teacherId && Array.isArray(args.teacherId)) {
      for (const tId of args.teacherId) {
        const teacherDoc = await ctx.db.get(tId);
        if (teacherDoc) {
          const currentSubjects = teacherDoc.teacherSubject || [];
          if (!currentSubjects.includes(subjectId)) {
            await ctx.db.patch(tId, { teacherSubject: [...currentSubjects, subjectId] });
          }
        }
      }
    }

    return { subjectId };
  },
});

export const getSubjects = query({
  args: {},
  handler: async (ctx) => {
    const subjects = await ctx.db.query("subjects").collect();

    return await Promise.all(
      subjects.map(async (subject) => {
        const teachers = await Promise.all(
          (subject.teacher || []).map((id: any) => ctx.db.get(id))
        );

        return {
          ...subject,
          teacher: teachers.filter((t) => t !== null),
        };
      })
    );
  },
});

export const updateSubject = mutation({
  args: {
    id: v.id("subjects"),
    name: v.string(),
    code: v.string(),
    teacherId: v.optional(v.array(v.id("users"))),
    isActive: v.boolean(),
    grade: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    const isAdmin = Boolean(user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
    if (!user || (!isAdmin && user.role !== "admin")) {
      throw new Error("Unauthorized");
    }

    const oldSubject = await ctx.db.get(args.id);

    await ctx.db.patch(args.id, {
      name: args.name,
      code: args.code,
      teacher: args.teacherId,
      isActive: args.isActive,
      grade: args.grade,
      category: args.category,
    });

    // Sync teacherSubject on teacher user documents
    if (args.teacherId !== undefined && Array.isArray(args.teacherId)) {
      const oldTeacherIds = oldSubject?.teacher || [];
      const newTeacherIds = args.teacherId;

      // Remove subject from teachers no longer assigned
      const removedTeachers = oldTeacherIds.filter((tId) => !newTeacherIds.includes(tId));
      for (const tId of removedTeachers) {
        const teacherDoc = await ctx.db.get(tId);
        if (teacherDoc && teacherDoc.teacherSubject) {
          const updatedSubjects = teacherDoc.teacherSubject.filter((sId) => sId !== args.id);
          await ctx.db.patch(tId, { teacherSubject: updatedSubjects });
        }
      }

      // Add subject to newly assigned teachers
      for (const tId of newTeacherIds) {
        const teacherDoc = await ctx.db.get(tId);
        if (teacherDoc) {
          const currentSubjects = teacherDoc.teacherSubject || [];
          if (!currentSubjects.includes(args.id)) {
            await ctx.db.patch(tId, { teacherSubject: [...currentSubjects, args.id] });
          }
        }
      }
    }
  },
});

export const deleteSubject = mutation({
  args: { id: v.id("subjects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    const isAdmin = Boolean(user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
    if (!user || (!isAdmin && user.role !== "admin")) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});

export const ensureMathsLiteracyExists = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("subjects")
      .filter((q) => q.eq(q.field("code"), "mathematical-literacy"))
      .first();

    if (!existing) {
      await ctx.db.insert("subjects", {
        name: "Mathematical Literacy",
        code: "mathematical-literacy",
        isActive: true,
      });
    }
  },
});
