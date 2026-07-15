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

  const subjects = useQuery(capsApi.capsActions?.getCapsSubjects, { grade: selectedGrade });
  const pastPapers = useQuery(capsApi.capsActions?.getPastPapers, { grade: selectedGrade });
  const studyResources = useQuery(capsApi.capsActions?.getStudyResources, { grade: selectedGrade });

  const addPastPaper = useMutation(capsApi.capsActions?.addPastPaper);
  const deletePastPaper = useMutation(capsApi.capsActions?.deletePastPaper);
  const addStudyResource = useMutation(capsApi.capsActions?.addStudyResource);
  const deleteStudyResource = useMutation(capsApi.capsActions?.deleteStudyResource);

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
                      {subjects?.map((s: any) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Grade</Label>
                  <Input type="number" value={ppGrade} onChange={e => setPpGrade(e.target.value)} min={1} max={12} />
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
                      setPpFileUrl(result.url);
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
                      {subjects?.map((s: any) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
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
                  <Input type="number" value={srGrade} onChange={e => setSrGrade(e.target.value)} min={1} max={12} />
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
                      setSrFileUrl(result.url);
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
          <Card>
            <CardHeader><CardTitle className="text-base">Syllabus Overview — Grade {selectedGrade} ({langName(selectedLanguage)})</CardTitle></CardHeader>
            <CardContent>
              {subjects === undefined ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                <div className="space-y-4">
                  {subjects.map((s: any) => (
                    <div key={s._id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{s.name}</h4>
                        <div className="flex gap-2">
                          <Badge variant={s.isCompulsory ? "default" : "outline"} className="text-xs">
                            {s.isCompulsory ? "Compulsory" : "Elective"}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">{s.phase}</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{s.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
