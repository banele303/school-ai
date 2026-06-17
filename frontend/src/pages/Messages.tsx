import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Send, MessageSquare, Search, Loader2, Paperclip, Smile, Reply,
  X, CheckCheck, Clock, FileText, Image, File, School, GraduationCap,
  BookOpen, Sparkles, BrainCircuit, ChevronDown, Bot, Pin, Trash2,
  Download, Eye, ArrowLeft, Hash
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/AuthProvider";

// ─── HELPERS ───────────────────────────────────────────────────

function getInitials(name: string = "") {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉", "👏", "💯", "🤔", "✅"];

// South African CAPS subjects for tagging
const CAPS_SUBJECTS = [
  "Mathematics", "English Home Language", "English FAL", "Afrikaans FAL",
  "isiZulu HL", "Life Sciences", "Physical Sciences", "Accounting",
  "Economics", "Business Studies", "Geography", "History",
  "Life Orientation", "Creative Arts", "Technology", "EMS"
];

const CAPS_GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

// ─── MAIN PAGE ─────────────────────────────────────────────────

export default function MessagesPage() {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showNewConv, setShowNewConv] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCurriculum, setShowCurriculum] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [fileAttached, setFileAttached] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [curriculumTopic, setCurriculumTopic] = useState("");
  const [curriculumSubject, setCurriculumSubject] = useState("");
  const [curriculumGrade, setCurriculumGrade] = useState("");
  const [showMobileList, setShowMobileList] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const conversations = useQuery(api.messages.getConversations);
  const messageable = useQuery(api.messages.getMessageableUsers);
  const messages = useQuery(
    api.messages.getConversationMessages,
    selectedUserId ? { otherUserId: selectedUserId as any } : "skip"
  );
  const markRead = useMutation(api.messages.markConversationRead);
  const sendMessage = useMutation(api.messages.sendMessage);
  const toggleReaction = useMutation(api.messages.toggleReaction);
  const searchMessages = useQuery(
    api.messages.searchMessages,
    searchQuery ? { query: searchQuery, otherUserId: selectedUserId as any | undefined } : "skip"
  );

  const selectedContact = conversations?.find((c: any) => c.contact?._id === selectedUserId)?.contact;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark conversation as read when selected
  useEffect(() => {
    if (selectedUserId) {
      markRead({ otherUserId: selectedUserId as any }).catch(() => {});
      setShowMobileList(false);
    }
  }, [selectedUserId, markRead]);

  const handleSelect = (userId: string) => {
    setSelectedUserId(userId);
    setReplyTo(null);
    setSearchResults([]);
    setShowSearch(false);
  };

  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content && !fileAttached) return;
    if (!selectedUserId) return;

    setIsSending(true);
    try {
      let fileUrl = "";
      let fileName = "";
      let fileType = "";
      let fileSize = 0;
      let messageType = "text";

      if (fileAttached) {
        messageType = fileAttached.type.startsWith("image/") ? "image" : "file";
        // For now, we'll send file metadata - actual upload can be enhanced later
        fileName = fileAttached.name;
        fileType = fileAttached.type;
        fileSize = fileAttached.size;
      }

      await sendMessage({
        recipientId: selectedUserId as any,
        content: content || (fileAttached ? fileName : ""),
        replyTo: replyTo?._id,
        messageType,
        fileUrl,
        fileName,
        fileSize,
        fileType,
        curriculumTopic: curriculumTopic || undefined,
        curriculumSubject: curriculumSubject || undefined,
        curriculumGrade: curriculumGrade ? parseInt(curriculumGrade) : undefined,
      } as any);

      setNewMessage("");
      setReplyTo(null);
      setFileAttached(null);
      setCurriculumTopic("");
      setCurriculumSubject("");
      setCurriculumGrade("");
      inputRef.current?.focus();
    } catch (e: any) {
      toast.error(e.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await toggleReaction({ messageId: messageId as any, emoji });
    } catch {
      // Silently fail
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File too large. Max 10MB.");
        return;
      }
      setFileAttached(file);
    }
  };

  const filteredConversations = conversations?.filter((c: any) =>
    c.contact?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getReactionsForMessage = (msg: any) => {
    if (!msg.reactions || !user) return {};
    const grouped: Record<string, { count: number; hasMine: boolean }> = {};
    msg.reactions.forEach((r: any) => {
      if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, hasMine: false };
      grouped[r.emoji].count++;
      if (r.userId === user._id) grouped[r.emoji].hasMine = true;
    });
    return grouped;
  };

  return (
    <div className="flex h-[calc(100vh-56px)] bg-background">
      {/* Mobile back button */}
      {!showMobileList && (
        <button
          className="fixed top-16 left-2 z-50 md:hidden p-2 rounded-full bg-card shadow-md border"
          onClick={() => setShowMobileList(true)}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}

      {/* ─── CONVERSATION SIDEBAR ─── */}
      <div className={cn(
        "w-80 border-r flex flex-col shrink-0 bg-card",
        "md:flex",
        showMobileList ? "flex w-full md:w-80" : "hidden"
      )}>
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg text-foreground">Messages</h2>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowSearch(!showSearch)}>
                <Search className="h-4 w-4" />
              </Button>
              <Dialog open={showNewConv} onOpenChange={setShowNewConv}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Conversation</DialogTitle></DialogHeader>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {messageable === undefined ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                    ) : messageable.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No contacts available.</p>
                    ) : (
                      messageable.map((u: any) => (
                        <button
                          key={u._id}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                          onClick={() => { setSelectedUserId(u._id); setShowNewConv(false); setShowMobileList(false); }}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground">{u.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {filteredConversations === undefined ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8 px-4">
              {search ? "No conversations found." : "No conversations yet. Start a new one!"}
            </div>
          ) : (
            filteredConversations.map(({ contact, lastMsg, unreadCount }: any) => (
              <button
                key={contact?._id}
                className={cn(
                  "w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors border-b text-left",
                  selectedUserId === contact?._id && "bg-primary/5 border-l-2 border-l-primary"
                )}
                onClick={() => handleSelect(contact!._id)}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className={cn(
                    "text-sm font-semibold",
                    contact?.role === "teacher" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                    contact?.role === "student" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" :
                    contact?.role === "parent" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" :
                    "bg-primary/10 text-primary"
                  )}>
                    {getInitials(contact?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate text-foreground">{contact?.name}</p>
                    {lastMsg && (
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {formatDistanceToNow(new Date(lastMsg._creationTime), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-muted-foreground truncate flex-1">
                      {lastMsg?.messageType === "file" ? "📎 Sent a file" :
                       lastMsg?.messageType === "image" ? "📷 Sent an image" :
                       lastMsg?.content || "No messages yet"}
                    </p>
                    {!!unreadCount && (
                      <Badge className="h-5 min-w-5 text-[10px] px-1.5 shrink-0 rounded-full">
                        {unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* ─── MAIN CHAT AREA ─── */}
      <div className={cn(
        "flex-1 flex flex-col",
        showMobileList ? "hidden md:flex" : "flex"
      )}>
        {!selectedUserId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-background">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="h-10 w-10 opacity-30" />
            </div>
            <p className="text-lg font-medium">Your Messages</p>
            <p className="text-sm max-w-md text-center">
              Select a conversation or start a new one. Teachers and parents can share assignments, 
              exam results, and CAPS-aligned learning resources.
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-14 border-b px-4 flex items-center gap-3 shrink-0 bg-card">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className={cn(
                  "text-xs font-semibold",
                  selectedContact?.role === "teacher" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                  selectedContact?.role === "student" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" :
                  selectedContact?.role === "parent" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" :
                  "bg-primary/10 text-primary"
                )}>
                  {getInitials(selectedContact?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">{selectedContact?.name || "..."}</p>
                <p className="text-xs text-muted-foreground capitalize">{selectedContact?.role}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setShowSearch(!showSearch)}
                  title="Search messages"
                >
                  <Search className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setShowCurriculum(!showCurriculum)}
                  title="CAPS Curriculum Assistant"
                >
                  <GraduationCap className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search Results Bar */}
            {showSearch && (
              <div className="border-b p-3 bg-muted/30">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search in this conversation..."
                    className="pl-9 h-9 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                      onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {searchResults && searchResults.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {searchResults.map((msg: any) => (
                      <div key={msg._id} className="text-xs p-2 rounded bg-card border text-muted-foreground">
                        <p className="line-clamp-1">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Curriculum Panel */}
            {showCurriculum && (
              <div className="border-b p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">CAPS Curriculum Context</span>
                  </div>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowCurriculum(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    className="text-xs rounded-lg border bg-card px-2 py-1.5 text-foreground flex-1 min-w-[120px]"
                    value={curriculumSubject}
                    onChange={(e) => setCurriculumSubject(e.target.value)}
                  >
                    <option value="">Select subject...</option>
                    {CAPS_SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <select
                    className="text-xs rounded-lg border bg-card px-2 py-1.5 text-foreground w-24"
                    value={curriculumGrade}
                    onChange={(e) => setCurriculumGrade(e.target.value)}
                  >
                    <option value="">Grade</option>
                    {CAPS_GRADES.map((g) => (
                      <option key={g} value={g}>Grade {g}</option>
                    ))}
                  </select>
                  <Input
                    placeholder="Topic (e.g., Algebra)"
                    className="text-xs h-8 flex-1 min-w-[140px]"
                    value={curriculumTopic}
                    onChange={(e) => setCurriculumTopic(e.target.value)}
                  />
                </div>
                {(curriculumSubject || curriculumGrade || curriculumTopic) && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {curriculumSubject && (
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <BookOpen className="h-3 w-3" /> {curriculumSubject}
                      </Badge>
                    )}
                    {curriculumGrade && (
                      <Badge variant="secondary" className="text-[10px]">
                        Grade {curriculumGrade}
                      </Badge>
                    )}
                    {curriculumTopic && (
                      <Badge variant="secondary" className="text-[10px]">
                        {curriculumTopic}
                      </Badge>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  Tagging messages with CAPS curriculum context helps teachers and parents track learning progress.
                </p>
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-background">
              {messages === undefined ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="h-10 w-10 opacity-20 mb-2" />
                  <p className="text-sm">No messages yet. Say hello! 👋</p>
                  <p className="text-xs mt-1">You can also share files, assignments, and curriculum resources.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {messages.map((msg: any, idx: number) => {
                    const isMe = msg.sender === selectedContact?._id ? false : true;
                    const showDate = idx === 0 || 
                      new Date(msg._creationTime).toDateString() !== new Date(messages[idx - 1]?._creationTime).toDateString();
                    const groupedReactions = getReactionsForMessage(msg);

                    return (
                      <div key={msg._id}>
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                              {format(new Date(msg._creationTime), "EEEE, d MMMM yyyy")}
                            </span>
                          </div>
                        )}
                        <div className={cn("flex mb-1 group", isMe ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[75%] md:max-w-[60%]")}>
                            {/* Reply preview */}
                            {msg.replyTo && (
                              <div className={cn(
                                "text-xs p-2 rounded-t-lg border-b-0 mb-0.5 flex items-start gap-1.5",
                                isMe ? "bg-primary-foreground/10 text-primary-foreground/70 mr-2" : "bg-muted-foreground/10 text-muted-foreground ml-2"
                              )}>
                                <Reply className="h-3 w-3 shrink-0 mt-0.5" />
                                <span className="line-clamp-1">{msg.replyTo.content}</span>
                              </div>
                            )}

                            {/* Message bubble */}
                            <div className={cn(
                              "rounded-2xl px-4 py-2.5 text-sm relative",
                              isMe
                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                : "bg-card border rounded-tl-sm",
                              msg.messageType === "system" && "bg-muted text-muted-foreground italic text-center w-full max-w-none"
                            )}>
                              {/* File attachment preview */}
                              {msg.messageType === "file" && (
                                <div className="flex items-center gap-2 mb-1.5 p-2 rounded-lg bg-black/5 dark:bg-white/5">
                                  <FileText className="h-8 w-8 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium truncate">{msg.fileName || "File"}</p>
                                    {msg.fileSize && (
                                      <p className="text-[10px] opacity-60">
                                        {(msg.fileSize / 1024).toFixed(0)} KB
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Image preview */}
                              {msg.messageType === "image" && msg.fileUrl && (
                                <img src={msg.fileUrl} alt="Shared" className="max-w-full rounded-lg mb-1.5 max-h-64 object-cover" />
                              )}

                              {/* Message content */}
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                              {/* Curriculum tags */}
                              {(msg.curriculumSubject || msg.curriculumGrade) && (
                                <div className={cn("flex flex-wrap gap-1 mt-1.5", isMe ? "justify-end" : "justify-start")}>
                                  {msg.curriculumSubject && (
                                    <span className={cn(
                                      "text-[9px] px-1.5 py-0.5 rounded-full",
                                      isMe ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                                    )}>
                                      {msg.curriculumSubject}
                                    </span>
                                  )}
                                  {msg.curriculumGrade && (
                                    <span className={cn(
                                      "text-[9px] px-1.5 py-0.5 rounded-full",
                                      isMe ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                                    )}>
                                      G{msg.curriculumGrade}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Timestamp & read receipt */}
                              <div className={cn(
                                "flex items-center gap-1 mt-0.5",
                                isMe ? "justify-end" : "justify-start"
                              )}>
                                <span className={cn(
                                  "text-[10px]",
                                  isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                                )}>
                                  {format(new Date(msg._creationTime), "HH:mm")}
                                </span>
                                {isMe && (
                                  msg.isRead
                                    ? <CheckCheck className="h-3 w-3 text-blue-400" />
                                    : <Clock className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                            </div>

                            {/* Reactions bar */}
                            {Object.keys(groupedReactions).length > 0 && (
                              <div className={cn(
                                "flex gap-0.5 mt-0.5",
                                isMe ? "justify-end mr-2" : "justify-start ml-2"
                              )}>
                                {Object.entries(groupedReactions).map(([emoji, data]) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(msg._id, emoji)}
                                    className={cn(
                                      "text-xs px-1.5 py-0.5 rounded-full border transition-colors",
                                      data.hasMine
                                        ? "bg-primary/10 border-primary/30 text-foreground"
                                        : "bg-card border-border hover:bg-accent"
                                    )}
                                  >
                                    {emoji} {data.count > 1 && <span className="text-[10px]">{data.count}</span>}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Reaction add button & reply */}
                            <div className={cn(
                              "flex gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
                              isMe ? "justify-end mr-2" : "justify-start ml-2"
                            )}>
                              <div className="relative">
                                <button
                                  className="text-[10px] text-muted-foreground hover:text-foreground p-0.5"
                                  onClick={() => {
                                    // Show emoji picker for this message
                                    handleReaction(msg._id, "👍");
                                  }}
                                  title="React"
                                >
                                  <Smile className="h-3 w-3" />
                                </button>
                              </div>
                              <button
                                className="text-[10px] text-muted-foreground hover:text-foreground p-0.5"
                                onClick={() => {
                                  setReplyTo(msg);
                                  inputRef.current?.focus();
                                }}
                                title="Reply"
                              >
                                <Reply className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Reply indicator */}
            {replyTo && (
              <div className="px-4 py-2 border-t bg-muted/50 flex items-center gap-2">
                <Reply className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    Replying to: {replyTo.content}
                  </p>
                </div>
                <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* File attachment preview */}
            {fileAttached && (
              <div className="px-4 py-2 border-t bg-muted/30 flex items-center gap-2">
                {fileAttached.type.startsWith("image/") ? (
                  <img src={URL.createObjectURL(fileAttached)} alt="preview" className="h-10 w-10 rounded object-cover" />
                ) : (
                  <FileText className="h-8 w-8 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{fileAttached.name}</p>
                  <p className="text-[10px] text-muted-foreground">{(fileAttached.size / 1024).toFixed(0)} KB</p>
                </div>
                <button onClick={() => setFileAttached(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Input area */}
            <div className="p-4 border-t bg-card">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <Textarea
                    ref={inputRef}
                    placeholder="Type a message..."
                    className="min-h-[44px] max-h-28 resize-none pr-10 text-sm"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <button
                      className="p-1 rounded hover:bg-accent text-muted-foreground"
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach file"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                    />
                  </div>
                </div>
                <Button
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  onClick={handleSend}
                  disabled={isSending || (!newMessage.trim() && !fileAttached)}
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[10px] text-muted-foreground">
                  Press Enter to send · Shift+Enter for new line
                </p>
                {(curriculumSubject || curriculumGrade) && (
                  <Badge variant="outline" className="text-[9px] gap-1 text-amber-600 border-amber-200 dark:border-amber-800">
                    <GraduationCap className="h-2.5 w-2.5" />
                    CAPS context active
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
