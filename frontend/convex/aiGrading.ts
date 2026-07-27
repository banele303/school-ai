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

    const cfWorkerUrl = process.env.CLOUDFLARE_WORKER_URL || "https://edunexus-ai.edusqwizooor.workers.dev";
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;

    let text = "";

    if (apiKey) {
      try {
        const openai = createOpenAI({
          apiKey,
          baseURL: process.env.DEEPSEEK_API_KEY ? "https://api.deepseek.com/v1" : undefined,
        });
        const res = await generateText({
          prompt,
          model: openai.chat("deepseek-chat"),
        });
        text = res.text;
      } catch (err) {
        console.warn("Primary AI provider failed, trying Cloudflare Workers AI:", err);
      }
    }

    if (!text) {
      try {
        const cfRes = await fetch(`${cfWorkerUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (cfRes.ok) {
          const cfData: any = await cfRes.json();
          text = cfData.response || "";
        }
      } catch (cfErr) {
        console.error("Cloudflare Workers AI grading fallback failed:", cfErr);
      }
    }

    if (!text) {
      return {
        success: false,
        message: "AI service is currently unavailable. Please verify API keys or Cloudflare Workers AI setup.",
      };
    }

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
