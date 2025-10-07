"use client"

import { OverviewCard } from "@/components/ui/overview-card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Hash, Clock, Layers, ListChecks, Target } from "lucide-react"

interface LessonOverviewCardProps {
  lessonId: string
}

export function LessonOverviewCard({ lessonId }: LessonOverviewCardProps) {
  // Mock lesson
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
    objectives: [
      "Understand the canonical divisions",
      "Identify major biblical themes",
      "Gain awareness of historical context",
    ],
    resources: [
      { name: "Teacher Guide", url: "https://example.com/guide.pdf", type: "document", isRequired: true },
      { name: "Overview Video", url: "https://example.com/video", type: "video", isRequired: false },
    ],
  }

  const statusStyles = mockLesson.isActive
    ? "bg-emerald-500/10 text-emerald-700"
    : "bg-gray-500/15 text-gray-700"

  const mandatoryStyles = mockLesson.isMandatory
    ? "bg-orange-500/15 text-orange-700"
    : "bg-gray-500/15 text-gray-700"

  const rows = [
    {
      icon: <BookOpen className="h-4 w-4 text-primary" />,
      label: "Lesson title",
      value: mockLesson.title,
    },
    {
      icon: <Layers className="h-4 w-4 text-primary" />,
      label: "Quarter & Order",
      value: `Q${mockLesson.quarter} ( #${mockLesson.orderInQuarter} )`,
    },
    {
      icon: <Clock className="h-4 w-4 text-primary" />,
      label: "Expected Duration",
      value: mockLesson.expectedDurationMinutes
        ? `${mockLesson.expectedDurationMinutes} minutes`
        : "Not specified",
    },
    {
      icon: <Target className="h-4 w-4 text-primary" />,
      label: "Mandatory",
      value: (
        <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${mandatoryStyles}`}>
          {mockLesson.isMandatory ? "Required" : "Optional"}
        </Badge>
      ),
    },
    {
      icon: <Hash className="h-4 w-4 text-primary" />,
      label: "Status",
      value: (
        <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles}`}>
          {mockLesson.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      icon: <BookOpen className="h-4 w-4 text-primary" />,
      label: "Description",
      value: mockLesson.description || "No description provided",
    },
  ]

  return (
    <OverviewCard
      title="Lesson overview"
      description="General information about this lesson."
      imageStorageId={undefined}
      imageAlt={`${mockLesson.title} lesson`}
      fallbackIcon={<BookOpen className="h-8 w-8 text-muted-foreground" />}
      rows={rows}
      className="gap-2"
    />
  )
}
