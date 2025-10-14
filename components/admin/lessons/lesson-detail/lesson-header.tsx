"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useParams } from "next/navigation";
import { LessonsDialog } from "../lessons-dialog";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type DialogType = "admin" | "teacher";

interface LessonHeaderProps {
  lessonId: string;
  dialogType?: DialogType;
}

export function LessonHeader({ lessonId = "admin" }: LessonHeaderProps) {
  const params = useParams();
  const locale = params.locale as string;

  // Get lesson data from Convex
  const lesson = useQuery(api.lessons.getLesson, {
    lessonId: lessonId as Id<"curriculum_lessons">,
  });

  // Show loading state while fetching data
  if (!lesson) {
    return (
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between px-2 md:px-0">
        <div className="space-y-1.5">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  const subtitle = `Q${lesson.quarter} • #${lesson.orderInQuarter}${lesson.expectedDurationMinutes ? ` • ${lesson.expectedDurationMinutes} min` : ""}`;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between px-2 md:px-0">
      <div className="space-y-1.5">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-muted-foreground" />
          {lesson.title}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {subtitle}
        </p>
      </div>
      <div className="flex items-center gap-3 pt-1">
        <Button variant="outline" className="gap-2" asChild>
          <Link href={`/${locale}/admin/lessons`}>
            <ArrowLeft className="h-4 w-4" /> Back to lessons
          </Link>
        </Button>
        {/* {dialogType === "admin" && <LessonsDialog lesson={lesson} />}
        {dialogType === "teacher" && (
          <TeacherDialog
            lesson={{
              id: lesson._id,
              title: lesson.title,
            }}
            trigger={
              <Button
                variant="default"
                className="gap-2 bg-deep-koamaru dark:text-white"
              >
                <Upload className="h-4 w-4" />
                Upload Proof
              </Button>
            }
          />
        )} */}
        <LessonsDialog lesson={lesson} />
      </div>
    </div>
  );
}
