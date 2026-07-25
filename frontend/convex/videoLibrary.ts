declare const process: { env: Record<string, string | undefined> };
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── GET VIDEOS (with filters) ──────────────────────────────────────────────

export const getVideos = query({
  args: {
    subject: v.optional(v.id("subjects")),
    grade: v.optional(v.number()),
    playlist: v.optional(v.string()),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user) return [];

    let allowedSubjectIds: Set<string> | null = null;
    if (user.role === "student") {
      if (!user.studentClass) return [];
      const studentClass = await ctx.db.get(user.studentClass);
      if (!studentClass) return [];
      allowedSubjectIds = new Set(studentClass.subjects);
    } else if (user.role === "parent") {
      if (!user.linkedStudent) return [];
      const student = await ctx.db.get(user.linkedStudent);
      if (!student || !student.studentClass) return [];
      const studentClass = await ctx.db.get(student.studentClass);
      if (!studentClass) return [];
      allowedSubjectIds = new Set(studentClass.subjects);
    }

    let videos;

    if (args.playlist) {
      videos = await ctx.db
        .query("videoLibrary")
        .withIndex("by_playlist", (q) => q.eq("playlist", args.playlist!))
        .collect();
      videos.sort((a, b) => (a.playlistOrder ?? 0) - (b.playlistOrder ?? 0));
    } else if (args.subject) {
      videos = await ctx.db
        .query("videoLibrary")
        .withIndex("by_subject", (q) => q.eq("subject", args.subject!))
        .collect();
    } else if (args.grade) {
      videos = await ctx.db
        .query("videoLibrary")
        .withIndex("by_grade", (q) => q.eq("grade", args.grade!))
        .collect();
    } else {
      videos = await ctx.db
        .query("videoLibrary")
        .withIndex("by_published", (q) => q.eq("isPublished", true))
        .collect();
    }

    // Include ended live classes with recordings
    const endedLiveClasses = await ctx.db
      .query("liveClasses")
      .withIndex("by_status", (q) => q.eq("status", "ended"))
      .collect();
      
    const liveRecordings = endedLiveClasses
      .filter((lc) => lc.recordingUrl) // has a recording URL
      .map((lc) => ({
        _id: lc._id,
        _creationTime: lc._creationTime,
        title: `Live Recording: ${lc.title}`,
        description: lc.description,
        subject: lc.subject,
        teacher: lc.teacher,
        videoUrl: lc.recordingUrl!,
        videoType: "cloudflare-live" as any,
        streamInputId: lc.streamInputId,
        isPublished: true,
        viewCount: 0, // we can't easily track views on live classes yet
        tags: ["live-recording"],
        playlist: "Live Recordings",
        playlistOrder: lc._creationTime,
      }));

    videos = [...videos, ...liveRecordings] as any;

    // Apply class subjects restriction for students/parents
    if (allowedSubjectIds !== null) {
      videos = videos.filter((v: any) => allowedSubjectIds!.has(v.subject));
    }

    // Apply additional filters
    if (args.subject && args.playlist) {
      videos = videos.filter((v: any) => v.subject === args.subject);
    }
    if (args.grade && (args.subject || args.playlist)) {
      videos = videos.filter((v: any) => v.grade === args.grade);
    }

    // Search filter
    if (args.searchTerm) {
      const term = args.searchTerm.toLowerCase();
      videos = videos.filter(
        (v: any) =>
          v.title.toLowerCase().includes(term) ||
          (v.description && v.description.toLowerCase().includes(term)) ||
          v.tags.some((t: any) => t.toLowerCase().includes(term)) ||
          (v.topic && v.topic.toLowerCase().includes(term))
      );
    }

    return videos;
  },
});

// ─── CREATE VIDEO ────────────────────────────────────────────────────────────

export const createVideo = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    subject: v.id("subjects"),
    videoUrl: v.string(),
    videoType: v.union(
      v.literal("youtube"),
      v.literal("r2"),
      v.literal("external")
    ),
    thumbnailUrl: v.optional(v.string()),
    duration: v.optional(v.number()),
    grade: v.optional(v.number()),
    topic: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    syllabusTopic: v.optional(v.id("syllabusTopics")),
    playlist: v.optional(v.string()),
    playlistOrder: v.optional(v.number()),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (user?.role !== "teacher" && user?.role !== "admin") {
      throw new Error("Only teachers and admins can add videos");
    }

    const videoId = await ctx.db.insert("videoLibrary", {
      title: args.title,
      description: args.description,
      subject: args.subject,
      teacher: userId,
      videoUrl: args.videoUrl,
      videoType: args.videoType,
      thumbnailUrl: args.thumbnailUrl,
      duration: args.duration,
      grade: args.grade,
      topic: args.topic,
      tags: args.tags ?? [],
      syllabusTopic: args.syllabusTopic,
      playlist: args.playlist,
      playlistOrder: args.playlistOrder,
      viewCount: 0,
      isPublished: args.isPublished ?? false,
    });

    return videoId;
  },
});

// ─── UPDATE VIDEO ────────────────────────────────────────────────────────────

