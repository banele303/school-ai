import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, Search, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function getInitials(name: string = "") {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function MessagesPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const conversations = useQuery(api.messages.getConversations);
  const messageable = useQuery(api.messages.getMessageableUsers);
  const messages = useQuery(
    api.messages.getConversationMessages,
    selectedUserId ? { otherUserId: selectedUserId as any } : "skip"
  );
  const markRead = useMutation(api.messages.markConversationRead);
  const sendMessage = useMutation(api.messages.sendMessage);

  const selectedContact = conversations?.find((c: any) => c.contact?._id === selectedUserId)?.contact || messageable?.find((u: any) => u._id === selectedUserId);

  const handleSelect = (userId: string) => {
    setSelectedUserId(userId);
    markRead({ otherUserId: userId as any }).catch(() => {});
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUserId) return;
    setIsSending(true);
    try {
      await sendMessage({ recipientId: selectedUserId as any, content: newMessage.trim() });
      setNewMessage("");
    } catch (e: any) {
      toast.error(e.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleNewConversation = async (userId: string) => {
    setSelectedUserId(userId);
    setNewConvOpen(false);
  };

  const filteredConversations = conversations?.filter((c: any) =>
    c.contact?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col shrink-0">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Messages</h2>
            <Dialog open={newConvOpen} onOpenChange={setNewConvOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Conversation</DialogTitle></DialogHeader>
                <ScrollArea className="max-h-[300px] pr-2">
                  <div className="space-y-1">
                    {messageable === undefined ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                    ) : messageable.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No contacts available.</p>
                    ) : (
                      messageable.map((u: any) => (
                        <button
                          key={u._id}
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-left text-foreground"
                          onClick={() => handleNewConversation(u._id)}
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm text-foreground">{u.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-8 h-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  "w-full flex items-center gap-3 p-4 hover:bg-muted/60 transition-colors border-b text-left",
                  selectedUserId === contact?._id && "bg-primary/5 border-l-2 border-l-primary"
                )}
                onClick={() => handleSelect(contact!._id)}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {getInitials(contact?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">{contact?.name}</p>
                    {lastMsg && <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(lastMsg._creationTime), { addSuffix: true })}
                    </span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{lastMsg?.content || "No messages yet"}</p>
                </div>
                {!!unreadCount && <Badge className="h-4 min-w-4 text-[10px] px-1 shrink-0">{unreadCount}</Badge>}
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {!selectedUserId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <MessageSquare className="h-12 w-12 opacity-20" />
            <p>Select a conversation or start a new one</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-14 border-b px-6 flex items-center gap-3 shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {getInitials(selectedContact?.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{selectedContact?.name || "..."}</p>
                <p className="text-xs text-muted-foreground capitalize">{selectedContact?.role}</p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messages === undefined ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : messages.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No messages yet. Say hello! 👋</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const isMe = msg.sender === selectedContact?._id ? false : true;
                    return (
                      <div key={msg._id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
                          isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"
                        )}>
                          <p>{msg.content}</p>
                          <p className={cn("text-[10px] mt-1", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
                            {formatDistanceToNow(new Date(msg._creationTime), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t flex gap-2">
              <Textarea
                placeholder="Type a message..."
                className="min-h-[44px] max-h-28 resize-none"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              />
              <Button size="icon" className="h-11 w-11 shrink-0" onClick={handleSend} disabled={isSending || !newMessage.trim()}>
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
