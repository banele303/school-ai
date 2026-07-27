import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";

import {
  type Class,
  type UserRole,
  type subject,
  type user,
} from "@/types";
import { FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/global/CustomInput";
import { CustomSelect } from "@/components/global/CustomSelect";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import { CustomMultiSelect } from "@/components/global/CustomMultiSelect";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";

export type FormType = "login" | "create" | "update";
interface Props {
  type: FormType;
  initialData?: user | null;
  onSuccess?: () => void;
  role?: UserRole;
}

const createSchema = (type: FormType) => {
  return z
    .object({
      name:
        type === "login"
          ? z.string().optional()
          : z.string().min(2, "Name is required"),
      classId: z.string().optional(),
      subjectIds: z.array(z.string()).optional(),
      email: z.string().email("Invalid email address"),
      role: z.string().optional(),
      password:
        type === "update"
          ? z
              .string()
              .optional()
              .refine((val) => !val || val.length >= 6, {
                message: "Password must be at least 6 characters",
              })
          : z.string().min(6, "Password must be at least 6 characters"),
      confirmPassword:
        type === "create"
          ? z.string().min(8, {
              message: "Password must be at least 8 characters.",
            })
          : z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (type === "create" && data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passwords don't match",
          path: ["confirmPassword"],
        });
      }
    });
};

type FormValues = z.infer<ReturnType<typeof createSchema>>;

