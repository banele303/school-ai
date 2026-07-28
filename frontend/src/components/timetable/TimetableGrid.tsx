import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Clock,
  User as UserIcon,
  Plus,
  Trash2,
  Edit2,
  Coffee,
  Utensils,
  Bell,
  BookOpen,
  Calendar as CalendarIcon,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Trophy,
} from "lucide-react";

interface Props {
  schedule: any[];
  overrides?: any[];
  isLoading: boolean;
  subjects: any[];
  teachers: any[];
  onSaveSchedule: (newSchedule: any[]) => Promise<void>;
  onSaveOverride?: (date: string, label: string, periods: any[]) => Promise<void>;
  onRemoveOverride?: (date: string) => Promise<void>;
  editable: boolean;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const TimetableGrid = ({
  schedule = [],
  overrides = [],
  isLoading,
  subjects = [],
  teachers = [],
  onSaveSchedule,
  onSaveOverride,
  onRemoveOverride,
  editable,
}: Props) => {
  // Navigation tabs: "weekly" | "date-override"
  const [activeTab, setActiveTab] = useState<"weekly" | "date-override">("weekly");

  // Date selection state for date override exceptions
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    // Format YYYY-MM-DD
    return today.toISOString().split("T")[0];
  });

  // Real-time state to re-trigger current period checker
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000); // refresh every 30s
    return () => clearInterval(timer);
  }, []);

  // Modal & Selection States
  const [editingCell, setEditingCell] = useState<{
    day?: string; // used for standard template editing
    date?: string; // used for date override editing
    time: string;
    period: any;
  } | null>(null);

  const [editType, setEditType] = useState<"subject" | "break" | "free">("subject");
  const [editSubjectId, setEditSubjectId] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editBreakLabel, setEditBreakLabel] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");

  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [newStartTime, setNewStartTime] = useState("08:00");
  const [newEndTime, setNewEndTime] = useState("08:45");
  const [newSlotType, setNewSlotType] = useState<"subject" | "break" | "free">("subject");
  const [newBreakLabel, setNewBreakLabel] = useState("Breakfast Break");

  // Days selected for adding/editing slots
  const [selectedAddDays, setSelectedAddDays] = useState<string[]>(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  const [selectedEditDays, setSelectedEditDays] = useState<string[]>([]);

  // Custom reason description for date-specific override
  const [overrideReason, setOverrideReason] = useState("Special Assembly / Exception");

  // Map selected Date to its English day-of-week
  const selectedDayName = useMemo(() => {
    if (!selectedDate) return "Monday";
    const parsed = new Date(selectedDate + "T00:00:00"); // avoid timezone shift
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[parsed.getDay()];
  }, [selectedDate]);

  // Is selected Date a weekend day?
  const isWeekend = useMemo(() => {
    if (!selectedDate) return false;
    const parsed = new Date(selectedDate + "T00:00:00");
    const day = parsed.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }, [selectedDate]);

  // Find date override matching selectedDate
  const activeOverride = useMemo(() => {
    return overrides.find((o) => o.date === selectedDate) || null;
  }, [overrides, selectedDate]);

  // Get active schedule periods for the selected date exception
  const dateExceptionPeriods = useMemo(() => {
    if (activeOverride) {
      return activeOverride.periods || [];
    }
    // Fallback: standard day schedule
    const standardDayData = schedule.find((d) => d.day === selectedDayName);
    return standardDayData?.periods || [];
  }, [activeOverride, schedule, selectedDayName]);

  // Helper to get past/live/upcoming status of a daily cell
  const getSlotStatus = (dayName: string, startTimeStr: string, endTimeStr: string) => {
    const todayIndex = currentTime.getDay();
    const daysMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const targetDayIndex = daysMap.indexOf(dayName);

    // If day is strictly before today's day of week
    if (targetDayIndex < todayIndex) {
      return "past";
    }
    // If day is strictly after today's day of week
    if (targetDayIndex > todayIndex) {
      return "upcoming";
    }

    // It is today! Check the exact hours
    try {
      const [startHour, startMin] = startTimeStr.split(":").map(Number);
      const [endHour, endMin] = endTimeStr.split(":").map(Number);

      const startMs = new Date(currentTime).setHours(startHour, startMin, 0, 0);
      const endMs = new Date(currentTime).setHours(endHour, endMin, 0, 0);
      const currentMs = currentTime.getTime();

      if (currentMs > endMs) {
        return "past";
      }
      if (currentMs >= startMs && currentMs <= endMs) {
        return "live";
      }
    } catch {
      // ignore parsing error
    }

    return "upcoming";
  };

  // Helper to get past/live/upcoming status for a specific date timeline card
  const getDateSlotStatus = (startTimeStr: string, endTimeStr: string) => {
    const todayStr = currentTime.toISOString().split("T")[0];

    // If date is before today (real calendar date)
    if (selectedDate < todayStr) {
      return "past";
    }
    // If date is after today
    if (selectedDate > todayStr) {
      return "upcoming";
    }

    // It is exactly today! Run the time check
    try {
      const [startHour, startMin] = startTimeStr.split(":").map(Number);
      const [endHour, endMin] = endTimeStr.split(":").map(Number);

      const startMs = new Date(currentTime).setHours(startHour, startMin, 0, 0);
      const endMs = new Date(currentTime).setHours(endHour, endMin, 0, 0);
      const currentMs = currentTime.getTime();

      if (currentMs > endMs) {
        return "past";
      }
      if (currentMs >= startMs && currentMs <= endMs) {
        return "live";
      }
    } catch {
      // ignore
    }

    return "upcoming";
  };

  // Sorted list of unique start times for standard weekly template
  const timeSlots = useMemo(() => {
    if (!schedule) return [];
    const times = new Set<string>();
    schedule.forEach((day) => {
      day.periods?.forEach((period: any) => {
        times.add(period.startTime);
      });
    });
    return Array.from(times).sort();
  }, [schedule]);

  // Map each start time slot to its smart label (e.g. Period 1, Period 2, or Break)
  const parsedSlots = useMemo(() => {
    let periodCounter = 1;
    return timeSlots.map((time) => {
      // Find all weekdays that have a break at this time
      const breakDays = schedule.filter((day) => {
        if (!DAYS.includes(day.day)) return false;
        const found = day.periods?.find((p: any) => p.startTime === time);
        return found && (found.isBreak || found.type === "break");
      });

      // The slot is a full-week break ONLY if every active weekday has a break at this time
      const isFullWeekBreak = breakDays.length > 0 && breakDays.length === schedule.filter(d => DAYS.includes(d.day)).length;

      let label = "Break";
      let foundPeriod: any = null;
      if (breakDays.length > 0) {
        const firstBreak = breakDays[0].periods?.find((p: any) => p.startTime === time);
        label = firstBreak?.label || firstBreak?.subject?.name || "Break";
        foundPeriod = firstBreak;
      }

      const slotLabel = isFullWeekBreak ? label : `Period ${periodCounter++}`;
      return {
        time,
        isBreak: isFullWeekBreak,
        slotLabel,
        period: foundPeriod,
      };
    });
  }, [timeSlots, schedule]);

  // Return standard label of a time row
  const getRowLabel = (startTime: string) => {
    for (const day of schedule) {
      const found = day.periods?.find((p: any) => p.startTime === startTime);
      if (found) {
        return `${found.startTime} - ${found.endTime}`;
      }
    }
    return startTime;
  };

  // Open the edit cell dialog
  const handleOpenEdit = (day: string | undefined, time: string, period: any, isDateOverride = false) => {
    if (!editable) return;

    if (isDateOverride) {
      setEditingCell({ date: selectedDate, time, period });
      setSelectedEditDays([]);
    } else {
      setEditingCell({ day, time, period });

      // Determine which days currently have a period starting at this time with this type/label/subject
      if (day) {
        const matchingDays = schedule
          .filter((d) => {
            const p = d.periods?.find((slot: any) => slot.startTime === time);
            if (!p) return false;
            
            const isClickedBreak = period?.isBreak || period?.type === "break";
            const isPBreak = p.isBreak || p.type === "break";
            if (isClickedBreak && isPBreak) {
              return p.label === period?.label;
            }
            if (!isClickedBreak && !isPBreak) {
              return p.subject?._id === period?.subject?._id;
            }
            return false;
          })
          .map((d) => d.day);
        setSelectedEditDays(matchingDays.length > 0 ? matchingDays : [day]);
      } else {
        setSelectedEditDays([]);
      }
    }

    const isBreak = period?.isBreak || period?.type === "break";
    const hasSubject = period?.subject && period?.subject?._id;

    if (isBreak) {
      setEditType("break");
      setEditBreakLabel(period.label || period.subject?.name || "Break");
    } else if (hasSubject) {
      setEditType("subject");
      setEditSubjectId(period.subject._id);
      setEditTeacherId(period.teacher?._id || "");
    } else {
      setEditType("free");
    }

    setEditStartTime(period?.startTime || time);
    setEditEndTime(period?.endTime || period?.endTime || "");
  };

  // Save cell edit
  const handleSaveCell = async () => {
    if (!editingCell) return;

    // Check if we are saving inside a date-specific override
    if (editingCell.date && onSaveOverride) {
      const periods = [...dateExceptionPeriods];
      const pIdx = periods.findIndex((p: any) => p.startTime === editingCell.time);

      const resolvedSubject = editType === "subject" 
        ? (subjects.find((s) => s._id === editSubjectId) || { _id: editSubjectId, name: "Selected Subject", code: "SUBJ" })
        : null;

      const resolvedTeacher = editType === "subject"
        ? (teachers.find((t) => t._id === editTeacherId) || { _id: editTeacherId, name: "Selected Teacher" })
        : null;

      let newPeriod: any = {
        startTime: editStartTime,
        endTime: editEndTime,
      };

      if (editType === "subject") {
        newPeriod.subject = resolvedSubject;
        newPeriod.teacher = resolvedTeacher;
      } else if (editType === "break") {
        newPeriod.type = "break";
        newPeriod.isBreak = true;
        newPeriod.label = editBreakLabel;
        newPeriod.subject = { name: editBreakLabel, code: "BREAK" };
        newPeriod.teacher = { name: "N/A" };
      }

      if (pIdx !== -1) {
        periods[pIdx] = newPeriod;
      } else {
        periods.push(newPeriod);
      }

      // Sort periods by start time for visual neatness
      periods.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

      await onSaveOverride(editingCell.date, overrideReason, periods);
      setEditingCell(null);
      return;
    }

    // Standard weekly template saving
    if (selectedEditDays.length === 0 && editType !== "free") {
      alert("Please select at least one day!");
      return;
    }

    const updatedSchedule = schedule.map((day) => {
      const periods = day.periods ? [...day.periods] : [];
      const pIdx = periods.findIndex((p: any) => p.startTime === editingCell.time);

      const resolvedSubject = editType === "subject" 
        ? (subjects.find((s) => s._id === editSubjectId) || { _id: editSubjectId, name: "Selected Subject", code: "SUBJ" })
        : null;

      const resolvedTeacher = editType === "subject"
        ? (teachers.find((t) => t._id === editTeacherId) || { _id: editTeacherId, name: "Selected Teacher" })
        : null;

      let newPeriod: any = {
        startTime: editStartTime,
        endTime: editEndTime,
      };

      if (editType === "subject") {
        newPeriod.subject = resolvedSubject;
        newPeriod.teacher = resolvedTeacher;
      } else if (editType === "break") {
        newPeriod.type = "break";
        newPeriod.isBreak = true;
        newPeriod.label = editBreakLabel;
        newPeriod.subject = { name: editBreakLabel, code: "BREAK" };
        newPeriod.teacher = { name: "N/A" };
      }

      // If this day is selected to have the edit applied
      if (selectedEditDays.includes(day.day) && editType !== "free") {
        if (pIdx !== -1) {
          periods[pIdx] = newPeriod;
        } else {
          periods.push(newPeriod);
        }
      } else {
        // If this day is NOT selected, but previously had a period at this time, or if we cleared it
        if (pIdx !== -1) {
          periods.splice(pIdx, 1);
        }
      }

      // Sort periods by start time
      periods.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

      return {
        ...day,
        periods,
      };
    });

    await onSaveSchedule(updatedSchedule);
    setEditingCell(null);
  };

  // Add a new row time slot (Weekly view or Date view)
  const handleAddSlot = async () => {
    if (activeTab === "date-override" && onSaveOverride) {
      const periods = [...dateExceptionPeriods];

      let newPeriod: any = {
        startTime: newStartTime,
        endTime: newEndTime,
      };

      if (newSlotType === "break") {
        newPeriod.type = "break";
        newPeriod.isBreak = true;
        newPeriod.label = newBreakLabel;
        newPeriod.subject = { name: newBreakLabel, code: "BREAK" };
        newPeriod.teacher = { name: "N/A" };
      }

      periods.push(newPeriod);
      periods.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

      await onSaveOverride(selectedDate, overrideReason, periods);
      setIsAddingSlot(false);
      return;
    }

    // Weekly Template
    if (selectedAddDays.length === 0) {
      alert("Please select at least one day!");
      return;
    }

    const updatedSchedule = schedule.map((day) => {
      const periods = day.periods ? [...day.periods] : [];

      // Only add to selected days
      if (!selectedAddDays.includes(day.day)) {
        return day;
      }

      let newPeriod: any = {
        startTime: newStartTime,
        endTime: newEndTime,
      };

      if (newSlotType === "break") {
        newPeriod.type = "break";
        newPeriod.isBreak = true;
        newPeriod.label = newBreakLabel;
        newPeriod.subject = { name: newBreakLabel, code: "BREAK" };
        newPeriod.teacher = { name: "N/A" };
      }

      const existingIdx = periods.findIndex((p: any) => p.startTime === newStartTime);
      if (existingIdx !== -1) {
        periods[existingIdx] = newPeriod;
      } else {
        periods.push(newPeriod);
      }

      periods.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

      return {
        ...day,
        periods,
      };
    });

    await onSaveSchedule(updatedSchedule);
    setIsAddingSlot(false);
  };

  // Delete an entire row time slot (Weekly view or Date view)
  const handleDeleteRow = async (startTime: string) => {
    if (!confirm(`Are you sure you want to delete the time slot starting at ${startTime}?`)) return;

    if (activeTab === "date-override" && onSaveOverride) {
      const periods = dateExceptionPeriods.filter((p: any) => p.startTime !== startTime);
      await onSaveOverride(selectedDate, overrideReason, periods);
      return;
    }

    // Weekly Template
    const updatedSchedule = schedule.map((day) => {
      const periods = (day.periods || []).filter((p: any) => p.startTime !== startTime);
      return {
        ...day,
        periods,
      };
    });

    await onSaveSchedule(updatedSchedule);
  };

  // Initialize a date-specific override exception
  const handleInitializeOverride = async () => {
    if (!onSaveOverride) return;
    // Copy current standard schedule periods for this day of week
    const standardDayData = schedule.find((d) => d.day === selectedDayName);
    const periodsToCopy = standardDayData ? (standardDayData.periods || []) : [];

    // Map rich objects back to clean database references
    const cleanPeriods = periodsToCopy.map((period: any) => {
      if (period.isBreak || period.type === "break") {
        return {
          type: "break",
          isBreak: true,
          label: period.label || period.subject?.name || "Break",
          startTime: period.startTime,
          endTime: period.endTime,
        };
      }
      return {
        subject: period.subject?._id || period.subject,
        teacher: period.teacher?._id || period.teacher,
        startTime: period.startTime,
        endTime: period.endTime,
      };
    });

    await onSaveOverride(selectedDate, overrideReason, cleanPeriods);
  };

  // Revert back to standard schedule
  const handleResetOverride = async () => {
    if (!onRemoveOverride || !activeOverride) return;
    if (!confirm(`Are you sure you want to delete this custom schedule override and revert to the standard ${selectedDayName} schedule?`)) return;
    await onRemoveOverride(selectedDate);
  };

  // Render appropriate Break Icon
  const getBreakIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes("lunch") || l.includes("food") || l.includes("eat")) {
      return <Utensils className="h-4 w-4 shrink-0" />;
    }
    if (l.includes("break") || l.includes("tea") || l.includes("coffee") || l.includes("breakfast")) {
      return <Coffee className="h-4 w-4 shrink-0" />;
    }
    if (l.includes("sport") || l.includes("gym") || l.includes("physical") || l.includes("activity") || l.includes("play")) {
      return <Trophy className="h-4 w-4 shrink-0 text-emerald-650 dark:text-emerald-400" />;
    }
    return <Bell className="h-4 w-4 shrink-0" />;
  };

  if (isLoading) {
    return (
      <div className="h-125 w-full flex items-center justify-center border rounded-lg bg-card shadow-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm font-medium">Loading schedule...</p>
        </div>
      </div>
    );
  }

  if (!schedule || schedule.length === 0) {
    return (
      <div className="h-100 w-full flex flex-col items-center justify-center border rounded-lg border-dashed bg-card p-6 shadow-sm">
        <CalendarIcon className="h-12 w-12 text-muted-foreground/60 mb-3 animate-pulse" />
        <h3 className="font-semibold text-lg">No Timetable Generated</h3>
        <p className="text-muted-foreground text-sm max-w-sm text-center mb-4">
          Please select a class and academic year, then generate with the AI assistant above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* TABS SELECTOR & ADD TRIGGER */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-4">
        <div className="flex p-1 bg-muted rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("weekly")}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${
              activeTab === "weekly"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📅 Weekly Template
          </button>
          <button
            onClick={() => setActiveTab("date-override")}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${
              activeTab === "date-override"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ✏️ Date Exceptions
          </button>
        </div>

        {editable && (
          <Button size="sm" onClick={() => setIsAddingSlot(true)} className="w-full sm:w-auto shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> Add Time/Break Row
          </Button>
        )}
      </div>

      {/* TAB 1: WEEKLY TEMPLATE GRID */}
      {activeTab === "weekly" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-foreground">Standard Weekly Schedule</h3>
              <p className="text-xs text-muted-foreground">Standard recurring week timetable with live time status indications.</p>
            </div>
            {/* Soft indicator of current day */}
            <div className="hidden md:flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full text-xs font-semibold">
              <Clock className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: "12s" }} />
              <span>Today: {DAYS[currentTime.getDay() - 1] || "Weekend"}</span>
            </div>
          </div>

          <ScrollArea className="w-full whitespace-nowrap rounded-lg border shadow-sm bg-card">
            <div className="flex w-max min-w-full flex-col">
              {/* Header Row */}
              <div className="flex border-b bg-muted/65 sticky top-0 z-10">
                <div className="w-40 shrink-0 border-r p-4 font-bold text-muted-foreground flex items-center justify-center text-xs uppercase tracking-wider">
                  Time Slot
                </div>
                {DAYS.map((day) => {
                  const todayIndex = currentTime.getDay();
                  const daysMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                  const isCurrentDay = daysMap[todayIndex] === day;

                  return (
                    <div
                      key={day}
                      className={`flex-1 min-w-56 border-r p-4 font-bold text-xs uppercase tracking-wider text-center last:border-r-0 ${
                        isCurrentDay
                          ? "bg-primary/10 text-primary border-b-2 border-b-primary"
                          : "text-foreground"
                      }`}
                    >
                      {day} {isCurrentDay && "⭐"}
                    </div>
                  );
                })}
              </div>

              {/* Rows */}
              {parsedSlots.map(({ time, isBreak, slotLabel, period }) => (
                <div className="flex border-b last:border-b-0 min-h-28" key={time}>
                  {/* Time / Label Column */}
                  <div className="w-40 shrink-0 border-r p-3 text-xs font-bold text-muted-foreground flex flex-col items-center justify-center text-center bg-muted/30 relative group">
                    <span className="text-primary/95 font-bold mb-0.5">{slotLabel}</span>
                    <span className="text-[11px] font-semibold text-muted-foreground/80">
                      {getRowLabel(time)}
                    </span>
                    {editable && (
                      <button
                        onClick={() => handleDeleteRow(time)}
                        className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Time Slot Row"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Day Columns */}
                  {isBreak ? (
                    /* Unified, premium horizontal full-week Break card */
                    <div className="flex-1 p-2 flex border-r-0">
                      <div
                        onClick={() => handleOpenEdit("Monday", time, period)}
                        className={`h-full w-full rounded-md border p-4 flex flex-col justify-center items-center gap-1.5 transition-all shadow-sm ${
                          editable ? "cursor-pointer hover:shadow-md border-amber-200 hover:border-amber-300 dark:border-amber-950" : "border-muted"
                        } ${
                          (period.label || "").toLowerCase().includes("lunch")
                            ? "bg-gradient-to-r from-red-500/10 via-red-600/15 to-red-500/10 dark:from-red-950/25 dark:via-red-950/35 dark:to-red-950/25 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900/50"
                            : (period.label || "").toLowerCase().includes("breakfast") || (period.label || "").toLowerCase().includes("recess") || (period.label || "").toLowerCase().includes("break")
                            ? "bg-gradient-to-r from-amber-500/10 via-amber-600/15 to-amber-500/10 dark:from-amber-950/25 dark:via-amber-950/35 dark:to-amber-950/25 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50"
                            : (period.label || "").toLowerCase().includes("sport") || (period.label || "").toLowerCase().includes("gym") || (period.label || "").toLowerCase().includes("activit") || (period.label || "").toLowerCase().includes("play")
                            ? "bg-gradient-to-r from-emerald-500/10 via-emerald-600/15 to-emerald-500/10 dark:from-emerald-950/25 dark:via-emerald-950/35 dark:to-emerald-950/25 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50"
                            : "bg-gradient-to-r from-violet-500/10 via-violet-600/15 to-violet-500/10 dark:from-violet-950/25 dark:via-violet-950/35 dark:to-violet-950/25 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-900/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-center">
                          {getBreakIcon(period.label || period.subject?.name || "")}
                          <span>{period.label || period.subject?.name || "School Break"}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground/80 font-semibold tracking-wide">
                          Daily Break — Covers all classes {getRowLabel(time)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Render five separate day cells */
                    DAYS.map((day) => {
                      const dayData = schedule.find((d) => d.day === day);
                      const cellPeriod = dayData?.periods?.find((p: any) => p.startTime === time);
                      const hasSubject = cellPeriod && cellPeriod.subject && cellPeriod.subject.name;

                      // Live State
                      const status = getSlotStatus(day, time, cellPeriod?.endTime || "");

                      return (
                        <div
                          key={`${day}-${time}`}
                          className={`flex-1 min-w-56 border-r p-2 last:border-r-0 transition-colors ${
                            status === "past"
                              ? "bg-muted/15"
                              : status === "live"
                              ? "bg-primary/5 dark:bg-primary/10"
                              : ""
                          }`}
                        >
                          {cellPeriod && (cellPeriod.isBreak || cellPeriod.type === "break") ? (
                            /* Day-Specific Break Card */
                            <div
                              onClick={() => handleOpenEdit(day, time, cellPeriod)}
                              className={`h-full w-full rounded-md border p-3 shadow-sm transition-all flex flex-col justify-center items-center gap-1 border-t-4 group relative ${
                                (cellPeriod.label || "").toLowerCase().includes("lunch")
                                  ? "bg-gradient-to-r from-red-500/10 to-red-500/5 dark:from-red-950/20 dark:to-red-950/10 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900"
                                  : (cellPeriod.label || "").toLowerCase().includes("breakfast") || (cellPeriod.label || "").toLowerCase().includes("recess") || (cellPeriod.label || "").toLowerCase().includes("break")
                                  ? "bg-gradient-to-r from-amber-500/10 to-amber-500/5 dark:from-amber-950/20 dark:to-amber-950/10 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900"
                                  : (cellPeriod.label || "").toLowerCase().includes("sport") || (cellPeriod.label || "").toLowerCase().includes("gym") || (cellPeriod.label || "").toLowerCase().includes("activit") || (cellPeriod.label || "").toLowerCase().includes("play")
                                  ? "bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 dark:from-emerald-950/20 dark:to-emerald-950/10 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900"
                                  : "bg-gradient-to-r from-violet-500/10 to-violet-500/5 dark:from-violet-950/20 dark:to-violet-950/10 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-900"
                              } ${editable ? "cursor-pointer hover:shadow-md" : ""}`}
                            >
                              {editable && (
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Edit2 className="h-3 w-3 text-muted-foreground hover:text-primary" />
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-center">
                                {getBreakIcon(cellPeriod.label || "")}
                                <span>{cellPeriod.label || "Break"}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground/80 font-semibold tracking-wide">
                                {cellPeriod.startTime} - {cellPeriod.endTime}
                              </span>
                            </div>
                          ) : hasSubject ? (
                            /* Period Card */
                            <div
                              onClick={() => handleOpenEdit(day, time, cellPeriod)}
                              className={`h-full w-full rounded-md border p-3 shadow-sm transition-all flex flex-col justify-between gap-2 border-l-4 group relative ${
                                status === "past"
                                  ? "bg-muted/30 border-muted opacity-50 hover:opacity-75"
                                  : status === "live"
                                  ? "bg-card border-l-primary border-primary ring-2 ring-primary/20 shadow-md transform hover:scale-[1.01]"
                                  : "bg-card border-l-primary hover:shadow-md"
                              } ${editable ? "cursor-pointer" : ""}`}
                            >
                              {editable && (
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Edit2 className="h-3 w-3 text-muted-foreground hover:text-primary" />
                                </div>
                              )}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <Badge
                                    variant="secondary"
                                    className={`font-bold text-[9px] px-1.5 py-0 ${
                                      status === "past"
                                        ? "bg-muted text-muted-foreground"
                                        : "bg-primary/10 text-primary"
                                    }`}
                                  >
                                    {cellPeriod.subject.code || "SUBJ"}
                                  </Badge>

                                  {status === "past" && (
                                    <span className="flex items-center text-[10px] font-bold text-muted-foreground/75 gap-0.5">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground/70" />
                                      Done
                                    </span>
                                  )}

                                  {status === "live" && (
                                    <span className="flex items-center text-[9px] font-bold text-red-500 gap-1 bg-red-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                      Live Now
                                    </span>
                                  )}
                                </div>
                                <h4
                                  className={`font-semibold text-sm leading-tight line-clamp-2 ${
                                    status === "past"
                                      ? "text-muted-foreground/80 line-through decoration-muted-foreground/45"
                                      : "text-foreground"
                                  }`}
                                >
                                  {cellPeriod.subject.name}
                                </h4>
                              </div>

                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-auto pt-2 border-t border-dashed">
                                <UserIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                                <span className="truncate max-w-40 font-medium" title={cellPeriod.teacher?.name}>
                                  {cellPeriod.teacher?.name || "TBA"}
                                </span>
                              </div>
                            </div>
                          ) : (
                            /* Free Period */
                            <div
                              onClick={() => handleOpenEdit(day, time, cellPeriod)}
                              className={`h-full w-full rounded-md border border-dashed flex flex-col items-center justify-center transition-all ${
                                status === "past"
                                  ? "bg-muted/10 border-muted/30 opacity-45"
                                  : "bg-muted/10 border-muted hover:bg-muted/20 hover:border-primary/50"
                              } ${editable ? "cursor-pointer" : ""}`}
                            >
                              <BookOpen className="h-4 w-4 text-muted-foreground/30 mb-1" />
                              <span className="text-xs text-muted-foreground/50 font-bold">
                                Free Period
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* TAB 2: DATE EXCEPTIONS / OVERRIDES */}
      {activeTab === "date-override" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Selector and Override Controls */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-md">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Select Exception Date
              </CardTitle>
              <CardDescription>
                Choose a specific calendar date to view, cancel, or modify classes for that day.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Calendar Date</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <div className="pt-2 border-t text-xs space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Day of Week:</span>
                  <span className="text-foreground">{selectedDayName}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Override State:</span>
                  {activeOverride ? (
                    <span className="text-amber-500 font-bold uppercase tracking-wide">⚠️ Active Override</span>
                  ) : (
                    <span className="text-emerald-500 font-bold uppercase tracking-wide">✅ Standard Schedule</span>
                  )}
                </div>
              </div>

              {editable && (
                <div className="pt-4 border-t space-y-3">
                  {!activeOverride ? (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Reason/Label for exception (Optional)</Label>
                        <Input
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          placeholder="e.g. Sports Day, Assemblies..."
                        />
                      </div>
                      <Button
                        className="w-full shadow-sm"
                        onClick={handleInitializeOverride}
                        disabled={isWeekend}
                      >
                        <Sparkles className="h-4 w-4 mr-2" /> Make Custom Exception
                      </Button>
                      {isWeekend && (
                        <p className="text-[10px] text-red-500 font-bold text-center">
                          Cannot create exceptions on weekends (Sat/Sun).
                        </p>
                      )}
                    </>
                  ) : (
                    <Button
                      variant="destructive"
                      className="w-full shadow-sm"
                      onClick={handleResetOverride}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" /> Revert to Standard Template
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline View for the Chosen Date */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-foreground">
                  Schedule Timeline for {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {activeOverride
                    ? `⚠️ DATE-SPECIFIC EXCEPTION IS ACTIVE: "${activeOverride.label || "Custom Schedule"}"`
                    : `📅 Showing standard template for ${selectedDayName}`}
                </p>
              </div>
            </div>

            {isWeekend ? (
              <div className="h-60 border border-dashed rounded-lg flex flex-col items-center justify-center bg-card p-6">
                <CalendarIcon className="h-10 w-10 text-muted-foreground/40 mb-2" />
                <h4 className="font-bold text-muted-foreground text-sm">School is Closed</h4>
                <p className="text-xs text-muted-foreground/80 max-w-xs text-center">
                  This date falls on a weekend ({selectedDayName}). No recurring academic lectures are scheduled.
                </p>
              </div>
            ) : dateExceptionPeriods.length === 0 ? (
              <div className="h-60 border border-dashed rounded-lg flex flex-col items-center justify-center bg-card p-6">
                <Clock className="h-10 w-10 text-muted-foreground/45 mb-2" />
                <h4 className="font-bold text-muted-foreground text-sm">No periods scheduled</h4>
                <p className="text-xs text-muted-foreground/80 max-w-xs text-center">
                  There are no periods in the daily template. Click "+ Add Time/Break Row" above to insert.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dateExceptionPeriods.map((period: any, idx: number) => {
                  const isBreak = period.isBreak || period.type === "break";
                  const hasSubject = period.subject && period.subject.name;

                  // Live Status Relative to current time
                  const status = getDateSlotStatus(period.startTime, period.endTime);

                  return (
                    <div
                      key={`${period.startTime}-${idx}`}
                      onClick={() => handleOpenEdit(undefined, period.startTime, period, true)}
                      className={`group flex items-center border rounded-lg p-4 bg-card shadow-sm transition-all relative ${
                        editable ? "cursor-pointer hover:border-primary/40 hover:shadow-md" : ""
                      } ${
                        status === "past"
                          ? "opacity-55 bg-muted/20"
                          : status === "live"
                          ? "ring-2 ring-primary/30 border-primary bg-primary/5 animate-pulse-subtle"
                          : ""
                      }`}
                    >
                      {/* Time Marker Column */}
                      <div className="w-32 shrink-0 border-r pr-4 flex flex-col justify-center">
                        <span className="text-primary font-bold text-xs">
                          {isBreak ? "BREAK TIME" : `PERIOD ${idx + 1}`}
                        </span>
                        <span className="text-foreground font-bold text-sm">
                          {period.startTime} - {period.endTime}
                        </span>
                      </div>

                      {/* Content Column */}
                      <div className="flex-1 pl-4 flex items-center justify-between">
                        {isBreak ? (
                          <div className="flex items-center gap-2">
                            <span className={`p-1.5 rounded ${
                              (period.label || "").toLowerCase().includes("lunch")
                                ? "bg-red-500/10 text-red-500"
                                : (period.label || "").toLowerCase().includes("breakfast") || (period.label || "").toLowerCase().includes("recess") || (period.label || "").toLowerCase().includes("break")
                                ? "bg-amber-500/10 text-amber-500"
                                : "bg-violet-500/10 text-violet-500"
                            }`}>
                              {getBreakIcon(period.label || period.subject?.name || "")}
                            </span>
                            <div>
                              <h4 className={`font-bold text-sm uppercase tracking-wide ${
                                (period.label || "").toLowerCase().includes("lunch")
                                  ? "text-red-700 dark:text-red-300"
                                  : (period.label || "").toLowerCase().includes("breakfast") || (period.label || "").toLowerCase().includes("recess") || (period.label || "").toLowerCase().includes("break")
                                  ? "text-amber-700 dark:text-amber-300"
                                  : "text-violet-700 dark:text-violet-300"
                              }`}>
                                {period.label || period.subject?.name || "School Break"}
                              </h4>
                              <p className="text-[10px] text-muted-foreground/80 font-medium">Daily recess interval</p>
                            </div>
                          </div>
                        ) : hasSubject ? (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="font-bold text-[9px] px-1.5 py-0 bg-primary/10 text-primary hover:bg-primary/20">
                                {period.subject.code || "SUBJ"}
                              </Badge>
                              {status === "past" && (
                                <span className="flex items-center text-[10px] font-bold text-muted-foreground/75 gap-0.5">
                                  <CheckCircle2 className="h-3 w-3" /> Done
                                </span>
                              )}
                              {status === "live" && (
                                <span className="flex items-center text-[9px] font-bold text-red-500 gap-0.5 bg-red-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                  Live Now
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-sm text-foreground">{period.subject.name}</h4>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <UserIcon className="h-3 w-3" /> {period.teacher?.name || "Unassigned"}
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground/30" />
                            <span className="text-xs text-muted-foreground/60 font-bold">Free Period</span>
                          </div>
                        )}

                        {editable && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                            <Edit2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </div>
                        )}
                      </div>

                      {/* Timeline status indicator color dot */}
                      <span
                        className={`absolute right-4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${
                          status === "past"
                            ? "bg-muted-foreground/30"
                            : status === "live"
                            ? "bg-red-500 animate-ping"
                            : "bg-primary/30"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT CELL DIALOG */}
      <Dialog open={editingCell !== null} onOpenChange={() => setEditingCell(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingCell?.date ? "Edit Special Date Period" : "Edit Template Period"}
            </DialogTitle>
            <DialogDescription>
              {editingCell?.date
                ? `Modify the slot for date ${editingCell.date} at ${editingCell.time}.`
                : `Modify this recurring weekly template slot for ${editingCell?.day} at ${editingCell?.time}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            {/* Slot Designation Type */}
            <div className="space-y-1">
              <Label>Slot Type</Label>
              <Select value={editType} onValueChange={(val: any) => setEditType(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subject">Subject Lesson</SelectItem>
                  <SelectItem value="break">School Break (Breakfast/Lunch/Assembly)</SelectItem>
                  <SelectItem value="free">Free Period / Blank</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Settings */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Subject Select */}
            {editType === "subject" && (
              <>
                <div className="space-y-1">
                  <Label>Subject</Label>
                  <Select value={editSubjectId} onValueChange={setEditSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((sub) => (
                        <SelectItem key={sub._id} value={sub._id}>
                          {sub.name} ({sub.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Teacher</Label>
                  <Select value={editTeacherId} onValueChange={setEditTeacherId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t._id} value={t._id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Applicable Days Selector (only for standard weekly template edits) */}
            {editingCell?.day && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Applicable Days</Label>
                <div className="flex flex-wrap gap-2">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => {
                    const isSelected = selectedEditDays.includes(day);
                    return (
                      <Button
                        key={day}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className={`h-8 font-semibold transition-all ${
                          isSelected 
                            ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]" 
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedEditDays(selectedEditDays.filter((d) => d !== day));
                          } else {
                            setSelectedEditDays([...selectedEditDays, day]);
                          }
                        }}
                      >
                        {day.slice(0, 3)}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Break Custom Label */}
            {editType === "break" && (
              <div className="space-y-1">
                <Label>Break Description</Label>
                <Select value={editBreakLabel} onValueChange={setEditBreakLabel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Breakfast Break">Breakfast Break</SelectItem>
                    <SelectItem value="Lunch Break">Lunch Break</SelectItem>
                    <SelectItem value="Short Break">Short Break</SelectItem>
                    <SelectItem value="Assembly">Assembly</SelectItem>
                    <SelectItem value="Registration">Registration</SelectItem>
                    <SelectItem value="Sports Day">Sports / Outdoor Activities</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCell(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCell}>
              Save Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD TIME SLOT DIALOG */}
      <Dialog open={isAddingSlot} onOpenChange={setIsAddingSlot}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {activeTab === "date-override" ? "Add Exception Time Slot" : "Add Template Row"}
            </DialogTitle>
            <DialogDescription>
              {activeTab === "date-override"
                ? `Create a daily period or break for date ${selectedDate} specifically.`
                : "Create a recurring weekly period or daily school break row."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Slot Type</Label>
              <Select value={newSlotType} onValueChange={(val: any) => setNewSlotType(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subject">Subject Period / Free Lesson</SelectItem>
                  <SelectItem value="break">Daily Break (Breakfast/Lunch/Assembly)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Applicable Days Selector (only for standard weekly template adds) */}
            {activeTab === "weekly" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Applicable Days</Label>
                <div className="flex flex-wrap gap-2">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => {
                    const isSelected = selectedAddDays.includes(day);
                    return (
                      <Button
                        key={day}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className={`h-8 font-semibold transition-all ${
                          isSelected 
                            ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]" 
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedAddDays(selectedAddDays.filter((d) => d !== day));
                          } else {
                            setSelectedAddDays([...selectedAddDays, day]);
                          }
                        }}
                      >
                        {day.slice(0, 3)}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {newSlotType === "break" && (
              <div className="space-y-1">
                <Label>Break Designation</Label>
                <Select value={newBreakLabel} onValueChange={setNewBreakLabel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Breakfast Break">Breakfast Break</SelectItem>
                    <SelectItem value="Lunch Break">Lunch Break</SelectItem>
                    <SelectItem value="Assembly">Morning Assembly</SelectItem>
                    <SelectItem value="Registration">Registration</SelectItem>
                    <SelectItem value="Sports Day">Sports / Outdoor Activities</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingSlot(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSlot}>
              Add Slot Row
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimetableGrid;
