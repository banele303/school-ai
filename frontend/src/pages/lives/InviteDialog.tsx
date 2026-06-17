import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, X, Users, User, Check, Copy, Sparkles, Mail } from "lucide-react";

interface InviteDialogProps {
  open: boolean;
  onClose: () => void;
  liveClass: any;
}

export default function InviteDialog({ open, onClose, liveClass }: InviteDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  // Local list of selected user IDs and class IDs
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<any[]>([]);

  const searchResults = useQuery(
    api.liveClasses.searchUsersAndClasses,
    debouncedQuery ? { query: debouncedQuery } : "skip"
  ) || { users: [], classes: [] };

  const inviteMutation = useMutation(api.liveClasses.inviteToLiveClass);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load existing invites when dialog opens or class changes
  useEffect(() => {
    if (liveClass) {
      const initialUsers = liveClass.invitedUsers || [];
      const initialClasses = liveClass.invitedClasses || [];
      
      setSelectedUsers(initialUsers.map((id: string) => ({ _id: id, name: "Student", isIdOnly: true })));
      setSelectedClasses(initialClasses.map((id: string) => ({ _id: id, name: "Class group", isIdOnly: true })));
    }
  }, [liveClass, open]);

  // Fetch full details for initially selected items when data is available
  const allStudents = useQuery(api.users.getUsers, { role: "student" }) || [];
  const allClasses = useQuery(api.classes.getClasses, {}) || [];

  useEffect(() => {
    if (allStudents.length > 0 && selectedUsers.some(u => u.isIdOnly)) {
      setSelectedUsers(prev =>
        prev.map(u => {
          if (u.isIdOnly) {
            const found = allStudents.find(student => student._id === u._id);
            return found ? { _id: found._id, name: found.name || found.email || "Student", email: found.email } : u;
          }
          return u;
        })
      );
    }
  }, [allStudents, selectedUsers]);

  useEffect(() => {
    if (allClasses.length > 0 && selectedClasses.some(c => c.isIdOnly)) {
      setSelectedClasses(prev =>
        prev.map(c => {
          if (c.isIdOnly) {
            const found = allClasses.find(cls => cls._id === c._id);
            return found ? { _id: found._id, name: found.name } : c;
          }
          return c;
        })
      );
    }
  }, [allClasses, selectedClasses]);

  const handleSelectUser = (user: any) => {
    if (selectedUsers.some((u) => u._id === user._id)) {
      setSelectedUsers(selectedUsers.filter((u) => u._id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery("");
  };

  const handleSelectClass = (cls: any) => {
    if (selectedClasses.some((c) => c._id === cls._id)) {
      setSelectedClasses(selectedClasses.filter((c) => c._id !== cls._id));
    } else {
      setSelectedClasses([...selectedClasses, cls]);
    }
    setSearchQuery("");
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u._id !== userId));
  };

  const handleRemoveClass = (classId: string) => {
    setSelectedClasses(selectedClasses.filter((c) => c._id !== classId));
  };

  const handleSave = async () => {
    if (!liveClass) return;
    try {
      await inviteMutation({
        liveClassId: liveClass._id,
        invitedUsers: selectedUsers.map((u) => u._id),
        invitedClasses: selectedClasses.map((c) => c._id),
      });
      toast.success("Invitations updated successfully!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update invitations.");
    }
  };

  const handleCopyLink = async () => {
    if (!liveClass) return;
    const link = `${window.location.origin}/lives/room/${liveClass._id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Classroom joining link copied to clipboard!");
    } catch {
      toast.error("Could not copy invitation link.");
    }
  };

  if (!liveClass) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-border rounded-2xl shadow-2xl p-6 overflow-hidden">
        
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-red-600/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              Invite Students & Classes
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Invite specific cohorts or students to <span className="font-semibold text-secondary-foreground">"{liveClass.title}"</span>. Only invited users will be able to join when access is private.
          </DialogDescription>
        </DialogHeader>

        {/* Selected List Tags */}
        <div className="my-4 space-y-2">
          {selectedUsers.length === 0 && selectedClasses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No students or classes invited yet. Use the search below to invite people.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-border rounded-xl bg-muted/30">
              {selectedClasses.map((cls) => (
                <Badge
                  key={cls._id}
                  className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-300 flex items-center gap-1 py-1 px-2.5 rounded-lg text-xs"
                >
                  <Users className="h-3 w-3 shrink-0" />
                  {cls.name}
                  <button
                    onClick={() => handleRemoveClass(cls._id)}
                    className="hover:bg-indigo-200/50 dark:hover:bg-indigo-900/50 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}

              {selectedUsers.map((u) => (
                <Badge
                  key={u._id}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300 flex items-center gap-1 py-1 px-2.5 rounded-lg text-xs"
                >
                  <User className="h-3 w-3 shrink-0" />
                  {u.name}
                  <button
                    onClick={() => handleRemoveUser(u._id)}
                    className="hover:bg-emerald-200/50 dark:hover:bg-emerald-900/50 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search classes or student names/emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted border-input text-foreground focus-visible:ring-indigo-500 focus-visible:ring-1 text-xs h-10 rounded-xl"
          />
        </div>

        {/* Search Results Panel */}
        {searchQuery.trim() !== "" && (
          <div className="border border-border rounded-xl overflow-hidden max-h-60 overflow-y-auto mb-4 bg-card shadow-lg animate-in fade-in-50 duration-150">
            {searchResults.users.length === 0 && searchResults.classes.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No matching classes or students found.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {/* Classes Section */}
                {searchResults.classes.length > 0 && (
                  <div className="p-2">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Class groups
                    </div>
                    {searchResults.classes.map((cls) => {
                      const isSelected = selectedClasses.some((c) => c._id === cls._id);
                      return (
                        <button
                          key={cls._id}
                          onClick={() => handleSelectClass(cls)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-md bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                              <Users className="h-3.5 w-3.5" />
                            </div>
                            <span className="font-medium text-foreground">{cls.name}</span>
                          </div>
                          {isSelected ? (
                            <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Add class</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Users Section */}
                {searchResults.users.length > 0 && (
                  <div className="p-2">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Students
                    </div>
                    {searchResults.users.map((u) => {
                      const isSelected = selectedUsers.some((user) => user._id === u._id);
                      return (
                        <button
                          key={u._id}
                          onClick={() => handleSelectUser(u)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-md bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                              <User className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <span className="font-medium text-foreground block">{u.name}</span>
                              {u.email && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-2.5 w-2.5" /> {u.email}
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected ? (
                            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Add student</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            variant="outline"
            onClick={handleCopyLink}
            type="button"
            className="flex items-center gap-1.5 text-xs h-9 rounded-xl mr-auto w-full sm:w-auto"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Share Link
          </Button>

          <Button
            variant="ghost"
            onClick={onClose}
            type="button"
            className="text-xs h-9 rounded-xl w-full sm:w-auto"
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleSave}
            type="button"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs h-9 rounded-xl px-5 w-full sm:w-auto"
          >
            Save Invitations
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
