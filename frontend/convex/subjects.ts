import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createSubject = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    teacherId: v.optional(v.array(v.id("users"))),
    isActive: v.boolean(),
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

    const subjectId = await ctx.db.insert("subjects", {
      name: args.name,
      code: args.code,
      teacher: args.teacherId,
      isActive: args.isActive,
    });

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

    await ctx.db.patch(args.id, {
      name: args.name,
      code: args.code,
      teacher: args.teacherId,
      isActive: args.isActive,
    });
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
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});
