import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types";
import CustomAlert from "@/components/global/CustomAlert";
import Search from "@/components/global/Search";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Filter, RotateCcw } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/AuthProvider";
import UserTable from "@/components/users/UserTable";
import UserDialog from "@/components/users/UserDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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
  const convexClasses = useQuery(api.classes.getClasses, isAuthorized ? {} : "skip");
  const deleteConvexUser = useMutation(api.users.deleteUser);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [page, setPage] = useState(1);

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Delete States
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Handle Debounce for search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, classFilter, itemsPerPage]);

  // Comprehensive Filtering
  const filteredUsers = useMemo(() => {
    if (!convexUsers) return [];

    return convexUsers.filter((u: any) => {
      // 1. Search Query (Name or Email)
      const matchesSearch =
        !debouncedSearch ||
        u.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(debouncedSearch.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Status Filter
      if (statusFilter === "active") {
        if (u.isActive === false || u.isApproved === false) return false;
      } else if (statusFilter === "disabled") {
        if (u.isActive !== false) return false;
      } else if (statusFilter === "pending") {
        if (u.isApproved !== false) return false;
      }

      // 3. Class Filter (for students)
      if (role === "student" && classFilter !== "all") {
        const studentClassId =
          typeof u.studentClass === "object"
            ? u.studentClass?._id
            : u.studentClass;

        if (classFilter === "unassigned") {
          if (studentClassId) return false;
        } else {
          if (studentClassId !== classFilter) return false;
        }
      }

      return true;
    });
  }, [convexUsers, debouncedSearch, statusFilter, classFilter, role]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const startIndex = (page - 1) * itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const hasActiveFilters =
    search.length > 0 || statusFilter !== "all" || classFilter !== "all";

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setClassFilter("all");
    setPage(1);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteConvexUser({ id: deleteId as any });
      toast.success("User deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
    } finally {
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <p className="text-muted-foreground text-lg font-medium">
          Access Denied: You do not have permission to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight capitalize">
            {title}
          </h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add{" "}
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </Button>
      </div>

      {/* Filter & Toolbar Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="min-w-[220px]">
            <Search search={search} setSearch={setSearch} title={`${role}s`} />
          </div>

          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active / Available</SelectItem>
                <SelectItem value="disabled">Disabled / Unavailable</SelectItem>
                <SelectItem value="pending">Pending Approval</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Class Filter Dropdown for Students */}
          {role === "student" && (
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Class Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem value="unassigned">Unassigned Class</SelectItem>
                {convexClasses?.map((cls: any) => (
                  <SelectItem key={cls._id} value={cls._id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Reset Filters
            </Button>
          )}
        </div>

        {/* Rows per page selector & Total Count */}
        <div className="flex items-center justify-between lg:justify-end gap-3 text-sm text-muted-foreground">
          {convexUsers && (
            <Badge variant="secondary" className="font-normal text-xs px-2.5 py-1">
              {filteredUsers.length} {role}s found
            </Badge>
          )}

          <div className="flex items-center gap-2">
            <span>Rows:</span>
            <Select
              value={String(itemsPerPage)}
              onValueChange={(v) => setItemsPerPage(Number(v))}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Scrollable Table Container */}
      <div className="overflow-x-auto overflow-y-auto max-h-[65vh] rounded-lg border shadow-xs bg-white dark:bg-zinc-950">
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
      </div>

      {/* Create / Edit Dialog */}
      <UserDialog
        editingUser={editingUser}
        role={role}
        open={isFormOpen}
        setOpen={setIsFormOpen}
        onSuccess={() => {}}
      />

      {/* Delete Confirmation Alert */}
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
