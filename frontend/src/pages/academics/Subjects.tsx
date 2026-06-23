import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/AuthProvider";

import { Button } from "@/components/ui/button";
import Search from "@/components/global/Search";
import CustomAlert from "@/components/global/CustomAlert";
import { SubjectTable } from "@/components/subjects/SubjectTable";
import { SubjectForm } from "@/components/subjects/SubjectForm";

export const Subjects = () => {
  const { user } = useAuth();
  const isAuthorized = user?.role === "admin" || user?.role === "teacher";
  const convexSubjects = useQuery(api.subjects.getSubjects, isAuthorized ? {} : "skip");
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageNum, setPageNum] = useState(1);
  
  // Client-side filtering and pagination
  const filteredSubjects = convexSubjects?.filter(s => 
    s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    s.code.toLowerCase().includes(debouncedSearch.toLowerCase())
  ) || [];
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredSubjects.length / itemsPerPage));
  const currentSubjects = filteredSubjects.slice((pageNum - 1) * itemsPerPage, pageNum * itemsPerPage);

  // --- Dialog States ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // 1. Handle Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPageNum(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const handleCreate = () => {
    setEditingSubject(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingSubject(item);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const deleteSubjectMutation = useMutation(api.subjects.deleteSubject);

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSubjectMutation({ id: deleteId as any });
      toast.success("Subject deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete subject");
    } finally {
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <p className="text-muted-foreground text-lg font-medium">Access Denied: You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
          <p className="text-muted-foreground">
            Manage curriculum subjects and codes.
          </p>
        </div>
        <div className="flex gap-3">
          <Search search={search} setSearch={setSearch} title="Subject" />
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Create Subject
          </Button>
        </div>
      </div>
      {/* table */}
      <SubjectTable
        data={currentSubjects as any}
        loading={convexSubjects === undefined}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        page={pageNum}
        setPage={setPageNum}
        totalPages={totalPages}
      />
      {/* form */}
      <SubjectForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingSubject}
        onSuccess={() => {}}
      />
      <CustomAlert
        handleDelete={confirmDelete}
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
        title="Delete Subject"
        description="Are you sure you want to delete this subject? This action cannot be undone."
      />
    </div>
  );
};
