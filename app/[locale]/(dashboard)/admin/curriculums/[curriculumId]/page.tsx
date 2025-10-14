import { Suspense } from "react"
import {
    CurriculumHeader,
    CurriculumOverviewCard,
} from "@/components/admin/curriculums/curriculum-detail"
import { Skeleton } from "@/components/ui/skeleton"

interface CurriculumPageProps {
    params: Promise<{
        curriculumId: string
        locale: string
    }>
}

export default async function CurriculumPage({ params }: CurriculumPageProps) {
    const { curriculumId } = await params

    return (
        <div className="flex flex-col gap-6 px-2 md:px-4 pb-8">
            {/* Header */}
            <Suspense fallback={<Skeleton className="h-20 w-full" />}>
                <CurriculumHeader curriculumId={curriculumId} />
            </Suspense>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-1 lg:items-stretch w-full">
                {/* Curriculum Overview */}
                <div className="lg:col-span-1 flex w-full">
                    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                        <CurriculumOverviewCard curriculumId={curriculumId} />
                    </Suspense>
                </div>
            </div>

            {/* Additional sections can be added here */}
            {/* For example: Lessons, Teachers assigned, etc. */}
        </div>
    )
}
