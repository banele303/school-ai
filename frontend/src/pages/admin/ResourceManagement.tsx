import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const capsApi = api as any;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, FileText, BookOpen, Trash2, Database, RefreshCw, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { FileUpload } from "@/components/global/FileUpload";

export default function AdminResources() {
  const [activeTab, setActiveTab] = useState("past-papers");
  const [selectedGrade, setSelectedGrade] = useState<number>(12);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  // Seed functions
  const seedBasic = useMutation(api.seed.seedAll);
  const seedCaps = useMutation(capsApi.capsSeed?.seedAll);

  const handleSeedBasic = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const result = await seedBasic();
      setSeedResult(result || "Basic seed completed!");
      toast.success("Basic data seeded successfully!");
    } catch (e: any) {
      toast.error(e.message || "Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  const handleSeedCaps = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const result = await seedCaps();
      setSeedResult(result || "CAPS data seeded!");
      toast.success("CAPS curriculum data seeded successfully!");
    } catch (e: any) {
      toast.error(e.message || "CAPS seed failed. Make sure capsSeed.ts is deployed.");
    } finally {
      setSeeding(false);
    }
  };

  const handleSeedAll = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const r1 = await seedBasic();
      const r2 = await seedCaps();
      setSeedResult(`✓ Basic: ${r1}\n✓ CAPS: ${r2}`);
      toast.success("All data seeded successfully!");
    } catch (e: any) {
      toast.error(e.message || "Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  // Past paper form
  const [ppTitle, setPpTitle] = useState("");
  const [ppGrade, setPpGrade] = useState("12");
  const [ppSubject, setPpSubject] = useState("");
  const [ppYear, setPpYear] = useState("2024");
  const [ppTerm, setPpTerm] = useState("0");
  const [ppType, setPpType] = useState("exam");
  const [ppFileUrl, setPpFileUrl] = useState("");

  // Study resource form
  const [srTitle, setSrTitle] = useState("");
  const [srDescription, setSrDescription] = useState("");
  const [srGrade, setSrGrade] = useState("12");
  const [srSubject, setSrSubject] = useState("");
  const [srType, setSrType] = useState("notes");
  const [srFileUrl, setSrFileUrl] = useState("");

  // Subject form states
  const [subName, setSubName] = useState("");
  const [subCode, setSubCode] = useState("");
  const [subPhase, setSubPhase] = useState("FET");
  const [subCompulsory, setSubCompulsory] = useState(false);
  const [subLanguage, setSubLanguage] = useState(false);
  const [subDesc, setSubDesc] = useState("");
  const [showAddSubject, setShowAddSubject] = useState(false);

  // Syllabus topic form states
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [topicName, setTopicName] = useState("");
  const [topicTerm, setTopicTerm] = useState("1");
  const [topicSubtopics, setTopicSubtopics] = useState("");
  const [topicOutline, setTopicOutline] = useState("");
  const [topicHours, setTopicHours] = useState("10");

  const subjects = useQuery(capsApi.capsActions?.getCapsSubjects, { grade: selectedGrade });
  const ppSubjects = useQuery(capsApi.capsActions?.getCapsSubjects, { grade: Number(ppGrade) });
  const srSubjects = useQuery(capsApi.capsActions?.getCapsSubjects, { grade: Number(srGrade) });
  const pastPapers = useQuery(capsApi.capsActions?.getPastPapers, { grade: selectedGrade });
  const studyResources = useQuery(capsApi.capsActions?.getStudyResources, { grade: selectedGrade });
  const syllabusTopicsList = useQuery(capsApi.capsActions?.getSyllabusTopics, 
    expandedSubjectId ? { subjectId: expandedSubjectId as any } : "skip"
  );

  const addPastPaper = useMutation(capsApi.capsActions?.addPastPaper);
  const deletePastPaper = useMutation(capsApi.capsActions?.deletePastPaper);
  const addStudyResource = useMutation(capsApi.capsActions?.addStudyResource);
  const deleteStudyResource = useMutation(capsApi.capsActions?.deleteStudyResource);
  const addCapsSubject = useMutation(capsApi.capsActions?.addCapsSubject);
  const addSyllabusTopic = useMutation(capsApi.capsActions?.addSyllabusTopic);
  const deleteSyllabusTopic = useMutation(capsApi.capsActions?.deleteSyllabusTopic);

  const handleAddPastPaper = async () => {
    if (!ppTitle || !ppSubject || !ppFileUrl) return toast.error("Fill all required fields");
    try {
      await addPastPaper({
        title: ppTitle,
        grade: Number(ppGrade),
        subjectId: ppSubject as any,
        language: selectedLanguage,
        year: Number(ppYear),
        term: Number(ppTerm),
        paperType: ppType,
        fileUrl: ppFileUrl,
        fileType: "pdf",
        fileSize: 0,
        tags: [ppType, `grade-${ppGrade}`, ppYear],
      });
      toast.success("Past paper added!");
      setPpTitle(""); setPpFileUrl("");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAddResource = async () => {
    if (!srTitle || !srSubject || !srFileUrl) return toast.error("Fill all required fields");
    try {
      await addStudyResource({
        title: srTitle,
        description: srDescription,
        grade: Number(srGrade),
        subjectId: srSubject as any,
        language: selectedLanguage,
        resourceType: srType,
        fileUrl: srFileUrl,
        fileType: "pdf",
        fileSize: 0,
        tags: [srType, `grade-${srGrade}`],
      });
      toast.success("Resource added!");
      setSrTitle(""); setSrDescription(""); setSrFileUrl("");
    } catch (e: any) { toast.error(e.message); }
  };

  const langName = (code: string) => {
    const map: Record<string, string> = { en: "English", zu: "isiZulu", xh: "isiXhosa", af: "Afrikaans", nso: "Sepedi", tn: "Setswana", st: "Sesotho", ts: "Xitsonga", ss: "siSwati", ve: "Tshivenda", nr: "isiNdebele" };
    return map[code] || code;
  };

  const handleAddSubject = async () => {
    if (!subName || !subCode) return toast.error("Name and Code are required");
    try {
      await addCapsSubject({
        name: subName,
        code: subCode,
        grade: selectedGrade,
        phase: subPhase,
        isCompulsory: subCompulsory,
        isLanguage: subLanguage,
        description: subDesc,
      });
      toast.success("Subject added successfully!");
      setSubName(""); setSubCode(""); setSubDesc("");
      setShowAddSubject(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to add subject");
    }
  };

  const handleAddSyllabusTopic = async () => {
    if (!expandedSubjectId || !topicName) return toast.error("Topic name is required");
    try {
      await addSyllabusTopic({
        capsSubject: expandedSubjectId as any,
        grade: selectedGrade,
        term: Number(topicTerm),
        topic: topicName,
        subTopics: topicSubtopics.split(",").map((s) => s.trim()).filter(Boolean),
        contentOutline: topicOutline,
        hoursPerTerm: Number(topicHours),
        language: selectedLanguage,
      });
      toast.success("Syllabus topic added successfully!");
      setTopicName(""); setTopicSubtopics(""); setTopicOutline("");
    } catch (e: any) {
      toast.error(e.message || "Failed to add topic");
    }
  };

  const handleDeleteSyllabusTopic = async (id: any) => {
    if (!confirm("Are you sure you want to delete this topic?")) return;
    try {
      await deleteSyllabusTopic({ id });
      toast.success("Syllabus topic deleted successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete topic");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resource Management</h1>
        <p className="text-muted-foreground">Upload and manage past papers, study materials, and syllabus content for all grades and languages.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-end flex-wrap">
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Grade</Label>
          <Select value={String(selectedGrade)} onValueChange={(v) => setSelectedGrade(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Language</Label>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="af">Afrikaans</SelectItem>
              <SelectItem value="zu">isiZulu</SelectItem>
              <SelectItem value="xh">isiXhosa</SelectItem>
              <SelectItem value="nso">Sepedi</SelectItem>
              <SelectItem value="tn">Setswana</SelectItem>
              <SelectItem value="st">Sesotho</SelectItem>
              <SelectItem value="ts">Xitsonga</SelectItem>
              <SelectItem value="ss">siSwati</SelectItem>
              <SelectItem value="ve">Tshivenda</SelectItem>
              <SelectItem value="nr">isiNdebele</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="past-papers">Past Papers</TabsTrigger>
          <TabsTrigger value="study-resources">Study Resources</TabsTrigger>
          <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
        </TabsList>

        <TabsContent value="past-papers" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Upload Past Paper</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Title *</Label>
                  <Input value={ppTitle} onChange={e => setPpTitle(e.target.value)} placeholder="Grade 12 Maths Paper 1 — Nov 2024" />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Subject *</Label>
                  <Select value={ppSubject} onValueChange={setPpSubject}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {ppSubjects?.map((s: any) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Grade</Label>
                  <Input type="number" value={ppGrade} onChange={e => { setPpGrade(e.target.value); setPpSubject(""); }} min={1} max={12} />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Year</Label>
                  <Input type="number" value={ppYear} onChange={e => setPpYear(e.target.value)} min={2020} max={2030} />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Term</Label>
                  <Select value={ppTerm} onValueChange={setPpTerm}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Full Year</SelectItem>
                      <SelectItem value="1">Term 1</SelectItem>
                      <SelectItem value="2">Term 2</SelectItem>
                      <SelectItem value="3">Term 3</SelectItem>
                      <SelectItem value="4">Term 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Type</Label>
                  <Select value={ppType} onValueChange={setPpType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exam">Exam</SelectItem>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="memo">Memo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">File Attachment *</Label>
                {!ppFileUrl ? (
                  <FileUpload
                    onUploadComplete={(result) => {
                      setPpFileUrl(result.fileUrl);
                    }}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,image/*"
                  />
                ) : (
                  <div className="p-3 border rounded-lg bg-muted/50 flex items-center justify-between">
                    <span className="text-xs truncate font-medium">{ppFileUrl}</span>
                    <Button variant="ghost" size="sm" onClick={() => setPpFileUrl("")}>
                      Remove
                    </Button>
                  </div>
                )}
              </div>
              <Button onClick={handleAddPastPaper} className="bg-[#dc2626] text-black hover:bg-[#b91c1c]">
                <Upload className="mr-2 h-4 w-4" /> Add Past Paper
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h3 className="font-semibold">Existing Past Papers — Grade {selectedGrade} ({langName(selectedLanguage)})</h3>
            {pastPapers === undefined ? <Loader2 className="h-6 w-6 animate-spin" /> : pastPapers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No past papers for this grade yet.</p>
            ) : pastPapers.map((pp: any) => (
              <Card key={pp._id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{pp.title}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">{pp.paperType}</Badge>
                      <Badge variant="outline" className="text-xs">{pp.year}</Badge>
                      <Badge variant="outline" className="text-xs">{langName(pp.language)}</Badge>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deletePastPaper({ id: pp._id })}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* STUDY RESOURCES TAB */}
        <TabsContent value="study-resources" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Upload Study Resource</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Title *</Label>
                  <Input value={srTitle} onChange={e => setSrTitle(e.target.value)} placeholder="Grade 12 Maths Formula Sheet" />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Subject *</Label>
                  <Select value={srSubject} onValueChange={setSrSubject}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {srSubjects?.map((s: any) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Description</Label>
                <Input value={srDescription} onChange={e => setSrDescription(e.target.value)} placeholder="Brief description..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Grade</Label>
                  <Input type="number" value={srGrade} onChange={e => { setSrGrade(e.target.value); setSrSubject(""); }} min={1} max={12} />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Type</Label>
                  <Select value={srType} onValueChange={setSrType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="notes">Notes</SelectItem>
                      <SelectItem value="worksheet">Worksheet</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="presentation">Presentation</SelectItem>
                      <SelectItem value="textbook">Textbook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">File Attachment *</Label>
                {!srFileUrl ? (
                  <FileUpload
                    onUploadComplete={(result) => {
                      setSrFileUrl(result.fileUrl);
                    }}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,image/*"
                  />
                ) : (
                  <div className="p-3 border rounded-lg bg-muted/50 flex items-center justify-between">
                    <span className="text-xs truncate font-medium">{srFileUrl}</span>
                    <Button variant="ghost" size="sm" onClick={() => setSrFileUrl("")}>
                      Remove
                    </Button>
                  </div>
                )}
              </div>
              <Button onClick={handleAddResource} className="bg-[#dc2626] text-black hover:bg-[#b91c1c]">
                <Upload className="mr-2 h-4 w-4" /> Add Resource
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h3 className="font-semibold">Existing Resources — Grade {selectedGrade}</h3>
            {studyResources === undefined ? <Loader2 className="h-6 w-6 animate-spin" /> : studyResources.length === 0 ? (
              <p className="text-muted-foreground text-sm">No resources for this grade yet.</p>
            ) : studyResources.map((r: any) => (
              <Card key={r._id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{r.title}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">{r.resourceType}</Badge>
                      <Badge variant="outline" className="text-xs">Grade {r.grade}</Badge>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteStudyResource({ id: r._id })}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SYLLABUS TAB */}
        <TabsContent value="syllabus" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Subjects & Curriculum</h3>
            <Button
              onClick={() => setShowAddSubject(!showAddSubject)}
              className="bg-[#dc2626] text-black hover:bg-[#b91c1c]"
            >
              {showAddSubject ? "Hide Subject Form" : "+ Add Subject"}
            </Button>
          </div>

          {showAddSubject && (
            <Card>
              <CardHeader><CardTitle className="text-base">Create New Subject</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Subject Name *</Label>
                    <Input value={subName} onChange={e => setSubName(e.target.value)} placeholder="e.g. Mathematical Literacy" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Subject Code *</Label>
                    <Input value={subCode} onChange={e => setSubCode(e.target.value)} placeholder="e.g. MATHLIT101" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Phase</Label>
                    <Select value={subPhase} onValueChange={setSubPhase}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FET">FET Phase (Gr 10-12)</SelectItem>
                        <SelectItem value="Senior">Senior Phase (Gr 7-9)</SelectItem>
                        <SelectItem value="Intermediate">Intermediate Phase (Gr 4-6)</SelectItem>
                        <SelectItem value="Foundation">Foundation Phase (Gr 1-3)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Is Compulsory?</Label>
                    <Select value={subCompulsory ? "true" : "false"} onValueChange={(v) => setSubCompulsory(v === "true")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No (Elective)</SelectItem>
                        <SelectItem value="true">Yes (Compulsory)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Is Language Subject?</Label>
                    <Select value={subLanguage ? "true" : "false"} onValueChange={(v) => setSubLanguage(v === "true")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No (Content Subject)</SelectItem>
                        <SelectItem value="true">Yes (Language Subject)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Description</Label>
                  <Input value={subDesc} onChange={e => setSubDesc(e.target.value)} placeholder="Brief description of the subject..." />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddSubject} className="bg-[#dc2626] text-black hover:bg-[#b91c1c]">Save Subject</Button>
                  <Button variant="outline" onClick={() => setShowAddSubject(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Syllabus Overview — Grade {selectedGrade} ({langName(selectedLanguage)})</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Click on a subject below to expand and manage its syllabus topics.</p>
            </CardHeader>
            <CardContent>
              {subjects === undefined ? <Loader2 className="h-6 w-6 animate-spin" /> : subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subjects found for Grade {selectedGrade}.</p>
              ) : (
                <div className="space-y-4">
                  {subjects.map((s: any) => {
                    const isExpanded = expandedSubjectId === s._id;
                    return (
                      <div key={s._id} className="border rounded-lg p-4 transition-all">
                        <button
                          type="button"
                          onClick={() => setExpandedSubjectId(isExpanded ? null : s._id)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold hover:text-primary transition-colors">{s.name}</h4>
                            <div className="flex gap-2 items-center">
                              <Badge variant={s.isCompulsory ? "default" : "outline"} className="text-xs">
                                {s.isCompulsory ? "Compulsory" : "Elective"}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">{s.phase}</Badge>
                              <span className="text-xs text-muted-foreground">{isExpanded ? "▲ Hide Topics" : "▼ Show Topics"}</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{s.description || "No description provided."}</p>
                        </button>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t space-y-4">
                            <div className="space-y-3">
                              <h5 className="font-semibold text-sm">Syllabus Topics</h5>
                              {syllabusTopicsList === undefined ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : syllabusTopicsList.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No syllabus topics added yet.</p>
                              ) : (
                                <div className="space-y-2">
                                  {syllabusTopicsList.map((st: any) => (
                                    <div key={st._id} className="p-3 border rounded bg-muted/20 flex justify-between items-start">
                                      <div className="space-y-1.5 flex-1 pr-4">
                                        <div className="flex items-center gap-2">
                                          <Badge className="text-[10px]">Term {st.term}</Badge>
                                          <h6 className="font-medium text-sm">{st.topic}</h6>
                                          <span className="text-[10px] text-muted-foreground">{st.hoursPerTerm} hours</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{st.contentOutline}</p>
                                        {st.subTopics && st.subTopics.length > 0 && (
                                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                                            {st.subTopics.map((sub: string, idx: number) => (
                                              <Badge key={idx} variant="outline" className="text-[9px] px-1 py-0">{sub}</Badge>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => handleDeleteSyllabusTopic(st._id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Add Syllabus Topic Form */}
                            <div className="p-4 border rounded bg-muted/10 space-y-3">
                              <h6 className="font-medium text-sm">Add Syllabus Topic</h6>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                  <Label className="text-xs font-medium mb-1 block">Topic Title *</Label>
                                  <Input value={topicName} onChange={e => setTopicName(e.target.value)} placeholder="e.g. Finance & Taxation" className="h-8 text-sm" />
                                </div>
                                <div>
                                  <Label className="text-xs font-medium mb-1 block">Term *</Label>
                                  <Select value={topicTerm} onValueChange={setTopicTerm}>
                                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="1">Term 1</SelectItem>
                                      <SelectItem value="2">Term 2</SelectItem>
                                      <SelectItem value="3">Term 3</SelectItem>
                                      <SelectItem value="4">Term 4</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                  <Label className="text-xs font-medium mb-1 block">Sub-topics (comma-separated)</Label>
                                  <Input value={topicSubtopics} onChange={e => setTopicSubtopics(e.target.value)} placeholder="e.g. VAT, Interest, Inflation" className="h-8 text-sm" />
                                </div>
                                <div>
                                  <Label className="text-xs font-medium mb-1 block">Suggested Hours</Label>
                                  <Input type="number" value={topicHours} onChange={e => setTopicHours(e.target.value)} min={1} max={50} className="h-8 text-sm" />
                                </div>
                              </div>

                              <div>
                                <Label className="text-xs font-medium mb-1 block">Content Description</Label>
                                <Input value={topicOutline} onChange={e => setTopicOutline(e.target.value)} placeholder="Detailed CAPS outline description..." className="h-8 text-sm" />
                              </div>

                              <Button onClick={handleAddSyllabusTopic} size="sm" className="bg-[#dc2626] text-black hover:bg-[#b91c1c]">
                                Save Topic
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
