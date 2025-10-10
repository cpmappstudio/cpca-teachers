import { Suspense } from "react"
import { LessonHeader } from "@/components/admin/lessons/lesson-detail/lesson-header"
import { LessonOverviewCard } from "@/components/admin/lessons/lesson-detail/lesson-overview-card"
import { LessonResourcesCard } from "@/components/admin/lessons/lesson-detail/lesson-resources-card"
import { LessonObjectivesCard } from "@/components/admin/lessons/lesson-detail/lesson-objectives-card"

interface LessonDetailPageProps {
    params: { lessonId: string; locale: string }
}

export default function LessonDetailPage({ params }: LessonDetailPageProps) {
    const { lessonId } = params

    return (
        <div className="flex flex-col gap-6 px-2 md:px-4 pb-8">
            <Suspense fallback={<div className="h-24" />}>
                <LessonHeader lessonId={lessonId} dialogType="teacher" />
            </Suspense>
            <div className="grid gap-6 md:grid-cols-2 w-full">
                <div className="w-full flex">
                    <LessonOverviewCard lessonId={lessonId} />
                </div>
                <div className="flex flex-col gap-6 w-full">
                    <LessonResourcesCard lessonId={lessonId} />
                    <LessonObjectivesCard lessonId={lessonId} />
                </div>
            </div>
        </div>
    )
}
