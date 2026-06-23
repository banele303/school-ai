import { useState, useRef, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Bot, Plus, Loader2, Sparkles, Lightbulb, MessageSquare, BookOpen, GraduationCap, Hash, Trash2, History, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CAPS_SUBJECTS = [
  "Mathematics", "English Home Language", "English FAL", "Afrikaans FAL",
  "isiZulu HL", "Life Sciences", "Physical Sciences", "Accounting",
  "Economics", "Business Studies", "Geography", "History",
  "Life Orientation", "Creative Arts", "Technology", "EMS"
];

const CAPS_GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

export default function StudyBuddyPage() {
  const [input, setInput] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [capsSubject, setCapsSubject] = useState("");
  const [capsGrade, setCapsGrade] = useState("");
  const [capsTopic, setCapsTopic] = useState("");
  const [showCurriculumBar, setShowCurriculumBar] = useState(false);
  const [persona, setPersona] = useState<"default" | "exam" | "creative">("default");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI study assistant 🎓 Ask me anything about your CAPS curriculum subjects — I'll help you understand concepts, prepare for exams, and work through homework!",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const subjects = useQuery(api.subjects.getSubjects);
  const askStudyBuddy = useAction(api.studyBuddy.askStudyBuddy);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      
      // Enrich question with curriculum context
      let enrichedQuestion = question;
      const contextParts: string[] = [];
      if (capsSubject) contextParts.push(`Subject: ${capsSubject}`);
      if (capsGrade) contextParts.push(`Grade: ${capsGrade}`);
      if (capsTopic) contextParts.push(`Topic: ${capsTopic}`);
      if (contextParts.length > 0) {
        enrichedQuestion = `[${contextParts.join(" | ")}]\nStudent: ${question}`;
      }

      const res = await askStudyBuddy({
        question: enrichedQuestion,
        subjectId: (subjectId || undefined) as any,
        persona,
        conversationHistory: history,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: res.answer }]);
    } catch (e: any) {
      console.error(e);
      toast.error("AI couldn't answer right now. Try again!");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I had trouble generating a response. Please check your connection and try again! 🙁",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { label: "Explain photosynthesis", subject: "Life Sciences", grade: "10" },
    { label: "Solve: 2x + 5 = 15", subject: "Mathematics", grade: "9" },
    { label: "Causes of WW1", subject: "History", grade: "11" },
    { label: "What is a noun?", subject: "English Home Language", grade: "8" },
    { label: "Accounting equation", subject: "Accounting", grade: "10" },
    { label: "Newton's laws examples", subject: "Physical Sciences", grade: "11" },
    { label: "How does a bill become law?", subject: "EMS", grade: "7" },
    { label: "5 exam prep tips", subject: "", grade: "12" },
  ];

  const clearChat = () => {
    setMessages([{
      role: "assistant",
      content: "Chat cleared! Ask me anything about your studies 🎓",
    }]);
  };

  return (
    <div className="flex h-[calc(100vh-56px)] bg-background">
      {/* Sidebar */}
      <div className="w-72 border-r bg-zinc-50/40 dark:bg-zinc-950/20 backdrop-blur-md flex flex-col shrink-0">
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-red-500 to-rose-600 p-2 rounded-lg shadow-sm shadow-red-500/25">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-foreground">AI Study Chat</h2>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">CAPS Curriculum Tutor</p>
            </div>
          </div>
          
          {/* AI Persona Selector */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
              Tutor Persona
            </label>
            <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-lg border">
              <button
                onClick={() => setPersona("default")}
                className={cn(
                  "py-1 text-[10px] font-semibold rounded-md transition-all",
                  persona === "default"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Supportive, step-by-step guide"
              >
                🎓 Tutor
              </button>
              <button
                onClick={() => setPersona("exam")}
                className={cn(
                  "py-1 text-[10px] font-semibold rounded-md transition-all",
                  persona === "exam"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Strategic exam prep coaching"
              >
                🏆 Coach
              </button>
              <button
                onClick={() => setPersona("creative")}
                className={cn(
                  "py-1 text-[10px] font-semibold rounded-md transition-all",
                  persona === "creative"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Rich analogies & visual descriptions"
              >
                💡 Visual
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
              Class Context
            </label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="h-9 text-xs rounded-lg">
                <SelectValue placeholder="Select class subject..." />
              </SelectTrigger>
              <SelectContent>
                {subjects?.map((s: any) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Curriculum Context Toggle */}
          <button
            onClick={() => setShowCurriculumBar(!showCurriculumBar)}
            className={cn(
              "w-full flex items-center justify-between text-xs p-2 rounded-lg border transition-colors",
              showCurriculumBar
                ? "bg-red-50/50 border-red-200 text-red-700 dark:bg-red-950/10 dark:border-red-900/50 dark:text-red-400"
                : "border-border text-muted-foreground hover:bg-accent"
            )}
          >
            <span className="flex items-center gap-1.5 font-medium">
              <GraduationCap className="h-3.5 w-3.5" />
              CAPS Curriculum
            </span>
            <Badge variant="outline" className={cn(
              "text-[9px] h-4 px-1",
              showCurriculumBar ? "border-red-300 dark:border-red-800" : ""
            )}>
              {capsSubject || capsGrade ? "Active" : "Off"}
            </Badge>
          </button>

          {showCurriculumBar && (
            <div className="space-y-2 p-2 rounded-lg bg-muted/30 border border-border/80 animate-in fade-in duration-200">
              <Select value={capsSubject} onValueChange={setCapsSubject}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="CAPS subject..." />
                </SelectTrigger>
                <SelectContent>
                  {CAPS_SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Select value={capsGrade} onValueChange={setCapsGrade}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAPS_GRADES.map((g) => (
                      <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Topic"
                  className="h-8 text-xs flex-1"
                  value={capsTopic}
                  onChange={(e) => setCapsTopic(e.target.value)}
                />
              </div>
              {(capsSubject || capsGrade) && (
                <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                  {capsSubject && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{capsSubject}</Badge>}
                  {capsGrade && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">G{capsGrade}</Badge>}
                  {capsTopic && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{capsTopic}</Badge>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 flex-1 overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Quick Prompts
            </h3>
            <button onClick={clearChat} className="text-muted-foreground hover:text-red-500 transition-colors" title="Clear chat">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt.label}
                onClick={() => {
                  setInput(prompt.label);
                  if (prompt.subject) setCapsSubject(prompt.subject);
                  if (prompt.grade) setCapsGrade(prompt.grade);
                  setShowCurriculumBar(true);
                }}
                className="w-full text-left text-xs p-2.5 rounded-lg border border-border/80 bg-card hover:bg-accent hover:border-accent-foreground/10 hover:shadow-sm transition-all flex items-start gap-2 group"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-medium text-foreground group-hover:text-red-650 dark:group-hover:text-red-400 transition-colors">{prompt.label}</span>
                  {prompt.subject && (
                    <span className="block text-[9px] text-muted-foreground mt-0.5">
                      {prompt.subject} {prompt.grade && `· G${prompt.grade}`}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t">
          <div className="bg-gradient-to-r from-red-500/5 to-rose-500/5 rounded-xl p-3 border border-red-500/10">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <Sparkles className="w-3 h-3 inline text-red-500 mr-1 animate-pulse" />
              Powered by <strong>DeepSeek</strong>. Responses are aligned to the South African CAPS syllabus.
            </p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-zinc-950/20 relative">
        {/* Decorative ambient glowing orbs */}
        <div className="absolute top-12 right-12 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-12 left-12 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="h-14 border-b px-6 flex items-center gap-3 shrink-0 bg-card/60 backdrop-blur-md relative z-10">
          <MessageSquare className="h-4.5 w-4.5 text-red-500" />
          <div>
            <p className="font-semibold text-sm text-foreground">AI Study Chat</p>
            <p className="text-[10px] text-muted-foreground">
              {capsSubject
                ? `${capsSubject}${capsGrade ? ` · Grade ${capsGrade}` : ""}${capsTopic ? ` · ${capsTopic}` : ""}`
                : subjectId
                  ? `Subject: ${subjects?.find((s: any) => s._id === subjectId)?.name || "..."}`
                  : "General study help"}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-auto p-6 space-y-4 relative z-10">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                  msg.role === "user"
                    ? "bg-gradient-to-br from-red-650 to-rose-600 text-white rounded-tr-sm"
                    : "bg-white/80 dark:bg-zinc-900/60 border border-slate-200/50 dark:border-zinc-800/40 backdrop-blur-md rounded-tl-sm"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center justify-between gap-3 mb-2 border-b border-border/40 pb-1.5 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className="bg-gradient-to-br from-red-500 to-rose-600 p-0.5 rounded shadow-sm shadow-red-500/20">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-[10px] font-bold bg-gradient-to-r from-red-655 to-rose-600 bg-clip-text text-transparent uppercase tracking-wider">
                        {persona === "exam" ? "AI Exam Coach" : persona === "creative" ? "AI Creative Visualizer" : "AI Tutor"}
                      </span>
                    </div>
                    {/* South African Multilingual tag */}
                    <span className="text-[8px] font-bold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/15 select-none">
                      🇿🇦 Multilingual
                    </span>
                  </div>
                )}
                <div className="whitespace-normal leading-relaxed text-sm select-text text-foreground">
                  <MarkdownRenderer content={msg.content} />
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/80 dark:bg-zinc-900/60 border border-slate-200/50 dark:border-zinc-800/40 backdrop-blur-md rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                <span className="text-xs text-muted-foreground font-medium">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-card/60 backdrop-blur-md relative z-10">
          <div className="flex gap-2 max-w-4xl mx-auto items-end bg-white dark:bg-zinc-900 border border-border focus-within:ring-2 focus-within:ring-red-500/10 focus-within:border-red-500/40 rounded-xl p-1.5 shadow-sm transition-all">
            <Textarea
              placeholder="Ask me anything about your studies..."
              className="flex-1 min-h-[44px] max-h-32 resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm shadow-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0 bg-gradient-to-r from-red-650 to-rose-600 hover:from-red-600 hover:to-rose-500 text-white rounded-lg shadow-md shadow-red-500/10 transition-all duration-300"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <Send className="h-4.5 w-4.5" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2 select-none">
            Press Enter to send · Shift+Enter for new line · AI responses are aligned to your syllabus
          </p>
        </div>
      </div>
    </div>
  );
}
