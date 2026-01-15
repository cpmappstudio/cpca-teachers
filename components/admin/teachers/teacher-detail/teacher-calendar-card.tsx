"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Calendar from "@/components/calendar/calendar";
import { CalendarEvent, Mode } from "@/components/calendar/calendar-types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CalendarDays } from "lucide-react";

interface TeacherCalendarCardProps {
  teacherId: string;
}

/**
 * TeacherCalendarCard - Calendar component for admin view of a specific teacher
 *
 * This component:
 * - Fetches scheduled lessons from lesson_progress table for a specific teacher
 * - Only shows events with scheduledDate (calendar events)
 * - Used in the admin teacher detail view to see teacher's schedule
 */
export function TeacherCalendarCard({ teacherId }: TeacherCalendarCardProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [mode, setMode] = useState<Mode>("month");
  const [date, setDate] = useState<Date>(new Date());

  // Fetch calendar events from Convex for the specific teacher
  const calendarEvents = useQuery(api.lessons.getTeacherCalendarEvents, {
    teacherId: teacherId as Id<"users">,
  });

  // Transform Convex data to CalendarEvent format
  useEffect(() => {
    if (calendarEvents) {
      const transformedEvents: CalendarEvent[] = calendarEvents.map(
        (event) => ({
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
          // Calendar fields
          standards: event.standards || [],
          objectives: event.lessonPlan,
          additionalInfo: event.notes,
          // Status
          status: event.status,
          hasEvidence: !!(
            event.evidenceDocumentStorageId || event.evidencePhotoStorageId
          ),
          completedAt: event.completedAt,
        }),
      );

      setEvents(transformedEvents);
    }
  }, [calendarEvents]);

  // Handle events update (for optimistic updates from dialogs)
  const handleSetEvents = useCallback((newEvents: CalendarEvent[]) => {
    setEvents(newEvents);
  }, []);

  // Loading state
  if (calendarEvents === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Teacher Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">
            Loading calendar...
          </span>
        </CardContent>
      </Card>
    );
  }

  // No events state
  if (calendarEvents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Teacher Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">
            This teacher has no scheduled events yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold tracking-tight">
          Teacher Schedule
        </CardTitle>
        <CardDescription className="text-sm">
          View and manage the scheduled lessons for this teacher.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        <Calendar
          events={events}
          setEvents={handleSetEvents}
          mode={mode}
          setMode={setMode}
          date={date}
          setDate={setDate}
          isLoading={false}
          teacherId={teacherId as Id<"users">}
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
