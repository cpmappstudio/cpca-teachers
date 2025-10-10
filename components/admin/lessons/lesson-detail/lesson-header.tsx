"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BookOpen, Upload } from "lucide-react"
import { useParams } from "next/navigation"
import { LessonsDialog } from "../lessons-dialog"
import { TeacherDialog } from "@/components/teaching/upload-lesson-dialog"

type DialogType = "admin" | "teacher"

interface LessonHeaderProps {
  lessonId: string
  dialogType?: DialogType
}

export function LessonHeader({ lessonId, dialogType = "admin" }: LessonHeaderProps) {
  const params = useParams()
  const locale = params.locale as string

  // Mock lesson data
  const mockLesson = {
    id: lessonId,
    curriculumId: "curr-001",
    title: "Introduction to Biblical Studies",
    description:
      "Foundational overview of the structure, themes, and historical context of the Bible.",
    quarter: 1,
    orderInQuarter: 1,
    expectedDurationMinutes: 45,
    isActive: true,
    isMandatory: true,
  }

  const subtitle = `Q${mockLesson.quarter} • #${mockLesson.orderInQuarter} • ${mockLesson.expectedDurationMinutes} min`

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between px-2 md:px-0">
      <div className="space-y-1.5">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-muted-foreground" />
          {mockLesson.title}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3 pt-1">
        <Button variant="outline" className="gap-2" asChild>
          <Link href={`/${locale}/admin/lessons`}>
            <ArrowLeft className="h-4 w-4" /> Back to lessons
          </Link>
        </Button>
        {dialogType === "admin" && <LessonsDialog lesson={mockLesson} />}
        {dialogType === "teacher" && (
          <TeacherDialog
            lesson={{
              id: mockLesson.id,
              title: mockLesson.title,
            }}
            trigger={
              <Button variant="default" className="gap-2 bg-deep-koamaru dark:text-white">
                <Upload className="h-4 w-4" />
                Upload Proof
              </Button>
            }
          />
        )}
      </div>
    </div>
  )
}
