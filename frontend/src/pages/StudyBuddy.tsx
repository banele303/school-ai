import { useState, useRef, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Bot, Plus, Loader2, Sparkles, Lightbulb, MessageSquare, BookOpen, GraduationCap, Hash, Trash2, History } from "lucide-react";
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
      <div className="w-72 border-r bg-card flex flex-col shrink-0">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-foreground">AI Study Chat</h2>
              <p className="text-xs text-muted-foreground">CAPS Curriculum Tutor</p>
            </div>
          </div>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="School subject..." />
            </SelectTrigger>
            <SelectContent>
              {subjects?.map((s: any) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Curriculum Context Toggle */}
          <button
            onClick={() => setShowCurriculumBar(!showCurriculumBar)}
            className={cn(
              "w-full flex items-center justify-between text-xs p-2 rounded-lg border transition-colors",
              showCurriculumBar
                ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-900 dark:text-indigo-400"
                : "border-border text-muted-foreground hover:bg-accent"
            )}
          >
            <span className="flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" />
              CAPS Curriculum
            </span>
            <Badge variant="outline" className={cn(
              "text-[9px] h-4",
              showCurriculumBar ? "border-indigo-300 dark:border-indigo-800" : ""
            )}>
              {capsSubject || capsGrade ? "Active" : "Off"}
            </Badge>
          </button>

          {showCurriculumBar && (
            <div className="space-y-2 p-2 rounded-lg bg-muted/50 border">
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
                <div className="flex flex-wrap gap-1">
                  {capsSubject && <Badge variant="secondary" className="text-[10px]">{capsSubject}</Badge>}
                  {capsGrade && <Badge variant="secondary" className="text-[10px]">G{capsGrade}</Badge>}
                  {capsTopic && <Badge variant="secondary" className="text-[10px]">{capsTopic}</Badge>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 flex-1 overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Quick Prompts
            </h3>
            <button onClick={clearChat} className="text-muted-foreground hover:text-foreground" title="Clear chat">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt.label}
                onClick={() => {
                  setInput(prompt.label);
                  if (prompt.subject) setCapsSubject(prompt.subject);
                  if (prompt.grade) setCapsGrade(prompt.grade);
                  setShowCurriculumBar(true);
                }}
                className="w-full text-left text-xs p-3 rounded-lg border border-border hover:bg-accent transition-colors flex items-start gap-2"
              >
                <Lightbulb className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span>{prompt.label}</span>
                  {prompt.subject && (
                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                      {prompt.subject} {prompt.grade && `· G${prompt.grade}`}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t">
          <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg p-3 border border-indigo-500/20">
            <p className="text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3 inline text-indigo-500 mr-1" />
              Powered by <strong>DeepSeek</strong>. Responses are tailored to the South African CAPS curriculum.
            </p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b px-6 flex items-center gap-3 shrink-0 bg-card">
          <MessageSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <p className="font-medium text-sm text-foreground">AI Study Chat</p>
            <p className="text-xs text-muted-foreground">
              {capsSubject
                ? `${capsSubject}${capsGrade ? ` · Grade ${capsGrade}` : ""}${capsTopic ? ` · ${capsTopic}` : ""}`
                : subjectId
                  ? `Subject: ${subjects?.find((s: any) => s._id === subjectId)?.name || "..."}`
                  : "General study help"}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-auto p-6 space-y-4">
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
                  "max-w-[75%] rounded-2xl px-4 py-3 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-card border rounded-tl-sm"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-0.5 rounded">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[10px] font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      AI Tutor
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
              <div className="bg-card border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-card">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <Textarea
              placeholder="Ask me anything about your studies..."
              className="min-h-[52px] max-h-32 resize-none"
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
              className="h-[52px] w-[52px] shrink-0 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
