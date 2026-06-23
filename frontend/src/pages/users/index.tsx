import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types";
import CustomAlert from "@/components/global/CustomAlert";
// import UserDialog from "@/components/users/user-dialog";
import Search from "@/components/global/Search";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/AuthProvider";
import UserTable from "@/components/users/UserTable";
import UserDialog from "@/components/users/UserDialog";

interface Props {
  role: UserRole;
  title: string;
  description: string;
}
export default function UserManagementPage({
  role,
  title,
  description,
}: Props) {
  const { user } = useAuth();
  const isAuthorized = user?.role === "admin" || user?.role === "teacher";
  const convexUsers = useQuery(api.users.getUsers, isAuthorized ? { role } : "skip");
  const deleteConvexUser = useMutation(api.users.deleteUser);
  
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Client-side filtering and pagination
  const filteredUsers = convexUsers?.filter(u => 
    u.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
    u.email?.toLowerCase().includes(debouncedSearch.toLowerCase())
  ) || [];
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const currentUsers = filteredUsers.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Delete States
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Handle Debounce (Wait 500ms after typing stops)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 when search changes
    }, 500);

    return () => clearTimeout(handler);
  }, [search]);

  const handleCreate = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteConvexUser({ id: deleteId as any });
      toast.success("User deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
      console.log(error);
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
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight capitalize">
            {title}
          </h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex gap-2">
          <Search search={search} setSearch={setSearch} title={`${role}s`} />
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add{" "}
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </Button>
        </div>
      </div>

      {/* table */}
      <UserTable
        role={role}
        loading={convexUsers === undefined}
        setDeleteId={setDeleteId}
        setIsDeleteOpen={setIsDeleteOpen}
        setEditingUser={setEditingUser}
        setIsFormOpen={setIsFormOpen}
        users={currentUsers as any}
        setPageNum={setPage}
        pageNum={page}
        totalPages={totalPages}
      />
      {/* create/update */}
      <UserDialog
        editingUser={editingUser}
        role={role}
        open={isFormOpen}
        setOpen={setIsFormOpen}
        onSuccess={() => {}}
      />

      {/* alert */}
      <CustomAlert
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
        handleDelete={handleDelete}
        title="Delete User?"
        description="This will permanently delete this user from the system."
      />
    </div>
  );
}
