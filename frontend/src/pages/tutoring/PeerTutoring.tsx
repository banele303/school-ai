import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/AuthProvider";
import { GraduationCap, Search, Clock, CheckCircle, Users, BookOpen, Star, Plus, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PeerTutoringPage() {
  const { user } = useAuth();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("browse");

  const subjects = useQuery(api.subjects.getSubjects);
  const openRequests = useQuery(api.tutoring.getOpenRequests, {});
  const myRequests = useQuery(api.tutoring.getMyRequests, user?.role === "student" ? {} : "skip");

  const createRequest = useMutation(api.tutoring.createRequest);
  const acceptRequest = useMutation(api.tutoring.acceptRequest);

  const handleCreateRequest = async (data: any) => {
    try {
      await createRequest(data);
      toast.success("Tutoring request posted!");
      setShowRequestDialog(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAccept = async (requestId: any) => {
    try {
      await acceptRequest({ requestId });
      toast.success("You're now the tutor for this request!");
    } catch (e: any) { toast.error(e.message); }
  };

  const displayRequests = activeTab === "my-requests" ? myRequests : openRequests;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            Peer Tutoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Get help from top students or become a tutor yourself
          </p>
        </div>
        {user?.role === "student" && (
          <Button onClick={() => setShowRequestDialog(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Request Tutor
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="browse" className="gap-2"><Search className="h-4 w-4" /> Browse Requests</TabsTrigger>
          {user?.role === "student" && <TabsTrigger value="my-requests" className="gap-2"><Clock className="h-4 w-4" /> My Requests</TabsTrigger>}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayRequests?.map((req: any) => {
              const subject = subjects?.find((s: any) => s._id === req.subject);
              return (
                <Card key={req._id} className={cn(
                  "hover:shadow-lg transition-all",
                  req.status === "matched" && "border-green-200 dark:border-green-900"
                )}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn(
                        req.status === "open" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                        req.status === "matched" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                        "bg-gray-100 text-gray-600"
                      )}>
                        {req.status === "open" ? <><Clock className="h-3 w-3 mr-1" /> Open</> :
                         req.status === "matched" ? <><CheckCircle className="h-3 w-3 mr-1" /> Matched</> :
                         "Closed"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">Grade {req.grade}</Badge>
                    </div>
                    <CardTitle className="text-sm">{req.topic}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2">{req.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {subject && <Badge variant="secondary" className="text-xs">{subject.name}</Badge>}
                    <p className="text-[10px] text-muted-foreground">
                      Posted {formatDistanceToNow(new Date(req._creationTime), { addSuffix: true })}
                    </p>
                    {req.status === "open" && user?.role === "student" && (
                      <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => handleAccept(req._id)}>
                        <GraduationCap className="h-3 w-3 mr-1" /> Offer to Tutor
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {(!displayRequests || displayRequests.length === 0) && (
              <div className="col-span-full text-center py-16">
                <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">No tutoring requests</h3>
                <p className="text-sm text-muted-foreground mt-1">Be the first to request or offer help!</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Request Tutor Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Request a Tutor</DialogTitle></DialogHeader>
          <RequestTutorForm subjects={subjects} onSubmit={handleCreateRequest} userGrade={user?.grade} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestTutorForm({ subjects, onSubmit, userGrade }: any) {
  const [subjectId, setSubjectId] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [grade, setGrade] = useState(userGrade ? String(userGrade) : "");

  return (
    <div className="space-y-3">
      <div><Label>Subject *</Label>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
          <SelectContent>{subjects?.map((s: any) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Topic *</Label>
        <Textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Quadratic equations, Photosynthesis..." rows={2} />
      </div>
      <div><Label>Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What do you need help with?" rows={3} />
      </div>
      <div><Label>Grade</Label>
        <Select value={grade} onValueChange={setGrade}>
          <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
          <SelectContent>{[1,2,3,4,5,6,7,8,9,10,11,12].map(g => <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => {
        if (!subjectId || !topic) { toast.error("Subject and topic required"); return; }
        onSubmit({ subjectId, topic, description, grade: Number(grade) });
      }}>Post Request</Button>
    </div>
  );
}
