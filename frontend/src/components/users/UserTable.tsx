import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  UserIcon,
  Check,
  Ban,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { user } from "@/types";
import CustomPagination from "@/components/global/CustomPagination";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

// ?page=${pageNum}&limit=10
interface Props {
  role: string;
  loading: boolean;
  setDeleteId: (id: string) => void;
  setIsDeleteOpen: (open: boolean) => void;
  setEditingUser: (user: user | null) => void;
  setIsFormOpen: (open: boolean) => void;
  users: user[];
  pageNum: number;
  setPageNum: (page: number) => void;
  totalPages: number;
}

const UserTable = ({
  role,
  loading,
  setDeleteId,
  setIsDeleteOpen,
  setEditingUser,
  setIsFormOpen,
  pageNum,
  setPageNum,
  users = [],
  totalPages,
}: Props) => {
  const updateUserMutation = useMutation(api.users.updateUser);

  const handleEdit = (user: user) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleApprove = async (id: string) => {
    try {
      await updateUserMutation({ id: id as any, isApproved: true });
      toast.success("User approved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to approve user");
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await updateUserMutation({ id: id as any, isActive: active });
      toast.success(active ? "User enabled successfully" : "User disabled successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            {role === "teacher" && <TableHead>Subjects</TableHead>}
            {/* Show Class only for students */}
            {role === "student" && <TableHead>Class</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-24 text-center text-muted-foreground"
              >
                No {role}s found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user._id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-slate-500" />
                  </div>
                  {user.name}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                {role === "teacher" && (
                  <TableCell>
                    {user.teacherSubjects?.length ? (
                      <div className="flex gap-1">
                        {user.teacherSubjects.map((subject) => (
                          <Badge variant="outline" key={subject._id}>
                            {subject.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-sm">
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                )}
                {role === "student" && (
                  <TableCell>
                    {user.studentClass?._id ? (
                      <Badge variant="outline">{user.studentClass.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground italic text-sm">
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  {user.isApproved === false ? (
                    <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/20">
                      Pending Approval
                    </Badge>
                  ) : user.isActive === false ? (
                    <Badge variant="outline" className="border-red-500 text-red-600 bg-red-50 dark:bg-red-950/20">
                      Disabled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20">
                      Active
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      {user.isApproved === false && (
                        <DropdownMenuItem onClick={() => handleApprove(user._id)}>
                          <UserCheck className="mr-2 h-4 w-4 text-emerald-600" /> Approve
                        </DropdownMenuItem>
                      )}
                      {user.isActive === false ? (
                        <DropdownMenuItem onClick={() => handleToggleActive(user._id, true)}>
                          <Check className="mr-2 h-4 w-4 text-emerald-600" /> Enable Account
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleToggleActive(user._id, false)}>
                          <Ban className="mr-2 h-4 w-4 text-amber-600" /> Disable Account
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleEdit(user)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          setDeleteId(user._id);
                          setIsDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <CustomPagination
          loading={loading}
          page={pageNum}
          setPage={setPageNum}
          totalPages={totalPages}
        />
      )}
    </div>
  );
};

export default UserTable;
