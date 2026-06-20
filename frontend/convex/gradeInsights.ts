declare const process: { env: Record<string, string | undefined> };
import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { api } from "./_generated/api";

// Get insights for an exam
export const getInsights = query({
  args: { examId: v.id("exams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gradeInsights")
      .withIndex("by_exam", (q) => q.eq("exam", args.examId))
      .first();
  },
});

// Generate AI-powered grade analysis for a completed exam
export const generateInsights = action({
  args: { examId: v.id("exams") },
  handler: async (ctx, args) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return;

    // Fetch exam and submissions
    const exam = await ctx.runQuery(api.exams.getExam, { id: args.examId });
    if (!exam) throw new Error("Exam not found");

    const submissions = await ctx.runQuery(api.submissions.getSubmissions, {
      examId: args.examId,
    });

    if (!submissions.length) throw new Error("No submissions to analyse");

    const totalPoints = exam.questions.reduce((sum: number, q: any) => sum + q.points, 0);
    const scores = submissions.map((s) => s.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const pass = scores.filter((s) => s >= totalPoints * 0.5).length;
    const fail = scores.length - pass;

    // Analyse per-question performance
    const questionStats = exam.questions.map((q: any, _i: number) => {
      const correct = submissions.filter((s) => {
        const ans = s.answers.find((a: any) => a.questionId === q.questionText);
        return ans?.answer === q.correctAnswer;
      }).length;
      return {
        question: q.questionText.substring(0, 60),
        correctRate: Math.round((correct / submissions.length) * 100),
      };
    });

    const weakQuestions = questionStats
      .filter((q) => q.correctRate < 50)
      .map((q) => `"${q.question}" (${q.correctRate}% correct)`);
    const strongQuestions = questionStats
      .filter((q) => q.correctRate >= 80)
      .map((q) => `"${q.question}" (${q.correctRate}% correct)`);

    const prompt = `You are an experienced South African teacher analysing exam results for students ranging from Grade 5 to Grade 12. Provide concise, actionable insights.
If the exam title or content suggests a specific local language (e.g., isiZulu, Sesotho, Afrikaans, Tshivenda, isiXhosa), provide your summary and recommended actions in that language. Otherwise, use English.

Exam: "${exam.title}"
Total students: ${submissions.length}
Average score: ${avg.toFixed(1)}/${totalPoints} (${((avg / totalPoints) * 100).toFixed(0)}%)
Passed: ${pass}, Failed: ${fail}

Weak areas (below 50% correct): ${weakQuestions.join(", ") || "None"}
Strong areas (above 80% correct): ${strongQuestions.join(", ") || "None"}

Provide:
1. A 2-sentence summary of overall class performance.
2. Three specific recommended teaching actions.

Respond in JSON format:
{
  "summary": "...",
  "recommendedActions": ["action 1", "action 2", "action 3"]
}`;

    const openai = createOpenAI({ apiKey, baseURL: "https://api.deepseek.com/v1" });
    const { text } = await generateText({
      model: openai("deepseek-chat"),
      prompt,
    });

    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(clean);

    const userId = await ctx.runQuery(api.users.getCurrentUser);

    await ctx.runMutation(api.gradeInsightsMutations.saveInsights, {
      examId: args.examId,
      teacherId: userId?._id!,
      summary: parsed.summary,
      weakAreas: weakQuestions,
      strongAreas: strongQuestions,
      recommendedActions: parsed.recommendedActions,
    });

    return parsed;
  },
});
