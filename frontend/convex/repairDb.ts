import { mutation } from "./_generated/server";

export const cleanOrphanedAccounts = mutation({
  args: {},
  handler: async (ctx) => {
    const authAccounts = await ctx.db.query("authAccounts").collect();
    let deleted = 0;
    for (const account of authAccounts) {
      const user = await ctx.db.get(account.userId);
      if (!user) {
        await ctx.db.delete(account._id);
        deleted++;
      }
    }
    
    const authSessions = await ctx.db.query("authSessions").collect();
    let deletedSessions = 0;
    for (const session of authSessions) {
      const user = await ctx.db.get(session.userId);
      if (!user) {
        await ctx.db.delete(session._id);
        deletedSessions++;
      }
    }
    
    return { deletedAccounts: deleted, deletedSessions };
  },
});
