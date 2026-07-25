import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const submitExam = mutation({
  args: {
    examId: v.id("exams"),
    answers: v.array(
      v.object({
        questionId: v.string(),
        answer: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Unauthorized");

    // Fetch exam
    const exam = await ctx.db.get(args.examId);
    if (!exam) throw new Error("Exam not found");

    // Check if student is in the right class
    if (user.role === "student" && exam.class !== user.studentClass) {
      throw new Error("Not authorized for this exam");
    }

    // For exams (not quizzes), check if already submitted
    if (exam.examType === "exam") {
      const existing = await ctx.db
        .query("submissions")
        .filter((q) =>
          q.and(
            q.eq(q.field("exam"), args.examId),
            q.eq(q.field("student"), user._id)
          )
        )
        .unique();
      if (existing) {
        throw new Error("Exam already submitted");
      }
    }

    // For quizzes, check attempt limit
    if (exam.examType === "quiz") {
      const existingAttempts = await ctx.db
        .query("submissions")
        .filter((q) =>
          q.and(
            q.eq(q.field("exam"), args.examId),
            q.eq(q.field("student"), user._id)
          )
        )
        .collect();

      const maxAttempts = exam.maxAttempts || 3;
      if (existingAttempts.length >= maxAttempts) {
        throw new Error(`Maximum attempts (${maxAttempts}) reached for this quiz`);
      }
    }

    // ─── Auto-grade objective questions ──────────────────────────
    // MCQ, TRUE_FALSE, FILL_BLANK, MATCH_COLUMN, CALCULATION → exact match
    // SHORT_ANSWER, ESSAY → queued for AI grading (score 0 initially)
    let score = 0;
    const needsAIGrading: string[] = []; // question texts that need AI grading

    const autoGradeTypes = ["MCQ", "TRUE_FALSE", "FILL_BLANK", "MATCH_COLUMN", "CALCULATION"];

    exam.questions.forEach((q: any) => {
      const ans = args.answers.find((a) => a.questionId === q.questionText);
      if (!ans) return;

      if (autoGradeTypes.includes(q.type)) {
        const studentAnswer = ans.answer.trim().toLowerCase();
        const correctAnswer = q.correctAnswer.trim().toLowerCase();

        if (q.type === "FILL_BLANK") {
          // Accept if student answer contains the correct key term
          if (
            studentAnswer === correctAnswer ||
            studentAnswer.includes(correctAnswer) ||
            correctAnswer.includes(studentAnswer)
          ) {
            score += q.points;
          }
        } else {
          if (studentAnswer === correctAnswer) {
            score += q.points;
          }
        }
      } else {
        // SHORT_ANSWER or ESSAY — mark for AI grading
        needsAIGrading.push(q.questionText);
      }
    });

    // Determine attempt number
    const existingSubs = await ctx.db
      .query("submissions")
      .filter((q) =>
        q.and(
          q.eq(q.field("exam"), args.examId),
          q.eq(q.field("student"), user._id)
        )
      )
      .collect();
    const attemptNumber = existingSubs.length + 1;

    const submissionId = await ctx.db.insert("submissions", {
      exam: args.examId,
      student: user._id,
      answers: args.answers,
      score,
      attemptNumber,
      aiFeedback: exam.examType === "quiz" && exam.instantFeedback
        ? generateInstantFeedback(exam, args.answers, score)
        : undefined,
    });

    return { submissionId, score, attemptNumber, needsAIGrading };
  },
});

// ─── Generate instant feedback (quiz mode only) ───────────────────
function generateInstantFeedback(
  exam: any,
  answers: { questionId: string; answer: string }[],
  score: number
): string {
  const totalPoints = exam.questions.reduce(
    (sum: number, q: any) => sum + (q.points || 0),
    0
  );
  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

  let feedback = `Quiz Results: ${score}/${totalPoints} (${percentage}%)\n\n`;

  exam.questions.forEach((q: any, i: number) => {
    const ans = answers.find((a) => a.questionId === q.questionText);
    const autoGradeTypes = ["MCQ", "TRUE_FALSE", "FILL_BLANK", "MATCH_COLUMN", "CALCULATION"];

    if (autoGradeTypes.includes(q.type)) {
      const isCorrect = ans && ans.answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      feedback += `Q${i + 1}: ${isCorrect ? "✅ Correct" : "❌ Incorrect"}\n`;
      if (!isCorrect) {
        feedback += `  Your answer: ${ans?.answer || "(no answer)"}\n`;
        feedback += `  Correct answer: ${q.correctAnswer}\n`;
      }
    } else {
      feedback += `Q${i + 1}: 📝 Written response — pending AI review\n`;
    }
    feedback += "\n";
  });

  return feedback;
}

// ─── Helper query for AI grading action (used by aiGrading.ts) ───
export const getSubmissionForGrading = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) return null;
    const exam = await ctx.db.get(submission.exam);
    return { submission, exam };
  },
});

