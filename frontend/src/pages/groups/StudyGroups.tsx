import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/AuthProvider";
import { Users, Plus, MessageCircle, Send, Lock, Globe, BookOpen, Hash, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function StudyGroupsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("browse");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [messageInput, setMessageInput] = useState("");

  const myGroups = useQuery(api.studyGroups.getMyGroups, {});
  const allGroups = useQuery(api.studyGroups.getAllGroups, {});
  const subjects = useQuery(api.subjects.getSubjects);
  const groupMessages = selectedGroup ? useQuery(api.studyGroups.getMessages, { groupId: selectedGroup._id }) : null;

  const createGroup = useMutation(api.studyGroups.createGroup);
  const joinGroup = useMutation(api.studyGroups.joinGroup);
  const leaveGroup = useMutation(api.studyGroups.leaveGroup);
  const sendMessage = useMutation(api.studyGroups.sendMessage);

  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  const handleCreateGroup = async (data: any) => {
    try {
      await createGroup(data);
      toast.success("Study group created!");
      setShowCreateDialog(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleJoin = async (groupId: any) => {
    try {
      await joinGroup({ groupId });
      toast.success("Joined group!");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleLeave = async (groupId: any) => {
    try {
      await leaveGroup({ groupId });
      toast.success("Left group");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedGroup) return;
    try {
      await sendMessage({ groupId: selectedGroup._id, content: messageInput.trim() });
      setMessageInput("");
    } catch (e: any) { toast.error(e.message); }
  };

  const displayGroups = activeTab === "my-groups" ? myGroups : allGroups;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            Study Groups
          </h1>
          <p className="text-muted-foreground mt-1">
            Learn together with your classmates in collaborative study groups
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2 bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4" /> Create Group
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="browse" className="gap-2"><Globe className="h-4 w-4" /> Browse Groups</TabsTrigger>
          <TabsTrigger value="my-groups" className="gap-2"><Users className="h-4 w-4" /> My Groups</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {selectedGroup ? (
            /* Group Chat View */
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2 flex flex-col h-[calc(100vh-220px)]">
                <CardHeader className="border-b pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Hash className="h-4 w-4 text-green-500" />
                        {selectedGroup.name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {selectedGroup.members?.length || 0} members
                        {selectedGroup.subject && ` • ${subjects?.find((s: any) => s._id === selectedGroup.subject)?.name || ""}`}
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedGroup(null)}>Back</Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto space-y-3 p-4">
                  {!groupMessages || groupMessages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    groupMessages.map((msg: any) => {
                      const isMine = msg.sender === user?._id;
                      return (
                        <div key={msg._id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                            isMine ? "bg-green-500 text-white rounded-tr-sm" : "bg-muted rounded-tl-sm"
                          )}>
                            {!isMine && <p className="text-[10px] font-semibold text-green-600 mb-0.5">{msg.senderName}</p>}
                            <p>{msg.content}</p>
                            <p className={cn("text-[10px] mt-1", isMine ? "text-white/70" : "text-muted-foreground")}>
                              {formatDistanceToNow(new Date(msg._creationTime), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
                <div className="p-3 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      placeholder="Type a message..."
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSendMessage(); } }}
                      className="text-sm"
                    />
                    <Button size="icon" className="bg-green-600 hover:bg-green-700 shrink-0" onClick={handleSendMessage}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Group Info Sidebar */}
              <Card className="h-fit">
                <CardHeader><CardTitle className="text-sm">Group Info</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {selectedGroup.description && <p className="text-sm text-muted-foreground">{selectedGroup.description}</p>}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {selectedGroup.isPrivate ? <><Lock className="h-3 w-3" /> Private</> : <><Globe className="h-3 w-3" /> Public</>}
                  </div>
                  {selectedGroup.grade && <Badge variant="outline" className="text-xs">Grade {selectedGroup.grade}</Badge>}
                  <div className="pt-2 border-t">
                    <p className="text-xs font-semibold mb-2">Members ({selectedGroup.members?.length || 0})</p>
                    <div className="space-y-1">
                      {selectedGroup.members?.map((mId: string) => (
                        <div key={mId} className="flex items-center gap-2 text-xs">
                          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <Users className="h-3 w-3" />
                          </div>
                          <span>{mId === user?._id ? "You" : "Member"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Groups Grid */
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayGroups?.map((group: any) => {
                const subject = subjects?.find((s: any) => s._id === group.subject);
                const isMember = group.members?.includes(user?._id);
                return (
                  <Card key={group._id} className="hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                          <Hash className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex items-center gap-1">
                          {group.isPrivate && <Lock className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      </div>
                      <CardTitle className="text-base">{group.name}</CardTitle>
                      {group.description && <CardDescription className="text-xs line-clamp-2">{group.description}</CardDescription>}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {subject && <Badge variant="secondary" className="text-[10px]">{subject.name}</Badge>}
                        {group.grade && <Badge variant="outline" className="text-[10px]">Gr {group.grade}</Badge>}
                        <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                          <Users className="h-3 w-3" /> {group.members?.length || 0}/{group.maxMembers}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        {isMember ? (
                          <>
                            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => setSelectedGroup(group)}>
                              <MessageCircle className="h-3 w-3 mr-1" /> Open Chat
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleLeave(group._id)} className="text-red-500">Leave</Button>
                          </>
                        ) : (
                          <Button size="sm" className="flex-1" onClick={() => handleJoin(group._id)} disabled={group.members?.length >= group.maxMembers}>
                            <UserPlus className="h-3 w-3 mr-1" /> {group.members?.length >= group.maxMembers ? "Full" : "Join"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {(!displayGroups || displayGroups.length === 0) && (
                <div className="col-span-full text-center py-16">
                  <Users className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground">No groups found</h3>
                  <p className="text-sm text-muted-foreground mt-1">Create a study group to get started!</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Group Dialog */}
      <CreateGroupDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} onCreate={handleCreateGroup} subjects={subjects} />
    </div>
  );
}

function CreateGroupDialog({ open, onClose, onCreate, subjects }: any) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [maxMembers, setMaxMembers] = useState("10");
  const [isPrivate, setIsPrivate] = useState(false);

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate({ name, description, subject, grade: grade ? Number(grade) : undefined, maxMembers: Number(maxMembers), isPrivate });
    setName(""); setDescription(""); setGrade(""); setMaxMembers("10"); setIsPrivate(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Create Study Group</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Group Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Grade 12 Maths Squad" /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>{subjects?.map((s: any) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                <SelectContent>{[1,2,3,4,5,6,7,8,9,10,11,12].map(g => <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Max Members</Label><Input type="number" value={maxMembers} onChange={e => setMaxMembers(e.target.value)} min={2} max={50} /></div>
          <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleCreate}>Create Group</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
