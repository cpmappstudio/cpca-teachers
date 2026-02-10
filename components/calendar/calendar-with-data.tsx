"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Calendar from "./calendar";
import { CalendarEvent, Mode } from "./calendar-types";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { format, getWeekOfMonth, startOfWeek } from "date-fns";
import {
  generateWeeklyCalendarPdfWithOptions,
  downloadPdf,
} from "@/lib/pdf/generate-weekly-calendar-pdf";

/**
 * CalendarWithData - Calendar component connected to Convex
 * 
 * This component:
 * - Fetches scheduled lessons from lesson_progress table
 * - Only shows events with scheduledDate (calendar events)
 * - Does NOT interfere with evidence upload functionality
 * - Evidence records without scheduling won't appear here
 */
export default function CalendarWithData() {
  const { user, isLoading: isUserLoading } = useCurrentUser();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [mode, setMode] = useState<Mode>("month");
  const [date, setDate] = useState<Date>(new Date());
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Handle PDF download for weekly calendar
  const handleDownloadPdf = useCallback(async () => {
    if (events.length === 0 || !user) return;

    setIsGeneratingPdf(true);
    try {
      // Get teacher name and campus from available data
      const teacherName = `${user.firstName} ${user.lastName}`;
      
      // Get campus name from the first event that has it
      const firstEventWithCampus = events.find(e => e.campusName);
      const campusName = firstEventWithCampus?.campusName;

      const pdfBytes = await generateWeeklyCalendarPdfWithOptions({
        events,
        currentDate: date,
        teacherName,
        campusName,
      });
      
      // Generate filename: weekly-schedule-feb-2nd-week-laura.pdf
      const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday as first day
      const monthAbbr = format(weekStart, "MMM").toLowerCase(); // "feb"
      const weekNum = getWeekOfMonth(weekStart, { weekStartsOn: 1 }); // 1, 2, 3, 4, 5
      const weekSuffix = weekNum === 1 ? "st" : weekNum === 2 ? "nd" : weekNum === 3 ? "rd" : "th";
      const teacherFirstName = user.firstName?.toLowerCase().replace(/\s+/g, "-") || "teacher";
      
      const filename = `weekly-schedule-${monthAbbr}-${weekNum}${weekSuffix}-week-${teacherFirstName}.pdf`;
      downloadPdf(pdfBytes, filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [events, date, user]);

  // Fetch calendar events from Convex
  // Only returns lesson_progress records with scheduledDate
  const calendarEvents = useQuery(
    api.lessons.getTeacherCalendarEvents,
    user?._id ? { teacherId: user._id as Id<"users"> } : "skip"
  );

  // Transform Convex data to CalendarEvent format
  useEffect(() => {
    if (calendarEvents) {
      const transformedEvents: CalendarEvent[] = calendarEvents.map((event) => ({
        id: event._id,
        _id: event._id,
        lessonId: event.lessonId,
        assignmentId: event.assignmentId,
        curriculumId: event.curriculumId,
        // Display
        color: getStatusColor(event.status),
        date: new Date(event.scheduledDate!),
        // Course info - use name for display, keep curriculumId for reference
        course: event.curriculumName || "Unknown Course",
        curriculumName: event.curriculumName,
        curriculumCode: event.curriculumCode,
        // Lesson info - use title for display, keep lessonId for reference
        lesson: event.lessonTitle || "Unknown Lesson",
        lessonTitle: event.lessonTitle,
        lessonDescription: event.lessonDescription,
        // Grade info
        grades: event.gradeCode ? [event.gradeCode] : [],
        gradeCode: event.gradeCode,
        groupCode: event.groupCode,
        gradeName: event.gradeName,
        // Campus info (from enriched data)
        campusName: event.campusName,
        // Calendar fields
        standards: event.standards || [],
        objectives: event.lessonPlan,
        additionalInfo: event.notes,
        // Status
        status: event.status,
        hasEvidence: !!(event.evidenceDocumentStorageId || event.evidencePhotoStorageId),
        completedAt: event.completedAt,
      }));

      setEvents(transformedEvents);
    }
  }, [calendarEvents]);

  // Handle events update (for optimistic updates from dialogs)
  const handleSetEvents = useCallback((newEvents: CalendarEvent[]) => {
    setEvents(newEvents);
  }, []);

  // Loading state
  if (isUserLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading calendar...</span>
        </CardContent>
      </Card>
    );
  }

  // No user state
  if (!user) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">
            Please sign in to view your calendar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold tracking-tight">
            My Schedule
          </CardTitle>
          <CardDescription className="text-sm">
            View and manage your scheduled lessons.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf || events.length === 0}
          className="shrink-0"
        >
          {isGeneratingPdf ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export PDF
        </Button>
      </CardHeader>
      <CardContent className="p-0 sm:pl-6 sm:pr-6">
        <Calendar
          events={events}
          setEvents={handleSetEvents}
          mode={mode}
          setMode={setMode}
          date={date}
          setDate={setDate}
          isLoading={calendarEvents === undefined}
          teacherId={user._id}
        />
      </CardContent>
    </Card>
  );
}

/**
 * Get color based on lesson status
 * This provides visual feedback for lesson completion state
 * - completed: emerald (green)
 * - not completed: amber (yellow)
 */
function getStatusColor(status: string | undefined): string {
  return status === "completed" ? "emerald" : "amber";
}
