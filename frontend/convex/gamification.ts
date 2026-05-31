import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── GET MY XP ───────────────────────────────────────────────────────────────

export const getMyXP = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (user?.role !== "student") return null;

    const xpData = await ctx.db
      .query("studentXP")
      .withIndex("by_student", (q) => q.eq("student", userId))
      .first();

    if (!xpData) {
      // Return default XP data if none exists
      return {
        student: userId,
        totalXP: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: undefined,
        weeklyXP: 0,
        weeklyResetAt: 0,
        unlockedItems: [],
        displayTitle: undefined,
      };
    }

    return xpData;
  },
});

// ─── AWARD XP (internal) ─────────────────────────────────────────────────────

export const awardXP = mutation({
  args: {
    studentId: v.id("users"),
    amount: v.number(),
    reason: v.string(),
    source: v.string(),
    referenceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const caller = await ctx.db.get(userId);
    // Only teachers, admins, or system can award XP
    if (caller?.role !== "teacher" && caller?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    // Get or create student XP record
    let xpRecord = await ctx.db
      .query("studentXP")
      .withIndex("by_student", (q) => q.eq("student", args.studentId))
      .first();

    const now = Date.now();
    let newTotalXP = args.amount;
    let newLevel = 1;
    let weeklyXP = args.amount;

    if (xpRecord) {
      newTotalXP = xpRecord.totalXP + args.amount;
      // Simple level formula: level = floor(totalXP / 100) + 1
      newLevel = Math.floor(newTotalXP / 100) + 1;

      // Check if weekly XP needs reset (older than 7 days)
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      weeklyXP = now - xpRecord.weeklyResetAt > weekMs
        ? args.amount
        : xpRecord.weeklyXP + args.amount;
    }

    const updatedFields: Record<string, any> = {
      totalXP: newTotalXP,
      level: newLevel,
      weeklyXP,
    };

    if (now - (xpRecord?.weeklyResetAt ?? 0) > 7 * 24 * 60 * 60 * 1000) {
      updatedFields.weeklyResetAt = now;
    }

    if (xpRecord) {
      await ctx.db.patch(xpRecord._id, updatedFields);
    } else {
      await ctx.db.insert("studentXP", {
        student: args.studentId,
        totalXP: newTotalXP,
        level: newLevel,
        currentStreak: 0,
        longestStreak: 0,
        weeklyXP,
        weeklyResetAt: now,
        unlockedItems: [],
      });
    }

    // Log the XP transaction
    await ctx.db.insert("xpLog", {
      student: args.studentId,
      amount: args.amount,
      reason: args.reason,
      source: args.source,
      referenceId: args.referenceId,
    });

    // Notify the student
    await ctx.db.insert("notifications", {
      recipient: args.studentId,
      title: `+${args.amount} XP Earned!`,
      message: args.reason,
      isRead: false,
      type: "badge",
    });

    return { success: true, newTotalXP, newLevel };
  },
});

// ─── LOG XP TRANSACTION ──────────────────────────────────────────────────────

export const logXP = mutation({
  args: {
    studentId: v.id("users"),
    amount: v.number(),
    reason: v.string(),
    source: v.string(),
    referenceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const caller = await ctx.db.get(userId);
    if (caller?.role !== "teacher" && caller?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const logId = await ctx.db.insert("xpLog", {
      student: args.studentId,
      amount: args.amount,
      reason: args.reason,
      source: args.source,
      referenceId: args.referenceId,
    });

    return logId;
  },
});

// ─── GET LEADERBOARD ─────────────────────────────────────────────────────────

export const getLeaderboard = query({
  args: {
    grade: v.optional(v.number()),
    classId: v.optional(v.id("users")), // class ID filter
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const maxResults = args.limit ?? 50;

    if (args.grade) {
      // Get students in the grade via userPreferences, then sort by XP
      // Since grade is in userPreferences, we fetch all XP records and filter
      const allXP = await ctx.db
        .query("studentXP")
        .withIndex("by_total_xp", (q) => q)
        .order("desc")
        .take(200);

      // Filter by grade using userPreferences
      const filtered: any[] = [];
      for (const xp of allXP) {
        const prefs = await ctx.db
          .query("userPreferences")
          .withIndex("by_student", (q) => q.eq("student", xp.student))
          .first();
        if (prefs?.grade === args.grade) {
          filtered.push(xp);
          if (filtered.length >= maxResults) break;
        }
      }
      return filtered;
    }

    // Global leaderboard (top XP)
    const results = await ctx.db
      .query("studentXP")
      .withIndex("by_total_xp", (q) => q)
      .order("desc")
      .take(maxResults);

    return results;
  },
});

// ─── CHECK AND AWARD STREAK ──────────────────────────────────────────────────

export const checkAndAwardStreak = mutation({
  args: { studentId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    // If studentId is provided, caller must be teacher/admin; otherwise self-check
    const targetStudentId = args.studentId || userId;
    if (args.studentId && args.studentId !== userId) {
      const caller = await ctx.db.get(userId);
      if (caller?.role !== "teacher" && caller?.role !== "admin") {
        throw new Error("Unauthorized");
      }
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    let xpRecord = await ctx.db
      .query("studentXP")
      .withIndex("by_student", (q) => q.eq("student", targetStudentId))
      .first();

    if (!xpRecord) {
      // Create initial XP record
      const newId = await ctx.db.insert("studentXP", {
        student: targetStudentId,
        totalXP: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        weeklyXP: 0,
        weeklyResetAt: Date.now(),
        unlockedItems: [],
      });
      xpRecord = await ctx.db.get(newId);
      if (!xpRecord) throw new Error("Failed to create XP record");
    }

    // Check if already logged activity today
    if (xpRecord.lastActivityDate === todayStr) {
      return { streak: xpRecord.currentStreak, awarded: false };
    }

    // Calculate yesterday's date
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

    let newStreak = 1;
    if (xpRecord.lastActivityDate === yesterdayStr) {
      newStreak = xpRecord.currentStreak + 1;
    }

    const newLongestStreak = Math.max(xpRecord.longestStreak, newStreak);

    await ctx.db.patch(xpRecord._id, {
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastActivityDate: todayStr,
    });

    // Award bonus XP for streak milestones
    let bonusXP = 0;
    if (newStreak === 3) bonusXP = 10;
    else if (newStreak === 7) bonusXP = 25;
    else if (newStreak === 14) bonusXP = 50;
    else if (newStreak === 30) bonusXP = 100;
    else if (newStreak === 60) bonusXP = 200;
    else if (newStreak === 100) bonusXP = 500;

    if (bonusXP > 0) {
      const updatedXP = xpRecord.totalXP + bonusXP;
      const newLevel = Math.floor(updatedXP / 100) + 1;

      await ctx.db.patch(xpRecord._id, {
        totalXP: updatedXP,
        level: newLevel,
      });

      await ctx.db.insert("xpLog", {
        student: targetStudentId,
        amount: bonusXP,
        reason: `${newStreak}-day streak bonus! 🔥`,
        source: "streak_badge",
      });

      // Check for streak achievements
      if (newStreak === 7) {
        await ctx.db.insert("achievements", {
          student: targetStudentId,
          achievementId: "streak_7",
          title: "Week Warrior",
          description: "Maintained a 7-day learning streak!",
          icon: "🔥",
          xpReward: 25,
          unlockedAt: Date.now(),
          tier: "bronze",
        });
      } else if (newStreak === 30) {
        await ctx.db.insert("achievements", {
          student: targetStudentId,
          achievementId: "streak_30",
          title: "Monthly Master",
          description: "Maintained a 30-day learning streak!",
          icon: "⚡",
          xpReward: 100,
          unlockedAt: Date.now(),
          tier: "silver",
        });
      } else if (newStreak === 100) {
        await ctx.db.insert("achievements", {
          student: targetStudentId,
          achievementId: "streak_100",
          title: "Centurion",
          description: "Achieved a 100-day learning streak!",
          icon: "👑",
          xpReward: 500,
          unlockedAt: Date.now(),
          tier: "gold",
        });
      }

      await ctx.db.insert("notifications", {
        recipient: targetStudentId,
        title: `🔥 ${newStreak}-Day Streak! +${bonusXP} XP`,
        message: `Amazing! You've been learning for ${newStreak} days in a row. Keep it up!`,
        isRead: false,
        type: "badge",
      });
    }

    return { streak: newStreak, awarded: bonusXP > 0, bonusXP };
  },
});

// ─── GET MY ACHIEVEMENTS ─────────────────────────────────────────────────────

export const getMyAchievements = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const achievements = await ctx.db
      .query("achievements")
      .withIndex("by_student", (q) => q.eq("student", userId))
      .collect();

    achievements.sort((a, b) => b.unlockedAt - a.unlockedAt);
    return achievements;
  },
});

