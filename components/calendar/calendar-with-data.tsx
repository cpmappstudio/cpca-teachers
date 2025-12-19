"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Calendar from "./calendar";
import { CalendarEvent, Mode } from "./calendar-types";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

/**
 * CalendarWithData - Calendar component connected to Convex
 * 
 * This component:
 * - Fetches scheduled lessons from lesson_progress table
 * - Only shows events with scheduledStart/scheduledEnd (calendar events)
 * - Does NOT interfere with evidence upload functionality
 * - Evidence records without scheduling won't appear here
 */
export default function CalendarWithData() {
  const { user, isLoading: isUserLoading } = useCurrentUser();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [mode, setMode] = useState<Mode>("month");
  const [date, setDate] = useState<Date>(new Date());

  // Fetch calendar events from Convex
  // Only returns lesson_progress records with scheduledStart/scheduledEnd
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
        color: event.displayColor || getStatusColor(event.status),
        start: new Date(event.scheduledStart!),
        end: new Date(event.scheduledEnd!),
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
  );
}

/**
 * Get color based on lesson status
 * This provides visual feedback for lesson completion state
 */
function getStatusColor(status: string | undefined): string {
  switch (status) {
    case "completed":
      return "green";
    case "in_progress":
      return "yellow";
    case "skipped":
      return "gray";
    case "rescheduled":
      return "orange";
    case "not_started":
    default:
      return "blue";
  }
}
