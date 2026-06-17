import { useState, useRef, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Bot, X, Send, Loader2, Sparkles, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CopyableCode = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="relative group my-3">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="secondary" className="h-7 w-7 rounded-md" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <pre className="bg-black/10 dark:bg-black/40 p-4 rounded-xl text-[12px] font-mono overflow-x-auto border border-black/5 dark:border-white/5 leading-relaxed">
        {code}
      </pre>
    </div>
  );
};

const MessageContent = ({ content }: { content: string }) => {
  const parts = content.split(/```/);
  if (parts.length === 1) return <>{content}</>;

  return (
    <>
      {parts.map((part, i) => (
        i % 2 === 0 ? <span key={i}>{part}</span> : <CopyableCode key={i} code={part.trim()} />
      ))}
    </>
  );
};

export function StudyBuddy() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your AI study assistant 🤖 Ask me anything about your subjects — I'll use your school's curriculum to help you!" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const subjects = useQuery(api.subjects.getSubjects);
  const askStudyBuddy = useAction(api.studyBuddy.askStudyBuddy);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const question = input.trim();
    setInput("");

    const userMsg: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const res = await askStudyBuddy({
        question,
        subjectId: (subjectId || undefined) as any,
        conversationHistory: history,
      });
      
      setMessages((prev) => [...prev, { role: "assistant", content: res.answer }]);
    } catch (e: any) {
      console.error(e);
      toast.error("AI couldn't answer right now. Try again!");
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I had trouble generating a response. Please check your Gemini API key configuration! 🙁" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground rounded-full w-14 h-14 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform group"
        >
          <Bot className="h-7 w-7 group-hover:animate-bounce" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[600px] flex flex-col rounded-2xl border border-white/20 bg-background/80 backdrop-blur-xl shadow-2xl shadow-primary/20 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm shadow-inner">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-base tracking-tight drop-shadow-sm">AI Study Chat</p>
              <p className="text-[11px] text-primary-foreground/90 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" /> Edge Powered
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Subject Selector */}
          <div className="px-4 py-3 border-b bg-muted/30 backdrop-blur-md">
            <Select value={subjectId} onValueChange={(val) => setSubjectId(val === "none" ? "" : val)}>
              <SelectTrigger className="h-9 text-xs bg-background/50 border-white/10 hover:bg-background/80 transition-colors rounded-xl">
                <SelectValue placeholder="📚 Select subject context..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-white/10 shadow-xl backdrop-blur-xl bg-background/95">
                <SelectItem value="none" className="font-medium">🌍 General Knowledge</SelectItem>
                {subjects?.filter((s: any) => s.isActive).map((s: any) => (
                  <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Messages */}
          <div 
            className="flex-1 px-4 py-4 overflow-y-auto bg-gradient-to-b from-background/40 to-background/60 scroll-smooth" 
            ref={scrollRef}
          >
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start animate-in fade-in slide-in-from-bottom-2")}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mr-3 mt-1 shrink-0 shadow-sm">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[82%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm backdrop-blur-md",
                    msg.role === "user"
                      ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-sm shadow-primary/20 border border-primary/20"
                      : "bg-muted/50 border border-white/5 rounded-tl-sm text-foreground/90"
                  )}>
                    <MessageContent content={msg.content} />
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-3 animate-in fade-in">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  </div>
                  <div className="bg-muted/50 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm backdrop-blur-md">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="p-3 border-t bg-background/80 backdrop-blur-xl border-white/10 flex gap-2 items-end">
            <Textarea
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[44px] max-h-24 resize-none text-[13px] bg-muted/30 border-white/10 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/50 py-3"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <Button size="icon" className="h-[44px] w-[44px] shrink-0 rounded-xl shadow-md transition-transform active:scale-95" onClick={handleSend} disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-1" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
