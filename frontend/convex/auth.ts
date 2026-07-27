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
        const profileObj: Record<string, any> = { email };

        if (params.name) {
          profileObj.name = params.name;
        }

        const isAdminEmail = ADMIN_EMAILS.includes(email);
        if (isAdminEmail) {
          profileObj.role = "admin";
          profileObj.isApproved = true;
          profileObj.isActive = true;
        } else if (params.role) {
          profileObj.role = params.role;
          profileObj.isApproved = params.role === "admin" || params.role === "parent";
          profileObj.isActive = true;
        }

        if (isConvexIdLike(params.studentClass)) {
          profileObj.studentClass = params.studentClass;
        }

        if (Array.isArray(params.teacherSubject)) {
          const teacherSubject = params.teacherSubject.filter(isConvexIdLike);
          if (teacherSubject.length > 0) {
            profileObj.teacherSubject = teacherSubject;
          }
        }

        return profileObj;
      },
    }),
    Google({
      profile(googleProfile) {
        const email = String(googleProfile.email || "").trim().toLowerCase();
        const isAdminEmail = ADMIN_EMAILS.includes(email);
        const profileObj: Record<string, any> = {
          id: googleProfile.sub,
          email,
          name: googleProfile.name,
          image: googleProfile.picture,
        };
        if (isAdminEmail) {
          profileObj.role = "admin";
          profileObj.isApproved = true;
          profileObj.isActive = true;
        }
        return profileObj;
      },
    }),
  ],
});
