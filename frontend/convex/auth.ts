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
        const isAdminEmail = ADMIN_EMAILS.includes(email);
        const studentClass = isConvexIdLike(params.studentClass)
          ? params.studentClass
          : undefined;
        const teacherSubject = Array.isArray(params.teacherSubject)
          ? params.teacherSubject.filter(isConvexIdLike)
          : undefined;

        return {
          email,
          ...(params.name ? { name: params.name } : {}),
          ...(isAdminEmail
            ? { role: "admin", isApproved: true, isActive: true }
            : params.role
            ? { role: params.role, isApproved: params.role === "admin" || params.role === "parent", isActive: true }
            : {}),
          ...(studentClass ? { studentClass: studentClass as any } : {}),
          ...(teacherSubject && teacherSubject.length > 0
            ? { teacherSubject: teacherSubject as any }
            : {}),
          onboardingCompleted: true,
        };
      },
    }),
    Google({
      profile(googleProfile) {
        const email = String(googleProfile.email || "").trim().toLowerCase();
        const isAdminEmail = ADMIN_EMAILS.includes(email);
        return {
          id: googleProfile.sub,
          email,
          name: googleProfile.name,
          image: googleProfile.picture,
          ...(isAdminEmail 
            ? { role: "admin", isApproved: true, isActive: true, onboardingCompleted: true } 
            : { role: "student", isApproved: false, isActive: true, onboardingCompleted: false }),
        };
      },
    }),
  ],
});
