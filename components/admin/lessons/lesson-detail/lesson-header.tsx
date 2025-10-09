"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BookOpen } from "lucide-react"
import { useParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { LessonsDialog } from "../lessons-dialog"
import type { UserRole } from "@/convex/types"

interface LessonHeaderProps {
  lessonId: string
}

// Helper function to extract role from user object (client-safe)
function getUserRole(user: any): UserRole | null {
  if (!user) return null

  const publicMeta = user.publicMetadata
  const privateMeta = user.privateMetadata
  const unsafeMeta = user.unsafeMetadata

  const role = publicMeta?.role ?? privateMeta?.role ?? unsafeMeta?.role

  return (role as UserRole) ?? null
}

export function LessonHeader({ lessonId }: LessonHeaderProps) {
  const params = useParams()
  const locale = params.locale as string
  const { user } = useUser()

  const userRole = getUserRole(user)

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

  // Determine back URL based on user role
  const backUrl = userRole === 'teacher'
    ? `/${locale}/teaching`
    : `/${locale}/admin/lessons`

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
          <Link href={backUrl}>
            <ArrowLeft className="h-4 w-4" /> Back to lessons
          </Link>
        </Button>
        <LessonsDialog lesson={mockLesson} />
      </div>
    </div>
  )
}
