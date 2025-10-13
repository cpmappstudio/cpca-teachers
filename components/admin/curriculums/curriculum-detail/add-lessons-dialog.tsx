"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { Id } from "@/convex/_generated/dataModel"
import { LessonsDialog } from "@/components/admin/lessons/lessons-dialog"

interface AddLessonsDialogProps {
    curriculumId: Id<"curriculums">
}

export function AddLessonsDialog({ curriculumId }: AddLessonsDialogProps) {
    return (
        <LessonsDialog
            defaultCurriculumId={curriculumId}
            trigger={
                <Button className="bg-sidebar-accent h-9 dark:text-white gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden md:inline">Add Lesson</span>
                    <span className="md:hidden">Add</span>
                </Button>
            }
        />
    )
}