// ─── Apply AI grade to submission ────────────────────────────────
export const applyAIGrade = mutation({
  args: {
    submissionId: v.id("submissions"),
    aiScore: v.number(),
    aiFeedback: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found");

    // Add AI score on top of auto-graded score
    const newTotal = (submission.score || 0) + args.aiScore;

    await ctx.db.patch(args.submissionId, {
      score: newTotal,
      aiFeedback: args.aiFeedback,
    });

    return { success: true, newTotal };
  },
});

// ─── Get teacher's ability to manually override AI grade ─────────
export const overrideScore = mutation({
  args: {
    submissionId: v.id("submissions"),
    newScore: v.number(),
    teacherFeedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "teacher" && user.role !== "admin")) {
      throw new Error("Only teachers and admins can override scores");
    }

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found");

    const updates: Record<string, any> = { score: args.newScore };
    if (args.teacherFeedback) {
      const existing = submission.aiFeedback || "";
      updates.aiFeedback = `${existing}\n\n─── TEACHER OVERRIDE ───\n${args.teacherFeedback}`;
    }

    await ctx.db.patch(args.submissionId, updates);
    return { success: true };
  },
});

export const getSubmissions = query({
  args: { examId: v.optional(v.id("exams")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Unauthorized");

    let submissionsQuery = ctx.db.query("submissions");

    if (args.examId) {
      submissionsQuery = submissionsQuery.filter((q) => q.eq(q.field("exam"), args.examId));
    }

    const submissions = await submissionsQuery.collect();

    // Students only see their own submissions
    if (user.role === "student") {
      return submissions.filter((s) => s.student === user._id);
    }

    // Teachers see submissions for their exams
    if (user.role === "teacher") {
      const teacherExams = await ctx.db
        .query("exams")
        .filter((q) => q.eq(q.field("teacher"), user._id))
        .collect();
      const teacherExamIds = new Set(teacherExams.map((e) => e._id.toString()));
      return submissions.filter((s) => teacherExamIds.has(s.exam.toString()));
    }

    // Admins see all
    return submissions;
  },
});

// Get student's best score for a quiz
export const getBestQuizScore = query({
  args: { examId: v.id("exams") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const submissions = await ctx.db
      .query("submissions")
      .filter((q) =>
        q.and(
          q.eq(q.field("exam"), args.examId),
          q.eq(q.field("student"), userId)
        )
      )
      .collect();

    if (submissions.length === 0) return null;

    return submissions.reduce((best, s) => (s.score > best.score ? s : best), submissions[0]);
  },
});

// Get all attempts for a student on a quiz
export const getMyAttempts = query({
  args: { examId: v.id("exams") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");

    const submissions = await ctx.db
      .query("submissions")
      .filter((q) =>
        q.and(
          q.eq(q.field("exam"), args.examId),
          q.eq(q.field("student"), userId)
        )
      )
      .collect();

    return submissions.sort((a, b) => (a.attemptNumber || 1) - (b.attemptNumber || 1));
  },
});
