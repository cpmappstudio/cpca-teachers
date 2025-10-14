"use client"

import { OverviewCard } from "@/components/ui/overview-card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Hash, Clock, Layers, Target } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

interface LessonOverviewCardProps {
  lessonId: string
}

export function LessonOverviewCard({ lessonId }: LessonOverviewCardProps) {
  // Get lesson data from Convex
  const lesson = useQuery(
    api.lessons.getLesson,
    { lessonId: lessonId as Id<"curriculum_lessons"> }
  )

  // Show loading state while fetching data
  if (!lesson) {
    return (
      <div className="w-full h-full bg-muted animate-pulse rounded-lg" style={{ minHeight: "400px" }} />
    )
  }

  const statusStyles = lesson.isActive
    ? "bg-emerald-500/10 text-emerald-700"
    : "bg-gray-500/15 text-gray-700"

  const mandatoryStyles = lesson.isMandatory
    ? "bg-orange-500/15 text-orange-700"
    : "bg-gray-500/15 text-gray-700"

  const rows = [
    {
      icon: <BookOpen className="h-4 w-4 text-primary" />,
      label: "Lesson title",
      value: lesson.title,
    },
    {
      icon: <Layers className="h-4 w-4 text-primary" />,
      label: "Quarter & Order",
      value: `Q${lesson.quarter} ( #${lesson.orderInQuarter} )`,
    },
    {
      icon: <Clock className="h-4 w-4 text-primary" />,
      label: "Expected Duration",
      value: lesson.expectedDurationMinutes
        ? `${lesson.expectedDurationMinutes} minutes`
        : "Not specified",
    },
    {
      icon: <Target className="h-4 w-4 text-primary" />,
      label: "Mandatory",
      value: (
        <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${mandatoryStyles}`}>
          {lesson.isMandatory ? "Required" : "Optional"}
        </Badge>
      ),
    },
    {
      icon: <Hash className="h-4 w-4 text-primary" />,
      label: "Status",
      value: (
        <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles}`}>
          {lesson.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      icon: <BookOpen className="h-4 w-4 text-primary" />,
      label: "Description",
      value: lesson.description || "No description provided",
    },
  ]

  return (
    <OverviewCard
      title="Lesson overview"
      description="General information about this lesson."
      imageStorageId={undefined}
      imageAlt={`${lesson.title} lesson`}
      fallbackIcon={<BookOpen className="h-8 w-8 text-muted-foreground" />}
      rows={rows}
      className="gap-2"
    />
  )
}
