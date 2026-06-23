import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/AuthProvider";

import { Button } from "@/components/ui/button";
import Search from "@/components/global/Search";
import CustomAlert from "@/components/global/CustomAlert";
import ClassTable from "@/components/classes/ClassTable";
import ClassForm from "@/components/classes/ClassForm";

const Classes = () => {
  const { user } = useAuth();
  const isAuthorized = user?.role === "admin" || user?.role === "teacher";
  const convexClasses = useQuery(api.classes.getClasses, isAuthorized ? { academicYear: undefined } : "skip");
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageNum, setPageNum] = useState(1);
  
  // Client-side filtering and pagination
  const filteredClasses = convexClasses?.filter(c => 
    c.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  ) || [];
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredClasses.length / itemsPerPage));
  const currentClasses = filteredClasses.slice((pageNum - 1) * itemsPerPage, pageNum * itemsPerPage);

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any | null>(null);

  // Delete Alert States
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPageNum(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const handleCreate = () => {
    setEditingClass(null);
    setIsFormOpen(true);
  };

  const handleEdit = (cls: any) => {
    setEditingClass(cls);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const deleteClassMutation = useMutation(api.classes.deleteClass);

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteClassMutation({ id: deleteId as any });
      toast.success("Class deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete class");
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
          <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
          <p className="text-muted-foreground">
            Manage grades, sections, and teacher assignments.
          </p>
        </div>
        <div className="flex gap-2">
          <Search search={search} setSearch={setSearch} title="Classes" />
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Create Class
          </Button>
        </div>
      </div>
      {/* table */}
      <ClassTable
        data={currentClasses as any}
        loading={convexClasses === undefined}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        page={pageNum}
        setPage={setPageNum}
        totalPages={totalPages}
      />
      {/* form */}
      <ClassForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingClass}
        onSuccess={() => {}}
      />
      {/* alert */}
      <CustomAlert
        handleDelete={confirmDelete}
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
        title="Delete Class"
        description="Are you sure you want to delete this class? This action cannot be undone."
      />
    </div>
  );
};

export default Classes;
