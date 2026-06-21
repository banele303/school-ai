import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { action } from "./_generated/server";
import { v } from "convex/values";

function isConvexIdLike(value: unknown) {
  return typeof value === "string" && /^[a-z0-9]{20,}$/.test(value);
}

const _auth = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = String(params.email || "").trim().toLowerCase();
        const role = email === "alexsouthflow@gmail.com" ? "admin" : ((params.role as string) || "student");
        const studentClass = isConvexIdLike(params.studentClass)
          ? params.studentClass
          : undefined;
        const teacherSubject = Array.isArray(params.teacherSubject)
          ? params.teacherSubject.filter(isConvexIdLike)
          : undefined;

        return {
          email,
          name: params.name as string,
          role,
          isActive: true,
          studentClass: studentClass as any,
          teacherSubject: teacherSubject && teacherSubject.length > 0 ? teacherSubject as any : undefined,
        };
      },
    }),
  ],
});

// Debug wrapper that catches signin errors and returns them
export const debugSignIn = action({
  args: {
    provider: v.optional(v.string()),
    params: v.optional(v.any()),
  },
  handler: async (ctx: any, args: any) => {
    try {
      const result = await _auth.signIn(ctx, { ...args, verifier: undefined, refreshToken: undefined });
      return { success: true, result };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || String(error),
        stack: error?.stack?.split("\n").slice(0, 5).join("\n"),
        env: {
          CONVEX_SITE_URL: process.env.CONVEX_SITE_URL,
          CUSTOM_AUTH_SITE_URL: process.env.CUSTOM_AUTH_SITE_URL,
          hasJwtKey: !!process.env.JWT_PRIVATE_KEY,
          hasAuthSecret: !!process.env.AUTH_SECRET,
        },
      };
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = _auth;

export const debugEnv = action({
  args: {},
  handler: async () => {
    return {
      CONVEX_SITE_URL: process.env.CONVEX_SITE_URL,
      CUSTOM_AUTH_SITE_URL: process.env.CUSTOM_AUTH_SITE_URL,
      SITE_URL: process.env.SITE_URL,
      hasJwtPrivateKey: !!process.env.JWT_PRIVATE_KEY,
    };
  },
});
