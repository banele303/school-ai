"use node";
declare const process: { env: Record<string, string | undefined> };
import { action } from "./_generated/server";
import { v } from "convex/values";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { api } from "./_generated/api";

// ─── AI EXAM GRADING ACTION ───────────────────────────────────────
// Grades SHORT_ANSWER and ESSAY questions using AI.
// The teacher triggers this per-submission from the Exam page.
export const gradeWithAI = action({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        message: "AI service not configured. Please set DEEPSEEK_API_KEY in Convex dashboard.",
      };
    }

    // Fetch submission + exam details
    const detail: any = await ctx.runQuery(api.submissions.getSubmissionForGrading, {
      submissionId: args.submissionId,
    });
    if (!detail) throw new Error("Submission not found");

    const { submission, exam } = detail;
    if (!exam) throw new Error("Exam not found for grading");

    const openEndedTypes = ["SHORT_ANSWER", "ESSAY"];
    const openEndedQuestions = exam.questions.filter((q: any) =>
      openEndedTypes.includes(q.type)
    );

    if (openEndedQuestions.length === 0) {
      return { success: true, message: "No open-ended questions to grade", aiScore: 0 };
    }

    // Build grading payload
    const gradingItems = openEndedQuestions.map((q: any) => {
      const studentAns = submission.answers.find(
        (a: any) => a.questionId === q.questionText
      );
      return {
        questionText: q.questionText,
        type: q.type,
        modelAnswer: q.correctAnswer,
        studentAnswer: studentAns?.answer || "(no answer provided)",
        maxPoints: q.points,
      };
    });

    const prompt = `You are an expert South African CAPS curriculum examiner. Grade each student answer below.

GRADING RUBRIC:
- SHORT_ANSWER (2-5 sentence response): Award marks based on accuracy, completeness, and key terminology
- ESSAY (paragraph response): Award marks based on argument structure, evidence, insight, and CAPS curriculum alignment
- Award partial marks for partially correct answers. Be fair and constructive.
- Use South African schooling context and CAPS curriculum standards.

QUESTIONS TO GRADE:
${JSON.stringify(gradingItems, null, 2)}

RETURN ONLY valid JSON — no markdown fences, no explanation text:
{
  "gradedItems": [
    {
      "questionText": "<exact question text matching input>",
      "earnedPoints": <number between 0 and maxPoints>,
      "feedback": "<1-3 sentences: what was correct, what was missing, improvement tip>"
    }
  ],
  "totalEarned": <sum of all earnedPoints>,
  "overallFeedback": "<2-4 sentences: overall summary, strengths, areas to improve, encouragement>"
}`;

    const openai = createOpenAI({ apiKey, baseURL: "https://api.deepseek.com/v1" });
    const { text } = await generateText({
      prompt,
      model: openai.chat("deepseek-chat"),
    });

    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    let result: any;
    try {
      result = JSON.parse(cleanJson);
    } catch {
      throw new Error("AI returned malformed JSON. Please try again.");
    }

    const aiScore: number = result.totalEarned || 0;
    const overallFeedback: string = result.overallFeedback || "";

    // Build per-question feedback string
    const perQuestionFeedback = (result.gradedItems || [])
      .map((item: any) => {
        const gItem = gradingItems.find((g: any) => g.questionText === item.questionText);
        return `Q: ${item.questionText}\n→ Earned: ${item.earnedPoints}/${gItem?.maxPoints ?? "?"} pts\n   ${item.feedback}`;
      })
      .join("\n\n");

    const fullFeedback = [
      "╔══ AI MARKING REPORT ══╗",
      "",
      perQuestionFeedback,
      "",
      "─────────────────────────────────",
      `OVERALL FEEDBACK: ${overallFeedback}`,
    ].join("\n");

    // Save AI score + feedback to submission
    await ctx.runMutation(api.submissions.applyAIGrade, {
      submissionId: args.submissionId,
      aiScore,
      aiFeedback: fullFeedback,
    });

    return {
      success: true,
      aiScore,
      overallFeedback,
      gradedItems: result.gradedItems,
    };
  },
});
