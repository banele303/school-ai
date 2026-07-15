import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Loader2, Trash2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, getDay, addMonths, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/AuthProvider";

const EVENT_COLORS: Record<string, string> = {
  exam: "bg-red-500",
  sports: "bg-green-500",
  holiday: "bg-amber-500",
  meeting: "bg-blue-500",
  other: "bg-purple-500",
};

export default function EventsCalendar() {
  const { user } = useAuth();
  const isStaff = user?.role === "admin" || user?.role === "teacher";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", date: format(new Date(), "yyyy-MM-dd"),
    endDate: "", type: "other" as any,
  });

  const monthStr = format(currentDate, "yyyy-MM");
  const events = useQuery(api.events.getEvents, { month: monthStr });
  const createEvent = useMutation(api.events.createEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);

  const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  const startPad = getDay(startOfMonth(currentDate)); // 0=Sun offset

  const handleSubmit = async () => {
    if (!form.title || !form.date) return toast.error("Title and date are required.");
    setIsSubmitting(true);
    try {
      await createEvent(form);
      toast.success("Event created!");
      setOpen(false);
      setForm({ title: "", description: "", date: format(new Date(), "yyyy-MM-dd"), endDate: "", type: "other" });
    } catch (e: any) { toast.error(e.message); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events Calendar</h1>
          <p className="text-muted-foreground">School schedule, exams, and important dates.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Event</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New School Event</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date (optional)</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["exam", "sports", "holiday", "meeting", "other"].map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-[80px]" />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(EVENT_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-sm capitalize text-muted-foreground">
            <span className={cn("w-2.5 h-2.5 rounded-full", color)} /> {type}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-lg">{format(currentDate, "MMMM yyyy")}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map((day) => {
              const dayEvents = events?.filter((e) => e.date === format(day, "yyyy-MM-dd")) || [];
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[80px] rounded-lg border p-1.5 text-sm",
                    isToday(day) && "border-primary bg-primary/5",
                  )}
                >
                  <span className={cn("text-xs font-medium", isToday(day) && "text-primary font-bold")}>
                    {format(day, "d")}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.map((ev) => (
                      <div
                        key={ev._id}
                        className={cn("text-[10px] text-white rounded px-1 py-0.5 truncate flex items-center justify-between gap-1 group", EVENT_COLORS[ev.type])}
                      >
                        <span className="truncate">{ev.title}</span>
                        {isStaff && (
                          <button
                            className="opacity-50 hover:opacity-100 hover:text-red-300 transition-opacity"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this event?")) {
                                deleteEvent({ id: ev._id }).catch((e) => toast.error(e.message));
                              }
                            }}
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
