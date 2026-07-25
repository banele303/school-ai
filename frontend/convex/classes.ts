import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createClass = mutation({
  args: {
    name: v.string(),
    academicYearId: v.id("academicYears"),
    classTeacherId: v.optional(v.id("users")),
    subjectIds: v.optional(v.array(v.id("subjects"))),
    capacity: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const classId = await ctx.db.insert("classes", {
      name: args.name,
      academicYear: args.academicYearId,
      classTeacher: args.classTeacherId,
      subjects: args.subjectIds || [],
      students: [],
      capacity: args.capacity,
    });

    return { classId };
  },
});

export const getClasses = query({
  args: { academicYear: v.optional(v.id("academicYears")) },
  handler: async (ctx, args) => {
    let classesQuery = ctx.db.query("classes");
    if (args.academicYear) {
      classesQuery = classesQuery.filter((q) => q.eq(q.field("academicYear"), args.academicYear));
    }

    const classes = await classesQuery.collect();

    return await Promise.all(
      classes.map(async (cls) => {
        const academicYear = await ctx.db.get(cls.academicYear);
        const classTeacher = cls.classTeacher ? await ctx.db.get(cls.classTeacher) : null;
        const subjects = await Promise.all(
          (cls.subjects || []).map((id) => ctx.db.get(id))
        );
        const students = await Promise.all(
          (cls.students || []).map((id) => ctx.db.get(id))
        );

        return {
          ...cls,
          academicYear,
          classTeacher,
          subjects: subjects.filter((s) => s !== null),
          students: students.filter((s) => s !== null),
        };
      })
    );
  },
});

export const updateClass = mutation({
  args: {
    id: v.id("classes"),
    name: v.optional(v.string()),
    academicYearId: v.optional(v.id("academicYears")),
    classTeacherId: v.optional(v.id("users")),
    subjectIds: v.optional(v.array(v.id("subjects"))),
    studentIds: v.optional(v.array(v.id("users"))),
    capacity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      throw new Error("Unauthorized");
    }

    const targetClass = await ctx.db.get(args.id);
    if (!targetClass) throw new Error("Class not found");

    const { id, academicYearId, classTeacherId, subjectIds, studentIds, ...updates } = args;

    const patchObj: any = {
      ...updates,
      ...(academicYearId && { academicYear: academicYearId }),
      ...(classTeacherId !== undefined && { classTeacher: classTeacherId }),
      ...(subjectIds && { subjects: subjectIds }),
      ...(studentIds && { students: studentIds }),
    };

    await ctx.db.patch(id, patchObj);

    // Sync studentClass on student user documents if studentIds updated
    if (studentIds) {
      const oldStudentIds = targetClass.students || [];
      const removedStudents = oldStudentIds.filter((sId) => !studentIds.includes(sId));
      const addedStudents = studentIds.filter((sId) => !oldStudentIds.includes(sId));

      for (const rId of removedStudents) {
        const student = await ctx.db.get(rId);
        if (student && student.studentClass === id) {
          await ctx.db.patch(rId, { studentClass: undefined });
        }
      }

      for (const aId of addedStudents) {
        const student = await ctx.db.get(aId);
        if (student) {
          await ctx.db.patch(aId, { studentClass: id });
        }
      }
    }

    return { success: true };
  },
});

export const getClass = query({
  args: { id: v.id("classes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const deleteClass = mutation({
  args: { id: v.id("classes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});
