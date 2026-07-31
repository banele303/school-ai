import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createUserAdmin = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("teacher"),
      v.literal("student"),
      v.literal("parent")
    ),
    classId: v.optional(v.id("classes")),
    subjectIds: v.optional(v.array(v.id("subjects"))),
    linkedStudents: v.optional(v.array(v.id("users"))),
    assignedTeachers: v.optional(v.array(v.id("users"))),
    assignedStudents: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized");
    }
    const adminUser = await ctx.db.get(userId);
    if (!adminUser || adminUser.role !== "admin") {
      throw new Error("Unauthorized");
    }

    // Insert user. The user will have to use "Forgot Password" or we just don't set a password here
    // With Convex Auth, creating a user directly means they need to sign up using the same email
    // Or we just create the user record, and when they sign in with a new password, it links to this email.
    
    // Check if email exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const cleanClassId = args.classId && (args.classId as string).trim() !== "" ? args.classId : undefined;
    const cleanSubjectIds = args.subjectIds && args.subjectIds.length > 0 ? args.subjectIds : undefined;

    const newUserId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      role: args.role,
      isActive: true,
      isApproved: true,
      studentClass: cleanClassId,
      studentSubjects: args.role === "student" ? cleanSubjectIds : undefined,
      teacherSubject: args.role === "teacher" ? cleanSubjectIds : undefined,
      linkedStudents: args.linkedStudents,
      assignedTeachers: args.assignedTeachers,
      assignedStudents: args.assignedStudents,
    });

    return { success: true, newUserId };
  },
});
export const cleanupOrphanedAuth = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    
    const adminUser = await ctx.db.get(userId);
    if (!adminUser || adminUser.role !== "admin") throw new Error("Unauthorized");

    const authAccounts = await ctx.db.query("authAccounts").collect();
    let deleted = 0;
    
    for (const account of authAccounts) {
      const user = await ctx.db.get(account.userId as any);
      if (!user) {
        await ctx.db.delete(account._id);
        deleted++;
      }
    }
    
    return { success: true, deletedOrphanedAccounts: deleted };
  },
});
