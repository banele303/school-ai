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

export const upsertCoreSubjects = mutation({
  args: {},
  handler: async (ctx) => {
    const coreSubjects = [
      { name: "Mathematics", code: "MATH101", category: "maths", grade: 12 },
      { name: "Physical Sciences", code: "SCI101", category: "science", grade: 12 },
      { name: "English Home Language", code: "ENG101", category: "language", grade: 12 },
      { name: "Afrikaans First Additional Language", code: "AFR101", category: "language", grade: 12 },
      { name: "Life Orientation", code: "LO101", category: "life_skills", grade: 12 },
      { name: "Life Sciences", code: "LIFE101", category: "science", grade: 12 },
      { name: "History", code: "HIST101", category: "humanities", grade: 12 },
      { name: "Geography", code: "GEO101", category: "humanities", grade: 12 },
      { name: "Accounting", code: "ACC101", category: "other", grade: 12 },
      { name: "Business Studies", code: "BUS101", category: "other", grade: 12 },
      { name: "Economics", code: "ECON101", category: "other", grade: 12 },
      { name: "Computer Applications Technology", code: "CAT101", category: "technology", grade: 12 },
      { name: "Information Technology", code: "IT101", category: "technology", grade: 12 },
      { name: "Natural Sciences", code: "NATSCI101", category: "science", grade: 9 },
      { name: "Technology", code: "TECH101", category: "technology", grade: 9 },
    ];

    const existingSubjects = await ctx.db.query("subjects").collect();
    const byCode = new Map(existingSubjects.map((subject) => [subject.code, subject]));
    let created = 0;
    let updated = 0;

    for (const subject of coreSubjects) {
      const existing = byCode.get(subject.code);
      if (existing) {
        await ctx.db.patch(existing._id, {
          name: subject.name,
          code: subject.code,
          category: subject.category,
          grade: subject.grade,
          isActive: true,
        });
        updated += 1;
      } else {
        await ctx.db.insert("subjects", {
          name: subject.name,
          code: subject.code,
          category: subject.category,
          grade: subject.grade,
          isActive: true,
        });
        created += 1;
      }
    }

    return { created, updated, total: coreSubjects.length };
  },
});
