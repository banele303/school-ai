import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  BarChart3,
  BookOpenCheck,
  Bot,
  Brain,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  CloudDownload,
  FileText,
  Layers3,
  LineChart,
  Megaphone,
  PackageOpen,
  Palette,
  PlayCircle,
  Radio,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wand2,
  WifiOff,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SuiteModule = {
  path: string;
  title: string;
  eyebrow: string;
  summary: string;
  icon: LucideIcon;
  accent: string;
  status: "Ready" | "Prototype" | "Next";
  metrics: { label: string; value: string; trend: string }[];
  actions: string[];
};

const modules: SuiteModule[] = [
  {
    path: "/command-center",
    title: "School Command Center",
    eyebrow: "Executive overview",
    summary: "A premium admin cockpit for attendance, finances, teaching activity, at-risk learners, and operational alerts.",
    icon: BarChart3,
    accent: "from-slate-900 to-emerald-700",
    status: "Ready",
    metrics: [
      { label: "Attendance Today", value: "94%", trend: "+4%" },
      { label: "At-Risk Learners", value: "18", trend: "-7" },
      { label: "Fee Health", value: "82%", trend: "+9%" },
    ],
    actions: ["Review risk list", "Send staff briefing", "Export board pack"],
  },
  {
    path: "/lesson-studio",
    title: "Smart Lesson Studio",
    eyebrow: "AI planning",
    summary: "Teachers generate lesson plans, slides, quizzes, homework, rubrics, and resource packs from one prompt.",
    icon: Wand2,
    accent: "from-indigo-800 to-cyan-700",
    status: "Prototype",
    metrics: [
      { label: "Draft Speed", value: "8 min", trend: "-70%" },
      { label: "Quiz Items", value: "25", trend: "+25" },
      { label: "CAPS Match", value: "96%", trend: "+6%" },
    ],
    actions: ["Generate lesson", "Create quiz", "Attach resources"],
  },
  {
    path: "/student-timeline",
    title: "Student Learning Timeline",
    eyebrow: "Learner intelligence",
    summary: "A chronological learner story combining attendance, marks, videos, behavior, AI sessions, and interventions.",
    icon: LineChart,
    accent: "from-emerald-800 to-teal-600",
    status: "Ready",
    metrics: [
      { label: "Growth Score", value: "73", trend: "+11" },
      { label: "Missed Tasks", value: "3", trend: "-2" },
      { label: "Engagement", value: "88%", trend: "+12%" },
    ],
    actions: ["Open profile", "Create intervention", "Notify parent"],
  },
  {
    path: "/parent-reports",
    title: "AI Parent Reports",
    eyebrow: "Family communication",
    summary: "Generate clear parent updates that explain strengths, concerns, next steps, and home support actions.",
    icon: FileText,
    accent: "from-rose-800 to-orange-600",
    status: "Prototype",
    metrics: [
      { label: "Reports Drafted", value: "124", trend: "+124" },
      { label: "Reading Level", value: "Simple", trend: "clear" },
      { label: "Languages", value: "5", trend: "+5" },
    ],
    actions: ["Draft report", "Translate", "Send to parent"],
  },
  {
    path: "/class-engagement",
    title: "Live Class Engagement",
    eyebrow: "Interactive lessons",
    summary: "Polls, quick quizzes, reactions, raise-hand queue, attendance, spotlight questions, and automatic summaries.",
    icon: Radio,
    accent: "from-red-800 to-pink-700",
    status: "Ready",
    metrics: [
      { label: "Participation", value: "81%", trend: "+18%" },
      { label: "Questions", value: "42", trend: "+12" },
      { label: "Poll Accuracy", value: "76%", trend: "+9%" },
    ],
    actions: ["Launch poll", "Start quiz", "Summarize chat"],
  },
  {
    path: "/recording-studio",
    title: "Auto-Recorded Lesson Library",
    eyebrow: "Stream to resource",
    summary: "Turn every live class into a searchable recording with transcript, summary, quiz, and subject tagging.",
    icon: PlayCircle,
    accent: "from-sky-800 to-blue-600",
    status: "Next",
    metrics: [
      { label: "Recordings", value: "36", trend: "+36" },
      { label: "Auto Tags", value: "91%", trend: "+91%" },
      { label: "Study Clips", value: "14", trend: "+14" },
    ],
    actions: ["Process recording", "Generate transcript", "Publish clips"],
  },
  {
    path: "/teacher-marketplace",
    title: "Teacher Marketplace",
    eyebrow: "Revenue layer",
    summary: "Sell or share lesson packs, quizzes, resource bundles, past papers, and school-approved templates.",
    icon: ShoppingBag,
    accent: "from-violet-800 to-fuchsia-700",
    status: "Next",
    metrics: [
      { label: "Packs Listed", value: "58", trend: "+58" },
      { label: "Top Bundle", value: "Grade 10", trend: "hot" },
      { label: "Revenue", value: "R12k", trend: "+R12k" },
    ],
    actions: ["List pack", "Review quality", "Feature bundle"],
  },
  {
    path: "/offline-mode",
    title: "Offline and Low-Data Mode",
    eyebrow: "Access anywhere",
    summary: "Cache notes, homework, low-data video, and submissions for learners with unreliable connectivity.",
    icon: WifiOff,
    accent: "from-amber-700 to-lime-700",
    status: "Prototype",
    metrics: [
      { label: "Cached Lessons", value: "21", trend: "+21" },
      { label: "Data Saved", value: "64%", trend: "+64%" },
      { label: "Sync Queue", value: "8", trend: "ready" },
    ],
    actions: ["Enable cache", "Sync now", "Low-data video"],
  },
  {
    path: "/white-label",
    title: "White-Label School Branding",
    eyebrow: "Sell to many schools",
    summary: "Each school gets its own logo, colors, subdomain, report styling, login look, and communication identity.",
    icon: Palette,
    accent: "from-zinc-900 to-red-700",
    status: "Ready",
    metrics: [
      { label: "Brand Kits", value: "4", trend: "+4" },
      { label: "Custom Domains", value: "2", trend: "+2" },
      { label: "Reports Styled", value: "100%", trend: "done" },
    ],
    actions: ["Edit brand kit", "Preview portal", "Publish theme"],
  },
  {
    path: "/ai-tutor-memory",
    title: "AI Tutor Memory",
    eyebrow: "Personalized learning",
    summary: "Study Buddy remembers weak topics, preferred explanations, confidence, and creates adaptive practice paths.",
    icon: Brain,
    accent: "from-purple-900 to-blue-700",
    status: "Prototype",
    metrics: [
      { label: "Weak Topics", value: "6", trend: "-3" },
      { label: "Practice Sets", value: "18", trend: "+18" },
      { label: "Confidence", value: "79%", trend: "+15%" },
    ],
    actions: ["Build practice", "Explain again", "Update memory"],
  },
];

