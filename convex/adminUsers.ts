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

    const newUserId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      role: args.role,
      isActive: true,
      isApproved: true,
      studentClass: args.classId,
      teacherSubject: args.subjectIds,
    });

    return { success: true, newUserId };
  },
});
