import React, { createContext, useContext, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";

// 1. Create Context
const AuthContext = createContext<{
  user: any | null; // using any since type user might need to be synced with Convex
  loading: boolean;
  year: any | null;
  signOut: () => void;
}>({
  user: null,
  loading: true,
  year: null,
  signOut: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { signOut } = useAuthActions();
  const convexUser = useQuery(api.users.getMe);
  const currentYear = useQuery(api.academicYears.getCurrentAcademicYear);
  const ensureMathsLiteracy = useMutation(api.subjects.ensureMathsLiteracyExists);
  const updateMyProfile = useMutation(api.users.updateMyProfile);

  // We consider loading to be true if the queries are still undefined
  const loading = convexUser === undefined || currentYear === undefined;

  useEffect(() => {
    ensureMathsLiteracy().catch((err) => {
      console.error("Failed to ensure Maths Literacy subject exists:", err);
    });
  }, [ensureMathsLiteracy]);

  useEffect(() => {
    if (convexUser) {
      const pendingRole = localStorage.getItem("pendingGoogleRole");
      if (pendingRole) {
        updateMyProfile({ role: pendingRole as any }).catch(console.error);
        localStorage.removeItem("pendingGoogleRole");
      }
    }
  }, [convexUser, updateMyProfile]);

  return (
    <AuthContext.Provider
      value={{
        user: convexUser || null,
        loading,
        year: currentYear || null,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