function getCurrentModule(pathname: string) {
  return modules.find((item) => item.path === pathname) || modules[0];
}

export default function PremiumSuite() {
  const location = useLocation();
  const navigate = useNavigate();
  const current = getCurrentModule(location.pathname);
  const Icon = current.icon;
  const [prompt, setPrompt] = useState("Grade 10 Mathematics: quadratic equations, 45 minute lesson, include a quick quiz.");
  const [autoSync, setAutoSync] = useState(true);

  const productScore = useMemo(() => {
    const ready = modules.filter((item) => item.status === "Ready").length;
    const prototype = modules.filter((item) => item.status === "Prototype").length;
    return Math.round(((ready * 1 + prototype * 0.55) / modules.length) * 100);
  }, []);

  return (
    <div className="min-h-full bg-slate-50 text-slate-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-6">
        <section className={cn("overflow-hidden rounded-lg bg-gradient-to-br p-6 text-white shadow-sm", current.accent)}>
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
            <div>
              <Badge className="mb-4 bg-white/15 text-white hover:bg-white/20">{current.eyebrow}</Badge>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="h-6 w-6" />
                </span>
                <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">{current.title}</h1>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-white/80 md:text-base">{current.summary}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {current.actions.map((action) => (
                  <Button key={action} variant="secondary" className="gap-2 bg-white text-slate-950 hover:bg-white/90">
                    <Zap className="h-4 w-4" />
                    {action}
                  </Button>
                ))}
              </div>
            </div>
            <Card className="border-white/15 bg-white/10 text-white shadow-none backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  Product Readiness
                  <Badge className="bg-emerald-400 text-emerald-950">{productScore}%</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={productScore} className="bg-white/20 [&>div]:bg-emerald-300" />
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="rounded-md bg-white/10 p-3">
                    <div className="text-lg font-semibold">{modules.filter((item) => item.status === "Ready").length}</div>
                    Ready
                  </div>
                  <div className="rounded-md bg-white/10 p-3">
                    <div className="text-lg font-semibold">{modules.filter((item) => item.status === "Prototype").length}</div>
                    Prototype
                  </div>
                  <div className="rounded-md bg-white/10 p-3">
                    <div className="text-lg font-semibold">{modules.filter((item) => item.status === "Next").length}</div>
                    Next
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {modules.map((item) => {
            const ModuleIcon = item.icon;
            const active = item.path === current.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={cn(
                  "rounded-lg border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-zinc-900",
                  active ? "border-emerald-400 ring-2 ring-emerald-400/20" : "border-slate-200 dark:border-zinc-800"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 dark:bg-zinc-800">
                    <ModuleIcon className="h-4 w-4" />
                  </span>
                  <Badge variant={item.status === "Ready" ? "default" : "outline"}>{item.status}</Badge>
                </div>
                <h2 className="mt-3 line-clamp-2 text-sm font-semibold">{item.title}</h2>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-zinc-400">{item.summary}</p>
              </button>
            );
          })}
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                {current.title} Workspace
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="build">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="build">Build</TabsTrigger>
                  <TabsTrigger value="automate">Automate</TabsTrigger>
                  <TabsTrigger value="sell">Sell</TabsTrigger>
                </TabsList>
                <TabsContent value="build" className="mt-4 space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    {current.metrics.map((metric) => (
                      <div key={metric.label} className="rounded-lg border border-slate-200 p-4 dark:border-zinc-800">
                        <p className="text-xs text-slate-500 dark:text-zinc-400">{metric.label}</p>
                        <div className="mt-2 flex items-end justify-between">
                          <span className="text-2xl font-semibold">{metric.value}</span>
                          <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400">{metric.trend}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-3">
                    <LabelLike icon={Bot} title="AI builder prompt" />
                    <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} />
                    <div className="flex flex-wrap gap-2">
                      <Button className="gap-2"><Wand2 className="h-4 w-4" /> Generate preview</Button>
                      <Button variant="outline" className="gap-2"><ClipboardList className="h-4 w-4" /> Save blueprint</Button>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="automate" className="mt-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      ["Auto summarize", "Create summaries after lessons or reports."],
                      ["Smart reminders", "Notify learners, parents, or staff at the right time."],
                      ["Risk detection", "Flag attendance, marks, fees, and engagement concerns."],
                      ["Weekly digest", "Send leadership a clean Friday performance brief."],
                    ].map(([title, text]) => (
                      <div key={title} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-4 dark:border-zinc-800">
                        <div>
                          <p className="text-sm font-semibold">{title}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{text}</p>
                        </div>
                        <Switch checked={autoSync} onCheckedChange={setAutoSync} />
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="sell" className="mt-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-8 w-8 text-emerald-500" />
                      <div>
                        <h3 className="font-semibold">Sales-ready positioning</h3>
                        <p className="text-sm text-slate-500 dark:text-zinc-400">
                          Package this as an add-on schools can buy: faster teaching, better parent communication, higher learner engagement, and stronger leadership visibility.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {["Starter school", "Professional school", "District network"].map((tier, index) => (
                        <div key={tier} className="rounded-md bg-white p-3 dark:bg-zinc-900">
                          <p className="text-sm font-semibold">{tier}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                            {index === 0 ? "Core tools and branding." : index === 1 ? "AI reports, live tools, marketplace." : "Multi-school analytics and rollout controls."}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <aside className="space-y-4">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-base">Launch Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Connect Convex data model",
                  "Add school-level permissions",
                  "Create sample demo data",
                  "Add export and share flows",
                  "Publish pricing bundle",
                ].map((item, index) => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className={cn("h-4 w-4", index < 2 ? "text-emerald-500" : "text-slate-300 dark:text-zinc-700")} />
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-base">Fast Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {[
                  [Send, "Send demo invite"],
                  [CloudDownload, "Prepare offline pack"],
                  [PackageOpen, "Create resource bundle"],
                  [Building2, "Add school brand"],
                ].map(([ActionIcon, label]) => {
                  const IconComponent = ActionIcon as LucideIcon;
                  return (
                    <Button key={label as string} variant="outline" className="justify-start gap-2">
                      <IconComponent className="h-4 w-4" />
                      {label as string}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function LabelLike({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium">
      <Icon className="h-4 w-4 text-emerald-500" />
      {title}
    </div>
  );
}
