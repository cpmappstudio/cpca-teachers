import { Suspense } from "react"
import {
    TeacherHeader,
    TeacherOverviewCard,
    TeacherMetricsCard,
    TeacherCurriculumsCard
} from "@/components/admin/teachers/teacher-detail"
import { Skeleton } from "@/components/ui/skeleton"

interface TeacherPageProps {
    params: {
        teacherId: string
        locale: string
    }
}

export default function TeacherPage({ params }: TeacherPageProps) {
    const { teacherId } = params

    return (
        <div className="flex flex-col gap-6 px-2 md:px-4 pb-8">
            {/* Header */}
            <Suspense fallback={<Skeleton className="h-20 w-full" />}>
                <TeacherHeader teacherId={teacherId} />
            </Suspense>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-1 lg:items-stretch">
                {/* Teacher Overview */}
                <div className="lg:col-span-1 flex">
                    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                        <TeacherOverviewCard teacherId={teacherId} />
                    </Suspense>
                </div>

                {/* Teacher Metrics */}
                {/* <div className="lg:col-span-2 flex">
                    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                        <TeacherMetricsCard teacherId={teacherId} />
                    </Suspense>
                </div> */}
            </div>

            {/* Curriculums Section */}
            <div className="space-y-6">
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                    <TeacherCurriculumsCard teacherId={teacherId} />
                </Suspense>
            </div>
        </div>
    )
}