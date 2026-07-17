import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";

const ADMIN_EMAILS = [
  "alexsouthflow@gmail.com",
  "ramadimukondi13@gmail.com",
  "alexsouthflow2@gmail.com",
  "alxsouthflow2@gmail.com",
];

function isConvexIdLike(value: unknown) {
  return typeof value === "string" && /^[a-z0-9]{20,}$/.test(value);
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = String(params.email || "").trim().toLowerCase();
        const role = ADMIN_EMAILS.includes(email)
          ? "admin"
          : ((params.role as string) || "student");
        const isApproved = role === "admin" || role === "parent";
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
          isApproved,
          studentClass: studentClass as any,
          teacherSubject: teacherSubject && teacherSubject.length > 0 ? teacherSubject as any : undefined,
        };
      },
    }),
    Google({
      profile(googleProfile) {
        const email = String(googleProfile.email || "").trim().toLowerCase();
        const role = ADMIN_EMAILS.includes(email) ? "admin" : "student";
        const isApproved = role === "admin";
        return {
          id: googleProfile.sub,
          email,
          name: googleProfile.name,
          image: googleProfile.picture,
          role,
          isActive: true,
          isApproved,
        };
      },
    }),
  ],
});