export const updateVideo = mutation({
  args: {
    videoId: v.id("videoLibrary"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    videoType: v.optional(
      v.union(v.literal("youtube"), v.literal("r2"), v.literal("external"))
    ),
    thumbnailUrl: v.optional(v.string()),
    duration: v.optional(v.number()),
    grade: v.optional(v.number()),
    topic: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    syllabusTopic: v.optional(v.id("syllabusTopics")),
    playlist: v.optional(v.string()),
    playlistOrder: v.optional(v.number()),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");

    if (video.teacher !== userId && user?.role !== "admin") {
      throw new Error("Unauthorized: you are not the owner of this video");
    }

    const { videoId, ...updates } = args;
    await ctx.db.patch(videoId, updates);
    return { success: true };
  },
});

// ─── DELETE VIDEO ────────────────────────────────────────────────────────────

export const deleteVideo = mutation({
  args: { videoId: v.id("videoLibrary") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");

    if (video.teacher !== userId && user?.role !== "admin") {
      throw new Error("Unauthorized: you are not the owner of this video");
    }

    // Delete all progress records for this video
    const progressRecords = await ctx.db
      .query("videoProgress")
      .withIndex("by_video", (q) => q.eq("video", args.videoId))
      .collect();

    for (const record of progressRecords) {
      await ctx.db.delete(record._id);
    }

    await ctx.db.delete(args.videoId);
    return { success: true };
  },
});

// ─── INCREMENT VIEW COUNT ────────────────────────────────────────────────────

export const incrementViewCount = mutation({
  args: { videoId: v.id("videoLibrary") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");

    await ctx.db.patch(args.videoId, {
      viewCount: video.viewCount + 1,
    });

    return { success: true };
  },
});

// ─── UPDATE VIDEO PROGRESS ───────────────────────────────────────────────────

export const updateVideoProgress = mutation({
  args: {
    videoId: v.id("videoLibrary"),
    progress: v.number(), // seconds watched
    percentage: v.number(), // 0-100
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (user?.role !== "student") {
      throw new Error("Only students can track video progress");
    }

    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");

    const isCompleted = args.completed ?? args.percentage >= 90;

    // Check for existing progress record
    const existing = await ctx.db
      .query("videoProgress")
      .withIndex("by_video", (q) => q.eq("video", args.videoId))
      .filter((q) => q.eq(q.field("student"), userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        progress: args.progress,
        percentage: args.percentage,
        completed: isCompleted,
        lastWatchedAt: Date.now(),
      });
      return existing._id;
    } else {
      const progressId = await ctx.db.insert("videoProgress", {
        video: args.videoId,
        student: userId,
        progress: args.progress,
        percentage: args.percentage,
        completed: isCompleted,
        lastWatchedAt: Date.now(),
      });
      return progressId;
    }
  },
});

// ─── GET MY PROGRESS ─────────────────────────────────────────────────────────

export const getMyProgress = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (user?.role !== "student") return [];

    if (!user.studentClass) return [];
    const studentClass = await ctx.db.get(user.studentClass);
    if (!studentClass) return [];
    const allowedSubjectIds = new Set(studentClass.subjects);

    const progressRecords = await ctx.db
      .query("videoProgress")
      .withIndex("by_student", (q) => q.eq("student", userId))
      .collect();

    // Enrich with video details
    const enriched = await Promise.all(
      progressRecords.map(async (record) => {
        const video = await ctx.db.get(record.video);
        return {
          ...record,
          videoTitle: video?.title ?? "Unknown",
          videoThumbnail: video?.thumbnailUrl,
          subject: video?.subject,
          grade: video?.grade,
        };
      })
    );

    // Filter out videos not for their class
    return enriched.filter((item) => item.subject && allowedSubjectIds.has(item.subject));
  },
});

// ─── GET PLAYLIST ────────────────────────────────────────────────────────────

export const getPlaylist = query({
  args: { playlistName: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user) return [];

    let allowedSubjectIds: Set<string> | null = null;
    if (user.role === "student") {
      if (!user.studentClass) return [];
      const studentClass = await ctx.db.get(user.studentClass);
      if (!studentClass) return [];
      allowedSubjectIds = new Set(studentClass.subjects);
    } else if (user.role === "parent") {
      if (!user.linkedStudent) return [];
      const student = await ctx.db.get(user.linkedStudent);
      if (!student || !student.studentClass) return [];
      const studentClass = await ctx.db.get(student.studentClass);
      if (!studentClass) return [];
      allowedSubjectIds = new Set(studentClass.subjects);
    }

    let videos = await ctx.db
      .query("videoLibrary")
      .withIndex("by_playlist", (q) => q.eq("playlist", args.playlistName))
      .collect();

    // Apply class subjects restriction for students/parents
    if (allowedSubjectIds !== null) {
      videos = videos.filter((v) => allowedSubjectIds!.has(v.subject));
    }

    videos.sort((a, b) => (a.playlistOrder ?? 0) - (b.playlistOrder ?? 0));
    return videos;
  },
});
