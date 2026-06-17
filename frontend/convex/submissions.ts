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

    // Calculate score — auto-grade MCQ, TRUE_FALSE, FILL_BLANK, MATCH_COLUMN, CALCULATION
    // SHORT_ANSWER and ESSAY need manual/AI grading (score 0 for now)
    let score = 0;
    let totalAutoGradable = 0;
    let autoGradedCount = 0;

    const autoGradeTypes = ["MCQ", "TRUE_FALSE", "FILL_BLANK", "MATCH_COLUMN", "CALCULATION"];

    exam.questions.forEach((q: any) => {
      const ans = args.answers.find((a) => a.questionId === q.questionText);
      if (!ans) return;

      if (autoGradeTypes.includes(q.type)) {
        totalAutoGradable += q.points;
        const maxPoints = ans.answer.includes("[HINT_USED]")
          ? Math.ceil(q.points * 0.6)
          : q.points;
        if (q.type === "MATCH_COLUMN") {
          if (Array.isArray(q.matchPairs) && q.matchPairs.length > 0) {
            const perPair = q.points / q.matchPairs.length;
            let pairScore = 0;
            q.matchPairs.forEach((pair: any) => {
              const pairAnswer = args.answers.find(
                (a) => a.questionId === `${q.questionText} [${pair.left}]`
              );
              if (pairAnswer?.answer.trim().toLowerCase() === pair.right.trim().toLowerCase()) {
                pairScore += perPair;
              }
            });
            score += Math.min(maxPoints, Math.round(pairScore));
            if (pairScore > 0) autoGradedCount++;
          } else if (ans.answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
            score += maxPoints;
            autoGradedCount++;
          }
        } else if (q.type === "CALCULATION" && Array.isArray(q.calculationSteps) && q.calculationSteps.length > 0) {
          const normalizedAnswer = ans.answer.replace("[HINT_USED]", "").trim().toLowerCase();
          if (normalizedAnswer === q.correctAnswer.trim().toLowerCase()) {
            score += maxPoints;
            autoGradedCount++;
          } else {
            const matchedSteps = q.calculationSteps.filter((step: string) =>
              normalizedAnswer.includes(step.toLowerCase().slice(0, Math.min(step.length, 28)))
            ).length;
            const partial = Math.floor((matchedSteps / q.calculationSteps.length) * q.points);
            score += Math.min(maxPoints, partial);
            if (partial > 0) autoGradedCount++;
          }
        } else {
          if (ans.answer.replace("[HINT_USED]", "").trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
            score += maxPoints;
            autoGradedCount++;
          }
        }
      }
      // SHORT_ANSWER and ESSAY are not auto-graded — teacher must grade manually
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

    return { submissionId, score, attemptNumber };
  },
});

// Generate instant feedback for quiz mode
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
    const isCorrect = ans && ans.answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
    feedback += `Q${i + 1}: ${isCorrect ? "✅ Correct" : "❌ Incorrect"}\n`;
    if (!isCorrect) {
      feedback += `  Your answer: ${ans?.answer || "(no answer)"}\n`;
      feedback += `  Correct answer: ${q.correctAnswer}\n`;
    }
    feedback += "\n";
  });

  return feedback;
}

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
