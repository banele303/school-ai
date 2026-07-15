import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

function isConvexIdLike(value: unknown) {
  return typeof value === "string" && /^[a-z0-9]{20,}$/.test(value);
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = String(params.email || "").trim().toLowerCase();
        const role = (email === "alexsouthflow@gmail.com" || email === "ramadimukondi13@gmail.com") ? "admin" : ((params.role as string) || "student");
        const isApproved = (role === "admin" || role === "parent") ? true : false;
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
  ],
});