const UniversalUserForm = ({ type, initialData, onSuccess, role }: Props) => {
  useAuth(); // ensure auth context is initialized
  const isUpdate = type === "update";
  const isLogin = type === "login";

  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [subjects, setSubjects] = useState<subject[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(createSchema(type)),
    defaultValues: {
      name: "",
      email: "",
      role: role,
      password: "",
      classId: undefined,
      subjectIds: [],
    },
  });

  const shouldFetch = !isLogin;
  const convexClasses = useQuery(
    api.classes.getClasses,
    shouldFetch ? { academicYear: undefined } : "skip"
  );
  const convexSubjects = useQuery(
    api.subjects.getSubjects,
    shouldFetch ? {} : "skip"
  );
  const { signIn } = useAuthActions();
  const createAdminUser = useMutation(api.adminUsers.createUserAdmin);
  const updateConvexUser = useMutation(api.users.updateUser);

  useEffect(() => {
    if (convexClasses !== undefined) {
      setClasses(convexClasses as any);
      setLoading(false);
    } else if (!shouldFetch) {
      setLoading(false);
    }
  }, [convexClasses, shouldFetch]);

  useEffect(() => {
    if (convexSubjects !== undefined) {
      setSubjects(convexSubjects as any);
      setLoadingOptions(false);
    } else if (!shouldFetch) {
      setLoadingOptions(false);
    }
  }, [convexSubjects, shouldFetch]);

  // Populate form for Update mode
  useEffect(() => {
    if (initialData && isUpdate) {
      const existingClassId =
        typeof initialData.studentClass === "object"
          ? (initialData.studentClass as any)?._id
          : initialData.studentClass;

      const existingSubjectIds =
        initialData.teacherSubjects?.map((s) => s._id) ||
        (Array.isArray((initialData as any).teacherSubject)
          ? (initialData as any).teacherSubject
          : []);

      form.reset({
        name: initialData.name || "",
        email: initialData.email || "",
        role: initialData.role || "student",
        password: "",
        classId: existingClassId || "",
        subjectIds: existingSubjectIds,
      });
    }
  }, [isUpdate, initialData, form, classes]);

  async function onSubmit(data: FormValues) {
    try {
      if (isLogin) {
        await signIn("password", {
          email: data.email,
          password: data.password!,
          flow: "signIn",
        });
        toast.success("Logged in successfully");
        window.location.href = "/dashboard";
      } else if (type === "create") {
        if (!isLogin && !role) {
          // Self-signup
          const result = await signIn("password", {
            email: data.email,
            password: data.password!,
            flow: "signUp",
            name: data.name!,
            role: (data.role || role || "student") as UserRole,
            studentClass: data.classId as any,
            teacherSubject: data.subjectIds as any,
          });
          if (result?.signingIn) {
            toast.success("Account created successfully!");
            window.location.href = "/dashboard";
          }
        } else {
          // Admin creating a user
          await createAdminUser({
            name: data.name as string,
            email: data.email,
            role: (data.role || role || "student") as UserRole,
            classId: data.classId as any,
            subjectIds: data.subjectIds as any,
          });
          toast.success("User created successfully.");
          if (onSuccess) onSuccess();
        }
      } else if (type === "update" && initialData?._id) {
        await updateConvexUser({
          id: initialData._id as any,
          name: data.name,
          email: data.email,
          role: data.role as UserRole,
          studentClass: data.classId as any,
          teacherSubject: data.subjectIds as any,
        });
        toast.success("User updated successfully");
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
      console.log(error);
      let friendlyMessage = error.message || "An error occurred. Please try again.";
      if (friendlyMessage.includes("InvalidAccountId")) {
        friendlyMessage = isLogin
          ? "Account not found. Please sign up to register."
          : "Account not found. Please sign up to register.";
      } else if (friendlyMessage.includes("InvalidSecret")) {
        friendlyMessage = "Incorrect password. Please try again.";
      } else if (friendlyMessage.includes("TooManyFailedAttempts")) {
        friendlyMessage = "Too many failed attempts. Please try again later.";
      }
      toast.error(friendlyMessage);
    }
  }

  const classOptions =
    Array.isArray(classes) && classes.length > 0
      ? classes.map((c) => ({ label: c.name, value: c._id }))
      : [];

  const subjectOptions =
    Array.isArray(subjects) && subjects.length > 0
      ? subjects.map((s) => ({
          label: s.grade ? `${s.name} (Grade ${s.grade})` : s.name,
          value: s._id,
        }))
      : [];

  const roleOptions = role
    ? [{ label: role, value: role }]
    : [
        { label: "Student", value: "student" },
        { label: "Teacher", value: "teacher" },
        { label: "Parent", value: "parent" },
      ];

  const selectedRole = form.watch("role");
  const pending = form.formState.isSubmitting;
  const showRoleSelector = !isLogin;
  const showClassSelector = !isLogin && selectedRole === "student";
  const showSubjectSelector = !isLogin && selectedRole === "teacher";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <div className="grid grid-cols-2 gap-4 w-full">
          {!isLogin && (
            <CustomInput
              control={form.control}
              name="name"
              label="Full Name"
              placeholder="Jane Doe"
              disabled={pending}
            />
          )}

          <CustomInput
            control={form.control}
            name="email"
            label="Email Address"
            placeholder="jane@school.com"
            disabled={pending}
          />

          {!isUpdate && (
            <CustomInput
              control={form.control}
              name="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              disabled={pending}
            />
          )}

          {type === "create" && (
            <CustomInput
              control={form.control}
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              disabled={pending}
            />
          )}

          {showRoleSelector && (
            <CustomSelect
              control={form.control}
              name="role"
              label="Role"
              placeholder="Select Role"
              options={roleOptions}
              disabled={pending || Boolean(role)}
            />
          )}

          {showClassSelector && (
            <CustomSelect
              control={form.control}
              name="classId"
              label="Assigned Class"
              placeholder={loading ? "Loading classes..." : "Select Class"}
              options={classOptions}
              disabled={loading || pending}
            />
          )}

          {showSubjectSelector && (
            <CustomMultiSelect
              control={form.control}
              name="subjectIds"
              label="Teaching Subjects"
              placeholder={loadingOptions ? "Loading subjects..." : "Select Subjects"}
              options={subjectOptions}
              disabled={loadingOptions || pending}
            />
          )}
        </div>

        <Button type="submit" className="w-full mt-4" disabled={pending}>
          {pending
            ? "Processing..."
            : isLogin
            ? "Sign In"
            : isUpdate
            ? "Update User"
            : "Create User"}
        </Button>
      </FieldGroup>
    </form>
  );
};

export default UniversalUserForm;
