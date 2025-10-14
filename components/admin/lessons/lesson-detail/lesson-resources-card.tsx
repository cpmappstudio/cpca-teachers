"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Link2 } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

interface LessonResourcesCardProps {
  lessonId: string
}

export function LessonResourcesCard({ lessonId }: LessonResourcesCardProps) {
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
        <CardContent className="space-y-4 px-4 md:px-6 pt-0 pb-4">
          <div className="h-16 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  const resources = lesson.resources || []

  return (
    <Card className="w-full h-full overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold tracking-tight">Resources</CardTitle>
        <CardDescription className="text-sm">Supporting materials linked to this lesson.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 md:px-6 pt-0 pb-4">
        {resources.length === 0 && (
          <p className="text-sm text-muted-foreground">No resources added.</p>
        )}
        <ul className="space-y-3">
          {resources.map((res, index) => (
            <li key={index} className="rounded-md border p-3 bg-muted/30 space-y-1">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="font-medium text-sm flex items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {res.name}
                  </span>
                  <span className="text-xs text-muted-foreground break-all">{res.url}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] rounded-full bg-primary/10 text-primary px-2 py-0.5">
                    {res.type}
                  </span>
                  {res.isRequired ? (
                    <Badge className="bg-amber-500/15 text-amber-700 px-2 py-0.5 text-[10px] rounded-full">Required</Badge>
                  ) : (
                    <Badge className="bg-gray-500/15 text-gray-600 px-2 py-0.5 text-[10px] rounded-full">Optional</Badge>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
