import { mutation } from "./_generated/server";

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

export const deleteOrphanedAccounts = mutation({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("authAccounts").collect();
    let deletedCount = 0;
    for (const acc of accounts) {
      const user = await ctx.db.get(acc.userId);
      if (!user) {
        // Delete orphaned account
        await ctx.db.delete(acc._id);
        deletedCount++;
        
        // Also delete any sessions pointing to this user
        const sessions = await ctx.db
          .query("authSessions")
          .filter((q) => q.eq(q.field("userId"), acc.userId))
          .collect();
        for (const sess of sessions) {
          await ctx.db.delete(sess._id);
        }
      }
    }
    return `Deleted ${deletedCount} orphaned auth accounts and their sessions.`;
  },
});

