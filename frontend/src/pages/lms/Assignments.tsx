import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Calendar, BookOpen, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router";
import { toast } from "sonner";
import { FileUpload } from "@/components/global/FileUpload";
import type { UploadResult } from "@/lib/cloudflareWorker";

export default function AssignmentsPage() {
  const assignments = useQuery(api.lms.getAssignments, {});
  const subjects = useQuery(api.subjects.getSubjects);
  const classes = useQuery(api.classes.getClasses, {});
  const createAssignment = useMutation(api.lms.createAssignment);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [uploadFilename, setUploadFilename] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !description.trim() || !subjectId || !classId || !dueDate) {
      toast.error("Please fill in all fields.");
      return;
    }
    setSaving(true);
    try {
      await createAssignment({
        title: title.trim(),
        description: description.trim(),
        subjectId: subjectId as any,
        classId: classId as any,
        dueDate,
        fileUrl: fileUrl || undefined,
      });
      toast.success("Assignment created successfully!");
      setOpen(false);
      setTitle("");
      setDescription("");
      setSubjectId("");
      setClassId("");
      setDueDate("");
      setFileUrl("");
      setUploadFilename("");
    } catch (e: any) {
      toast.error(e.message || "Failed to create assignment.");
    } finally {
      setSaving(false);
    }
  };

  if (assignments === undefined) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground">Manage and track student homework.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Chapter 5 Exercise"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Description</Label>
                <Textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Assignment instructions..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Subject</Label>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.map((s: any) => (
                        <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Class</Label>
                  <Select value={classId} onValueChange={setClassId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes?.map((c: any) => (
                        <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium mb-1.5 block">Worksheet / Attachment (Optional)</Label>
                {!fileUrl ? (
                  <FileUpload
                    onUploadComplete={(result) => {
                      setFileUrl(result.url);
                      setUploadFilename(result.filename || "assignment-worksheet");
                    }}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,image/*"
                  />
                ) : (
                  <div className="p-3 border rounded-lg bg-muted/50 flex items-center justify-between">
                    <span className="text-xs truncate font-medium">{uploadFilename || "File uploaded"}</span>
                    <Button variant="ghost" size="sm" onClick={() => { setFileUrl(""); setUploadFilename(""); }}>
                      Remove
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={saving} className="bg-[#dc2626] text-black hover:bg-[#b91c1c]">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Assignment"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignments.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
            <BookOpen className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">No assignments found. Start by creating one!</p>
          </div>
        ) : (
          assignments.map((assignment: any) => (
            <Card key={assignment._id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <Badge variant="secondary" className="mb-2">
                    {assignment.subject?.name || "Subject"}
                  </Badge>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="mr-1 h-3 w-3" />
                    Due {assignment.dueDate}
                  </div>
                </div>
                <CardTitle className="text-xl">{assignment.title}</CardTitle>
                <CardDescription className="line-clamp-2">{assignment.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignment.fileUrl && (
                  <a
                    href={assignment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1.5 bg-primary/5 p-2 rounded-lg border border-primary/10"
                  >
                    <FileText className="h-3.5 w-3.5" /> Download Worksheet / Attachment
                  </a>
                )}
                <Link to={`/lms/assignments/${assignment._id}`}>
                  <Button variant="outline" className="w-full">View Submissions</Button>
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
