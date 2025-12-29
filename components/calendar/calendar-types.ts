import type { Id } from "@/convex/_generated/dataModel";

export type CalendarProps = {
  events: CalendarEvent[]
  setEvents: (events: CalendarEvent[]) => void
  mode: Mode
  setMode: (mode: Mode) => void
  date: Date
  setDate: (date: Date) => void
  calendarIconIsToday?: boolean
  // New props for Convex integration
  isLoading?: boolean
  teacherId?: Id<"users">
}

export type CalendarContextType = CalendarProps & {
  newEventDialogOpen: boolean
  setNewEventDialogOpen: (open: boolean) => void
  manageEventDialogOpen: boolean
  setManageEventDialogOpen: (open: boolean) => void
  selectedEvent: CalendarEvent | null
  setSelectedEvent: (event: CalendarEvent | null) => void
  // Convex integration
  refetchEvents?: () => void
}

// Calendar event type that maps to lesson_progress from Convex
export type CalendarEvent = {
  id: string
  // Convex IDs for mutations
  _id?: Id<"lesson_progress">
  lessonId?: Id<"curriculum_lessons">
  assignmentId?: Id<"teacher_assignments">
  curriculumId?: Id<"curriculums">
  // Display fields
  color: string
  date: Date // Single date for the event (no start/end times)
  // Course/Curriculum info
  course?: string
  curriculumName?: string
  curriculumCode?: string
  // Lesson info
  lesson?: string
  lessonTitle?: string
  lessonDescription?: string
  // Grade info
  grades?: string[]
  gradeCode?: string
  groupCode?: string
  gradeName?: string
  // Calendar-specific fields
  standards: string[]
  objectives?: string // Maps to lessonPlan
  additionalInfo?: string // Maps to notes
  // Status (from lesson_progress)
  status?: "not_started" | "in_progress" | "completed" | "skipped" | "rescheduled"
  // Evidence info (to show if lesson has been completed)
  hasEvidence?: boolean
  completedAt?: number
}

// Type for schedulable lessons from getSchedulableLessons query
export type SchedulableCurriculum = {
  assignmentId: Id<"teacher_assignments">
  curriculumId: Id<"curriculums">
  curriculumName: string
  curriculumCode?: string
  numberOfQuarters: number
  campusName?: string
  grades: {
    code: string
    name: string
    groups: string[]
  }[]
  lessons: {
    _id: Id<"curriculum_lessons">
    title: string
    description?: string
    quarter: number
    orderInQuarter: number
    gradeCodes: string[]
    scheduledGrades: (string | undefined)[]
    isFullyScheduled: boolean
  }[]
}

export const calendarModes = ['day', 'week', 'month'] as const
export type Mode = (typeof calendarModes)[number]