// ─── AWARD ACHIEVEMENT ───────────────────────────────────────────────────────

export const awardAchievement = mutation({
  args: {
    studentId: v.id("users"),
    achievementId: v.string(),
    title: v.string(),
    description: v.string(),
    icon: v.string(),
    xpReward: v.number(),
    tier: v.union(
      v.literal("bronze"),
      v.literal("silver"),
      v.literal("gold"),
      v.literal("platinum")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const caller = await ctx.db.get(userId);
    if (caller?.role !== "teacher" && caller?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    // Check if achievement already awarded
    const existing = await ctx.db
      .query("achievements")
      .withIndex("by_student", (q) => q.eq("student", args.studentId))
      .filter((q) => q.eq(q.field("achievementId"), args.achievementId))
      .first();

    if (existing) return existing._id;

    const achievementId = await ctx.db.insert("achievements", {
      student: args.studentId,
      achievementId: args.achievementId,
      title: args.title,
      description: args.description,
      icon: args.icon,
      xpReward: args.xpReward,
      unlockedAt: Date.now(),
      tier: args.tier,
    });

    // Award the XP
    let xpRecord = await ctx.db
      .query("studentXP")
      .withIndex("by_student", (q) => q.eq("student", args.studentId))
      .first();

    if (xpRecord) {
      const newTotal = xpRecord.totalXP + args.xpReward;
      const newLevel = Math.floor(newTotal / 100) + 1;
      await ctx.db.patch(xpRecord._id, {
        totalXP: newTotal,
        level: newLevel,
      });
    } else {
      await ctx.db.insert("studentXP", {
        student: args.studentId,
        totalXP: args.xpReward,
        level: Math.floor(args.xpReward / 100) + 1,
        currentStreak: 0,
        longestStreak: 0,
        weeklyXP: args.xpReward,
        weeklyResetAt: Date.now(),
        unlockedItems: [],
      });
    }

    // Log XP
    await ctx.db.insert("xpLog", {
      student: args.studentId,
      amount: args.xpReward,
      reason: `Achievement unlocked: ${args.title}`,
      source: "achievement",
      referenceId: args.achievementId,
    });

    // Notify student
    await ctx.db.insert("notifications", {
      recipient: args.studentId,
      title: `🏆 Achievement Unlocked!`,
      message: `${args.title} — ${args.description} (+${args.xpReward} XP)`,
      isRead: false,
      type: "badge",
    });

    return achievementId;
  },
});
