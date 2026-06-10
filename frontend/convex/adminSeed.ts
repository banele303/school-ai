import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const upsertAdmin = mutation({
  args: {
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = (args.email || "alexsouthflow@gmail.com").trim().toLowerCase();
    const name = (args.name || "Admin User").trim();

    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name,
        email,
        role: "admin",
        isActive: true,
      });
      return { created: false, userId: existing._id, email };
    }

    const userId = await ctx.db.insert("users", {
      name,
      email,
      role: "admin",
      isActive: true,
    });

    return { created: true, userId, email };
  },
});
