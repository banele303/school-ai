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

export const upsertCurrentAcademicYear = mutation({
  args: {
    name: v.optional(v.string()),
    fromYear: v.optional(v.string()),
    toYear: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = args.name || "2026 Academic Year";
    const fromYear = args.fromYear || "2026";
    const toYear = args.toYear || "2026";

    const years = await ctx.db.query("academicYears").collect();
    const matchingYear = years.find(
      (year) => year.fromYear === fromYear && year.toYear === toYear
    );

    for (const year of years) {
      if (year.isCurrent && year._id !== matchingYear?._id) {
        await ctx.db.patch(year._id, { isCurrent: false });
      }
    }

    if (matchingYear) {
      await ctx.db.patch(matchingYear._id, {
        name,
        fromYear,
        toYear,
        isCurrent: true,
      });
      return { created: false, yearId: matchingYear._id, name };
    }

    const yearId = await ctx.db.insert("academicYears", {
      name,
      fromYear,
      toYear,
      isCurrent: true,
    });

    return { created: true, yearId, name };
  },
});
