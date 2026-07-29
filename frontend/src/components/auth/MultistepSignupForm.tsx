import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/global/CustomInput";
import { CustomSelect } from "@/components/global/CustomSelect";
import { CustomMultiSelect } from "@/components/global/CustomMultiSelect";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { UserRole } from "@/types";

const createSchema = () => {
  return z
    .object({
      role: z.enum(["student", "teacher", "parent"], { required_error: "Role is required" }),
      classId: z.string().optional(),
      subjectIds: z.array(z.string()).optional(),
      name: z.string().min(2, "Name is required"),
      email: z.string().email("Invalid email address"),
      password: z.string().min(6, "Password must be at least 6 characters"),
      confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
    })
    .superRefine((data, ctx) => {
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passwords don't match",
          path: ["confirmPassword"],
        });
      }
    });
};

type FormValues = z.infer<ReturnType<typeof createSchema>>;

export default function MultistepSignupForm() {
  const [step, setStep] = useState(1);
  const { signIn } = useAuthActions();
  const convexClasses = useQuery(api.classes.getClasses, { academicYear: undefined });
  const convexSubjects = useQuery(api.subjects.getSubjects);

  const classes = Array.isArray(convexClasses) ? convexClasses : [];
  const subjects = Array.isArray(convexSubjects) ? convexSubjects : [];

  const form = useForm<FormValues>({
    resolver: zodResolver(createSchema()),
    defaultValues: {
      role: undefined,
      classId: "",
      subjectIds: [],
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const currentRole = form.watch("role");

  const handleNextStep1 = async () => {
    form.clearErrors("role");
    if (!currentRole) {
      form.setError("role", { type: "manual", message: "Role is required" });
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = async () => {
    if (currentRole === "student" && !form.getValues("classId")) {
      form.setError("classId", { type: "manual", message: "Class is required for students" });
      return;
    }
    if (currentRole === "teacher" && (!form.getValues("subjectIds") || form.getValues("subjectIds")?.length === 0)) {
      form.setError("subjectIds", { type: "manual", message: "Please select at least one subject" });
      return;
    }
    setStep(3);
  };

  const handleGoogleSignup = () => {
    const data = form.getValues();
    
    // Save onboarding info to localStorage
    const onboardingData = {
      role: data.role,
      classId: data.classId,
      subjectIds: data.subjectIds,
    };
    localStorage.setItem("pendingSignUpData", JSON.stringify(onboardingData));
    
    // Perform Google Sign In
    // Note: GoogleSignInButton internally handles this, but since we're overriding it:
    signIn("google", { redirectTo: "/dashboard" }).catch((error) => {
      toast.error(error.message || "Google sign in failed");
    });
  };

  const onSubmitStep3 = async () => {
    const valid = await form.trigger(["name", "email", "password", "confirmPassword"]);
    if (!valid) return;
    
    const data = form.getValues();
    try {
      const cleanClassId = data.classId && data.classId.trim() !== "" ? data.classId : undefined;
      const cleanSubjectIds = data.subjectIds && data.subjectIds.length > 0 ? data.subjectIds : undefined;

      const result = await signIn("password", {
        email: data.email!,
        password: data.password!,
        flow: "signUp",
        name: data.name!,
        role: data.role!,
        studentClass: cleanClassId as any,
        teacherSubject: currentRole === "teacher" ? (cleanSubjectIds as any) : undefined,
        studentSubjects: currentRole === "student" ? (cleanSubjectIds as any) : undefined,
      });

      if (result?.signingIn) {
        toast.success("Account created successfully!");
        window.location.href = "/dashboard";
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An error occurred during sign up");
    }
  };

  const classOptions = classes.map((c: any) => ({ label: c.name, value: c._id }));
  const subjectOptions = subjects.map((s: any) => ({
    label: s.grade ? `${s.name} (Grade ${s.grade})` : s.name,
    value: s._id,
  }));

  const roleOptions = [
    { label: "Student", value: "student" },
    { label: "Teacher", value: "teacher" },
    { label: "Parent", value: "parent" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3].map((num) => (
          <div key={num} className={`flex items-center ${num < 3 ? "flex-1" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step >= num ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {num}
            </div>
            {num < 3 && (
              <div className={`h-1 flex-1 mx-2 ${step > num ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-lg font-semibold">I am joining as a...</h2>
            <CustomSelect
              control={form.control}
              name="role"
              label="Select your role"
              options={roleOptions}
              placeholder="Choose a role"
            />
            <Button className="w-full mt-4" onClick={handleNextStep1}>Continue</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-lg font-semibold">Let's get some details</h2>
            {currentRole === "student" && (
              <>
                <CustomSelect
                  control={form.control}
                  name="classId"
                  label="Which grade/class are you in?"
                  options={classOptions}
                  placeholder="Select class"
                />
                <CustomMultiSelect
                  control={form.control}
                  name="subjectIds"
                  label="Select your subjects (optional)"
                  options={subjectOptions}
                  placeholder="Choose subjects"
                />
              </>
            )}
            
            {currentRole === "teacher" && (
              <CustomMultiSelect
                control={form.control}
                name="subjectIds"
                label="Which subjects do you teach?"
                options={subjectOptions}
                placeholder="Select subjects"
              />
            )}

            {currentRole === "parent" && (
              <div className="text-sm text-muted-foreground py-4">
                No additional details required right now. You can link to your child's account later.
              </div>
            )}

            <div className="flex gap-4 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={handleNextStep2}>Continue</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-lg font-semibold">Create your account</h2>
            
            <div className="space-y-4">
              <div onClick={handleGoogleSignup} className="cursor-pointer">
                {/* Visual only since we handle click */}
                <div className="pointer-events-none">
                  <GoogleSignInButton role={currentRole as UserRole} />
                </div>
              </div>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or sign up with email
                  </span>
                </div>
              </div>
            </div>

            <FieldGroup>
              <CustomInput control={form.control} name="name" label="Full Name" placeholder="Jane Doe" />
              <CustomInput control={form.control} name="email" label="Email Address" type="email" placeholder="jane@example.com" />
              <CustomInput control={form.control} name="password" label="Password" type="password" placeholder="Create a strong password" />
              <CustomInput control={form.control} name="confirmPassword" label="Confirm Password" type="password" placeholder="Confirm your password" />
            </FieldGroup>
            
            <div className="flex gap-4 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1" onClick={onSubmitStep3} disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
