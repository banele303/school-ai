import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, Printer, FileText, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function ReportCardGenerator() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportReady, setReportReady] = useState(false);

  // In a full implementation, we'd fetch actual students for the teacher/admin
  // For demo purposes, we fetch all students
  const students = useQuery(api.users.getUsers, isTeacher ? { role: "student" } : "skip");
  
  const handleGenerate = async () => {
    if (!selectedStudent) {
      toast.error("Please select a student first.");
      return;
    }
    
    setIsGenerating(true);
    try {
      // Simulate API call to gather grades, attendance, and run AI summary
      await new Promise(r => setTimeout(r, 2500));
      setReportReady(true);
      toast.success("Report Card generated successfully!");
    } catch (e) {
      toast.error("Failed to generate report card.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isTeacher) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <p className="text-muted-foreground text-lg font-medium">Access Denied: You do not have permission to view this page.</p>
      </div>
    );
  }

  if (students === undefined) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const studentName = students.find((s: any) => s._id === selectedStudent)?.name || "Student Name";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Report Card Generator
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate AI-summarized official report cards for students.
          </p>
        </div>
      </div>

      <Card className="print:hidden">
        <CardContent className="p-6 flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="text-sm font-medium mb-1 block">Select Student</label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Search or select a student..." />
              </SelectTrigger>
              <SelectContent>
                {students.map((s: any) => (
                  <SelectItem key={s._id} value={s._id}>{s.name} - Grade 10</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={isGenerating || !selectedStudent} className="w-full sm:w-auto">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate Report
          </Button>
        </CardContent>
      </Card>

      {reportReady && (
        <Card className="border-2 border-primary/20 shadow-xl print:shadow-none print:border-none print:m-0 print:p-0">
          <CardHeader className="border-b bg-muted/30 pb-6 print:bg-transparent">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-lg">
                  EN
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Vhembe Rising Star Academy Academy</h2>
                  <p className="text-muted-foreground">Official Academic Transcript • 2026</p>
                </div>
              </div>
              <div className="text-right print:hidden">
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                  <Printer className="h-4 w-4" /> Print / PDF
                </Button>
              </div>
            </div>
            
            <div className="mt-8 grid grid-cols-2 gap-4 bg-background p-4 rounded-xl border">
              <div>
                <p className="text-sm text-muted-foreground">Student Name</p>
                <p className="font-semibold text-lg">{studentName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Grade / Class</p>
                <p className="font-semibold text-lg">Grade 10A</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Student ID</p>
                <p className="font-semibold">{selectedStudent.slice(-6).toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Term</p>
                <p className="font-semibold">Term 3, Mid-Year</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-4 font-semibold">Subject</th>
                  <th className="p-4 font-semibold">Term Mark</th>
                  <th className="p-4 font-semibold">Class Avg</th>
                  <th className="p-4 font-semibold">Symbol</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  { sub: "Mathematics", mark: 85, avg: 65, sym: "A" },
                  { sub: "Physical Sciences", mark: 78, avg: 62, sym: "B" },
                  { sub: "English Home Language", mark: 92, avg: 70, sym: "A+" },
                  { sub: "Life Orientation", mark: 88, avg: 80, sym: "A" },
                  { sub: "History", mark: 72, avg: 68, sym: "B" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="p-4 font-medium">{row.sub}</td>
                    <td className="p-4">{row.mark}%</td>
                    <td className="p-4 text-muted-foreground">{row.avg}%</td>
                    <td className="p-4 font-bold text-primary">{row.sym}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="p-6 border-t bg-primary/5">
              <h3 className="font-semibold flex items-center gap-2 mb-3 text-primary">
                <Sparkles className="h-5 w-5" /> AI Performance Summary
              </h3>
              <p className="text-sm leading-relaxed text-foreground/90">
                {studentName} has demonstrated exceptional academic growth this term, particularly in English Home Language where they achieved a class-leading 92%. Their strong grasp of Mathematics (85%) and Physical Sciences (78%) shows excellent aptitude for STEM subjects. To maintain this trajectory, {studentName} should focus on active participation in History discussions to bring that grade into the A-tier. Overall, an outstanding academic performance.
              </p>
            </div>

            <div className="p-6 border-t flex justify-between items-end mt-8">
              <div className="text-center">
                <div className="w-48 border-b-2 border-foreground/20 mb-2 h-10"></div>
                <p className="text-sm font-medium">Principal Signature</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Generated on</p>
                <p className="font-semibold">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
