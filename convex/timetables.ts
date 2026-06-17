declare const process: { env: Record<string, string | undefined> };
import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { api } from "./_generated/api";

export const getTimetable = query({
  args: { classId: v.id("classes"), academicYearId: v.id("academicYears") },
  handler: async (ctx, args) => {
    const timetable = await ctx.db
      .query("timetables")
      .filter((q) =>
        q.and(
          q.eq(q.field("class"), args.classId),
          q.eq(q.field("academicYear"), args.academicYearId)
        )
      )
      .unique();

    if (!timetable) return null;

    // Resolve subject and teacher details for each period
    const populatedSchedule = await Promise.all(
      (timetable.schedule || []).map(async (day: any) => {
        const populatedPeriods = await Promise.all(
          (day.periods || []).map(async (period: any) => {
            if (period.type === "break" || period.isBreak) {
              return {
                ...period,
                type: "break",
                isBreak: true,
                subject: { name: period.label || period.subject?.name || "Break", code: "BREAK" },
                teacher: { name: "N/A" }
              };
            }

            let subjectDetails = null;
            if (period.subject) {
              if (typeof period.subject === "string") {
                try {
                  subjectDetails = await ctx.db.get(period.subject as any);
                } catch { /* ignore */ }
              } else if (period.subject && typeof period.subject === "object" && period.subject._id) {
                subjectDetails = period.subject;
              }
            }

            let teacherDetails = null;
            if (period.teacher) {
              if (typeof period.teacher === "string") {
                try {
                  teacherDetails = await ctx.db.get(period.teacher as any);
                } catch { /* ignore */ }
              } else if (period.teacher && typeof period.teacher === "object" && period.teacher._id) {
                teacherDetails = period.teacher;
              }
            }

            return {
              ...period,
              subject: subjectDetails || { name: "Unknown Subject", code: "SUBJ" },
              teacher: teacherDetails || { name: "Unknown Teacher" },
            };
          })
        );
        return {
          ...day,
          periods: populatedPeriods,
        };
      })
    );

    // Resolve overrides if present
    let populatedOverrides: any[] = [];
    if (timetable.overrides) {
      populatedOverrides = await Promise.all(
        timetable.overrides.map(async (override: any) => {
          const populatedPeriods = await Promise.all(
            (override.periods || []).map(async (period: any) => {
              if (period.type === "break" || period.isBreak) {
                return {
                  ...period,
                  type: "break",
                  isBreak: true,
                  subject: { name: period.label || period.subject?.name || "Break", code: "BREAK" },
                  teacher: { name: "N/A" }
                };
              }

              let subjectDetails = null;
              if (period.subject) {
                if (typeof period.subject === "string") {
                  try {
                    subjectDetails = await ctx.db.get(period.subject as any);
                  } catch { /* ignore */ }
                } else if (period.subject && typeof period.subject === "object" && period.subject._id) {
                  subjectDetails = period.subject;
                }
              }

              let teacherDetails = null;
              if (period.teacher) {
                if (typeof period.teacher === "string") {
                  try {
                    teacherDetails = await ctx.db.get(period.teacher as any);
                  } catch { /* ignore */ }
                } else if (period.teacher && typeof period.teacher === "object" && period.teacher._id) {
                  teacherDetails = period.teacher;
                }
              }

              return {
                ...period,
                subject: subjectDetails || { name: "Unknown Subject", code: "SUBJ" },
                teacher: teacherDetails || { name: "Unknown Teacher" },
              };
            })
          );
          return {
            ...override,
            periods: populatedPeriods,
          };
        })
      );
    }

    return {
      ...timetable,
      schedule: populatedSchedule,
      overrides: populatedOverrides,
    };
  },
});

export const getGenerationContext = query({
  args: { classId: v.id("classes"), academicYearId: v.id("academicYears") },
  handler: async (ctx, args) => {
    const classData = await ctx.db.get(args.classId);
    if (!classData) throw new Error("Class not found");

    const subjects = await Promise.all(
      classData.subjects.map((id) => ctx.db.get(id))
    );

    const allTeachers = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "teacher"))
      .collect();

    const otherTimetables = await ctx.db
      .query("timetables")
      .filter((q) => q.eq(q.field("academicYear"), args.academicYearId))
      .collect();

    return {
      className: classData.name,
      subjects: subjects.filter(Boolean),
      teachers: allTeachers,
      otherTimetables,
    };
  },
});

