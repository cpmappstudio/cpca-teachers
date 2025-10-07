"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ListChecks } from "lucide-react"

interface LessonObjectivesCardProps {
  lessonId: string
}

export function LessonObjectivesCard({ lessonId }: LessonObjectivesCardProps) {
  const mockObjectives = [
    "Understand the canonical divisions",
    "Identify major biblical themes",
    "Gain awareness of historical context",
    "Introduce textual interpretation concepts"
  ]

  return (
    <Card className="w-full h-full overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ListChecks className="h-4 w-4" /> Objectives
        </CardTitle>
        <CardDescription className="text-sm">Learning goals for this lesson.</CardDescription>
      </CardHeader>
      <CardContent className="px-4 md:px-6 pt-0 pb-4">
        {mockObjectives.length === 0 ? (
          <p className="text-sm text-muted-foreground">No objectives provided.</p>
        ) : (
          <ol className="space-y-2 list-decimal list-inside text-sm text-muted-foreground">
            {mockObjectives.map((obj, i) => (
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
