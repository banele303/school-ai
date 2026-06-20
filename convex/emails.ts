import { action } from "./_generated/server";
import { v } from "convex/values";

export const sendLiveClassInviteEmail = action({
  args: {
    email: v.string(),
    classTitle: v.string(),
    teacherName: v.string(),
    startTimeStr: v.string(),
    joinUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const RESEND_API_KEY = "re_9wZzyvM6_Kd6KXUF57QP7BBSTyQjYPDRW";
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #e11d48; margin-bottom: 20px;">Vhembe Rising Star Academy</h2>
        <p>Dear Learner,</p>
        <p>You have been invited by teacher <strong>${args.teacherName}</strong> to join a live online learning class:</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #e11d48; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e293b; font-size: 16px;">${args.classTitle}</h3>
          <p style="margin-bottom: 0; font-size: 14px; color: #64748b;">
            📅 <strong>Date/Time:</strong> ${args.startTimeStr}
          </p>
        </div>
        
        <p>You can join the interactive classroom directly by clicking the button below:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${args.joinUrl}" style="background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(225, 29, 72, 0.2);">Join Live Class</a>
        </p>
        
        <p style="font-size: 12px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
          If the button doesn't work, copy and paste this URL into your browser: <br/>
          <a href="${args.joinUrl}" style="color: #2563eb; word-break: break-all;">${args.joinUrl}</a>
        </p>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Edunexus Live <onboarding@resend.dev>",
        to: args.email,
        subject: `Live Class Invitation: ${args.classTitle}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send email via Resend: ${errorText}`);
    }

    return await response.json();
  },
});