export const saveTimetable = mutation({
  args: {
    classId: v.id("classes"),
    academicYearId: v.id("academicYears"),
    schedule: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    let schedule = args.schedule || [];
    if (schedule.length === 0) {
      schedule = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => ({
        day,
        periods: [],
      }));
    }

    const processedSchedule = schedule.map((day: any) => {
      const periods = day.periods ? [...day.periods] : [];

      // Ensure Breakfast break (10:00 - 10:30) is present
      const hasBreakfast = periods.some(
        (p: any) => p.startTime === "10:00" && (p.isBreak || p.type === "break")
      );
      if (!hasBreakfast) {
        periods.push({
          type: "break",
          isBreak: true,
          label: "Breakfast Break",
          startTime: "10:00",
          endTime: "10:30",
        });
      }

      // Ensure Lunch break (13:00 - 13:45) is present
      const hasLunch = periods.some(
        (p: any) => p.startTime === "13:00" && (p.isBreak || p.type === "break")
      );
      if (!hasLunch) {
        periods.push({
          type: "break",
          isBreak: true,
          label: "Lunch Break",
          startTime: "13:00",
          endTime: "13:45",
        });
      }

      // Sort all slots chronologically
      periods.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

      return {
        day: day.day,
        periods,
      };
    });

    const existing = await ctx.db
      .query("timetables")
      .filter((q) =>
        q.and(
          q.eq(q.field("class"), args.classId),
          q.eq(q.field("academicYear"), args.academicYearId)
        )
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { schedule: processedSchedule });
    } else {
      await ctx.db.insert("timetables", {
        class: args.classId,
        academicYear: args.academicYearId,
        schedule: processedSchedule,
      });
    }
  },
});

export const saveOverride = mutation({
  args: {
    classId: v.id("classes"),
    academicYearId: v.id("academicYears"),
    date: v.string(), // ISO "YYYY-MM-DD"
    label: v.optional(v.string()),
    periods: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("timetables")
      .filter((q) =>
        q.and(
          q.eq(q.field("class"), args.classId),
          q.eq(q.field("academicYear"), args.academicYearId)
        )
      )
      .unique();

    if (!existing) throw new Error("Timetable template not found");

    const overrides = existing.overrides ? [...existing.overrides] : [];
    const idx = overrides.findIndex((o) => o.date === args.date);

    const cleanOverride = {
      date: args.date,
      label: args.label,
      periods: args.periods.map((period: any) => {
        if (period.isBreak || period.type === "break") {
          return {
            type: "break",
            isBreak: true,
            label: period.label || period.subject?.name || "Break",
            startTime: period.startTime,
            endTime: period.endTime,
          };
        }
        return {
          subject: period.subject?._id || period.subject,
          teacher: period.teacher?._id || period.teacher,
          startTime: period.startTime,
          endTime: period.endTime,
        };
      }),
    };

    if (idx !== -1) {
      overrides[idx] = cleanOverride;
    } else {
      overrides.push(cleanOverride);
    }

    await ctx.db.patch(existing._id, { overrides });
  },
});

export const removeOverride = mutation({
  args: {
    classId: v.id("classes"),
    academicYearId: v.id("academicYears"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("timetables")
      .filter((q) =>
        q.and(
          q.eq(q.field("class"), args.classId),
          q.eq(q.field("academicYear"), args.academicYearId)
        )
      )
      .unique();

    if (!existing) return;

    const overrides = existing.overrides ? [...existing.overrides] : [];
    const filtered = overrides.filter((o) => o.date !== args.date);

    await ctx.db.patch(existing._id, { overrides: filtered });
  },
});

export const generateTimetable = action({
  args: {
    classId: v.id("classes"),
    academicYearId: v.id("academicYears"),
    settings: v.object({
      startTime: v.string(),
      endTime: v.string(),
      periods: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(api.timetables.getGenerationContext, {
      classId: args.classId,
      academicYearId: args.academicYearId,
    });

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return { schedule: [] };

    const prompt = `
      You are an expert school scheduler. Generate a weekly timetable (Monday to Friday) for a South African school as a JSON object.
      
      CONTEXT:
      - Class: ${context.className}
      - Hours: ${args.settings.startTime} to ${args.settings.endTime} (${args.settings.periods} periods/day).
      - Subjects: ${JSON.stringify(context.subjects.map((s: any) => ({ id: s._id, name: s.name })))}
      - Teachers: ${JSON.stringify(context.teachers.map((t: any) => ({ id: t._id, name: t.name })))}
      
      STRICT RULES:
      1. Assign a Teacher to every Subject period.
      2. Ensure no teacher is double-booked across other existing timetables (if provided).
      3. Output ONLY raw JSON matching this schema:
         { "schedule": [ { "day": "Monday", "periods": [ { "subject": "ID", "teacher": "ID", "startTime": "HH:MM", "endTime": "HH:MM" } ] } ] }
      4. No conversational text or markdown.
    `;

    const openai = createOpenAI({ apiKey, baseURL: "https://api.deepseek.com/v1" });
    const { text } = await generateText({
      prompt,
      model: openai("deepseek-chat"),
    });

    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanJson);
    const schedule = result.schedule || result; // Handle both direct array or object with schedule key

    await ctx.runMutation(api.timetables.saveTimetable, {
      classId: args.classId,
      academicYearId: args.academicYearId,
      schedule: Array.isArray(schedule) ? schedule : [],
    });

    return { success: true };
  },
});
