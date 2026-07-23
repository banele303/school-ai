import { useEffect } from "react";
import { useForm, type Resolver, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { classFormSchema, type ClassFormValues } from "./schema";

// UI Imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import type { Class } from "@/types";
import { CustomInput } from "@/components/global/CustomInput";
import { CustomSelect } from "@/components/global/CustomSelect";
import { CustomMultiSelect } from "@/components/global/CustomMultiSelect";
import Modal from "@/components/global/Modal";


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: Class | null;
  onSuccess: () => void;
}
const ClassForm = ({ open, onOpenChange, initialData, onSuccess }: Props) => {
  const convexTeachers = useQuery(api.users.getUsers, { role: "teacher" });
  const convexStudents = useQuery(api.users.getUsers, { role: "student" });
  const convexYears = useQuery(api.academicYears.getAcademicYears);
  const convexSubjects = useQuery(api.subjects.getSubjects);
  const createClassMutation = useMutation(api.classes.createClass);
  const updateClassMutation = useMutation(api.classes.updateClass);

  const teachers = convexTeachers || [];
  const studentsList = convexStudents || [];
  const years = convexYears || [];
  const subjects = convexSubjects || [];
  const loadingOptions = convexTeachers === undefined || convexYears === undefined;
  const loadingSubjects = convexSubjects === undefined;
  const loadingStudents = convexStudents === undefined;

  //   form
  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema) as Resolver<ClassFormValues>,
    defaultValues: {
      name: "",
      capacity: 40,
      academicYear: "",
      classTeacher: "",
      subjectIds: [],
      studentIds: [],
    },
  });

  //  Populate Form on Edit
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        capacity: initialData.capacity,
        academicYear: initialData.academicYear?._id || "",
        classTeacher: initialData.classTeacher?._id || "",
        subjectIds: initialData.subjects?.map((s: any) => s._id) || [],
        studentIds: initialData.students?.map((st: any) => st._id) || [],
      });
    } else {
      form.reset({
        name: "",
        capacity: 40,
        academicYear: "",
        classTeacher: "",
        subjectIds: [],
        studentIds: [],
      });
    }
  }, [initialData, form, open]);

  const onSubmit = async (data: ClassFormValues) => {
    try {
      const payload = {
        ...data,
        classTeacher:
          data.classTeacher === "unassigned" || data.classTeacher === ""
            ? undefined
            : data.classTeacher,
        subjects: data.subjectIds,
      };
      if (initialData) {
        await updateClassMutation({ 
          id: initialData._id as any,
          ...payload,
          academicYearId: payload.academicYear as any,
          classTeacherId: payload.classTeacher as any,
          subjectIds: payload.subjects as any,
          studentIds: payload.studentIds as any,
        });
        toast.success("Class updated successfully");
      } else {
        await createClassMutation({ 
          name: payload.name,
          capacity: payload.capacity,
          academicYearId: payload.academicYear as any,
          classTeacherId: payload.classTeacher as any,
          subjectIds: payload.subjects as any,
        });
        toast.success("Class created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.log(error);
      toast.error(error.message || "Failed to save class");
    }
  };

  const pending = form.formState.isSubmitting;

  const yearOptions = years.map((year) => ({
    label: year.name,
    value: year._id as any,
  }));
  const subjectOptions = subjects.map((subject) => ({
    label: subject.name,
    value: subject._id as any,
  }));
  const teachersOptions = teachers.map((teacher) => ({
    label: teacher.name || "Unknown Teacher",
    value: teacher._id as any,
  }));
  const studentOptions = studentsList.map((st) => ({
    label: st.name || st.email || "Unknown Student",
    value: st._id as any,
  }));

  return (
    <Modal
      open={open}
      setOpen={onOpenChange}
      description={initialData ? "Edit Class" : "Create New Class"}
      title={initialData ? "Edit Class" : "Create New Class"}
    >
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <CustomInput
              control={form.control}
              name="name"
              label="Name"
              placeholder="Grade 1"
              disabled={pending}
            />
            <CustomSelect
              control={form.control}
              name="academicYear"
              label="Year"
              placeholder="Select Year"
              options={yearOptions}
              disabled={pending}
              loading={loadingOptions}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <CustomSelect
              control={form.control}
              name="classTeacher"
              label="Teacher"
              placeholder="Select Teacher"
              options={teachersOptions}
              disabled={pending}
              loading={loadingOptions}
            />
            <Controller
              name="capacity"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="capacity">Max Capacity</FieldLabel>
                  <Input id="capacity" type="number" {...field} />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>
          <CustomMultiSelect
            control={form.control}
            name="subjectIds"
            label="Subjects"
            placeholder="Select subjects..."
            options={subjectOptions}
            loading={loadingSubjects}
            disabled={pending}
          />
          <CustomMultiSelect
            control={form.control}
            name="studentIds"
            label="Enrolled Students"
            placeholder="Select students to assign to this class..."
            options={studentOptions}
            loading={loadingStudents}
            disabled={pending}
          />
        </FieldGroup>
        <Button
          className="w-full mt-2"
          type="submit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Saving..." : "Save Class"}
        </Button>
      </form>
    </Modal>
  );
};

export default ClassForm;
