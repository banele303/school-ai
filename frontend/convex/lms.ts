import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getAssignments = query({
  args: { classId: v.optional(v.id("classes")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;

    let q = ctx.db.query("assignments");
    if (args.classId) {
      q = q.filter((q) => q.eq(q.field("class"), args.classId));
    }
    const results = await q.collect();
    
    if (user?.role === "student" && user.studentSubjects && user.studentSubjects.length > 0) {
      return results.filter(a => user.studentSubjects!.includes(a.subject));
    }
    return results;
  },
});

export const createAssignment = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    subjectId: v.id("subjects"),
    classId: v.id("classes"),
    dueDate: v.string(),
    fileUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    
    return await ctx.db.insert("assignments", {
      title: args.title,
      description: args.description,
      subject: args.subjectId,
      class: args.classId,
      teacher: userId,
      dueDate: args.dueDate,
      fileUrl: args.fileUrl,
    });
  },
});

export const getMaterials = query({
  args: { subjectId: v.optional(v.id("subjects")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;

    let q = ctx.db.query("materials");
    if (args.subjectId) {
      q = q.filter((q) => q.eq(q.field("subject"), args.subjectId));
    }
    const results = await q.collect();
    
    if (user?.role === "student" && user.studentSubjects && user.studentSubjects.length > 0) {
      return results.filter(m => user.studentSubjects!.includes(m.subject));
    }
    return results;
  },
});

export const createMaterial = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    subjectId: v.id("subjects"),
    fileUrl: v.string(),
    extractedText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    
    return await ctx.db.insert("materials", {
      title: args.title,
      description: args.description,
      subject: args.subjectId,
      teacher: userId,
      fileUrl: args.fileUrl,
      fileType: "document",
      extractedText: args.extractedText,
    });
  },
});

export const getAssignmentSubmissions = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const submissions = await ctx.db
      .query("assignmentSubmissions")
      .withIndex("by_assignment", (q) => q.eq("assignment", args.assignmentId))
      .collect();
    
    return await Promise.all(submissions.map(async (s) => {
      const student = await ctx.db.get(s.student);
      return { ...s, studentName: student?.name || "Unknown Student" };
    }));
  },
});

export const updateSubmissionGrade = mutation({
  args: {
    submissionId: v.id("assignmentSubmissions"),
    grade: v.number(),
    feedback: v.string(),
    aiFeedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.submissionId, {
      grade: args.grade,
      feedback: args.feedback,
      aiFeedback: args.aiFeedback,
      status: "graded",
    });
  },
});
