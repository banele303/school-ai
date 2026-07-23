import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const printAuthData = query({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("authAccounts" as any).collect();
    const credentials = await ctx.db.query("authCredentials" as any).collect();
    return {
      accounts,
      credentials,
    };
  },
});

export const checkUserExists = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id as any);
  },
});

export const fixDuplicateYears = mutation({
  args: {},
  handler: async (ctx) => {
    const currentYears = await ctx.db
      .query("academicYears")
      .filter((q) => q.eq(q.field("isCurrent"), true))
      .collect();
    
    if (currentYears.length > 1) {
      // Keep only the newest one as current
      const sorted = currentYears.sort((a, b) => b._creationTime - a._creationTime);
      for (let i = 1; i < sorted.length; i++) {
        await ctx.db.patch(sorted[i]._id, { isCurrent: false });
      }
      return `Fixed ${currentYears.length - 1} duplicate academic years.`;
    }
    return "No duplicates found.";
  },
});

export const cleanOrphanedAuth = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Clean orphaned authAccounts
    const accounts = await ctx.db.query("authAccounts" as any).collect();
    let accountsDeleted = 0;
    for (const acc of accounts) {
      const user = await ctx.db.get(acc.userId);
      if (!user) {
        await ctx.db.delete(acc._id);
        accountsDeleted++;
      }
    }

    // 2. Clean orphaned authSessions
    const sessions = await ctx.db.query("authSessions" as any).collect();
    let sessionsDeleted = 0;
    for (const sess of sessions) {
      const user = await ctx.db.get(sess.userId);
      if (!user) {
        await ctx.db.delete(sess._id);
        sessionsDeleted++;
      }
    }

    // 3. Clean orphaned authCredentials
    const credentials = await ctx.db.query("authCredentials" as any).collect();
    let credentialsDeleted = 0;
    for (const cred of credentials) {
      const account = await ctx.db.get(cred.accountId);
      if (!account) {
        await ctx.db.delete(cred._id);
        credentialsDeleted++;
      }
    }

    return `Successfully cleaned up orphaned auth data: ${accountsDeleted} accounts, ${sessionsDeleted} sessions, ${credentialsDeleted} credentials deleted.`;
  },
});

