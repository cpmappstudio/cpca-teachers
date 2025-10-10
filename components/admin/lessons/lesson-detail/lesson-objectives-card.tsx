"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ListChecks } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

interface LessonObjectivesCardProps {
  lessonId: string
}

export function LessonObjectivesCard({ lessonId }: LessonObjectivesCardProps) {
  // Get lesson data from Convex
  const lesson = useQuery(
    api.lessons.getLesson,
    { lessonId: lessonId as Id<"curriculum_lessons"> }
  )

  // Show loading state while fetching data
  if (!lesson) {
    return (
      <Card className="w-full h-full overflow-hidden">
        <CardHeader className="pb-4">
          <div className="h-5 w-32 bg-muted animate-pulse rounded" />
          <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="px-4 md:px-6 pt-0 pb-4">
          <div className="h-16 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  const objectives = lesson.objectives || []

  return (
    <Card className="w-full h-full overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ListChecks className="h-4 w-4" /> Objectives
        </CardTitle>
        <CardDescription className="text-sm">Learning goals for this lesson.</CardDescription>
      </CardHeader>
      <CardContent className="px-4 md:px-6 pt-0 pb-4">
        {objectives.length === 0 ? (
          <p className="text-sm text-muted-foreground">No objectives provided.</p>
        ) : (
          <ol className="space-y-2 list-decimal list-inside text-sm text-muted-foreground">
            {objectives.map((obj, i) => (
              <li key={i} className="leading-5 break-words">
                {obj}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
