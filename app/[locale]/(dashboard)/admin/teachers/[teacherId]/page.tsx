import { Suspense } from "react";
import {
  TeacherHeader,
  TeacherOverviewCard,
  TeacherCurriculumsCard,
  TeacherCalendarCard,
} from "@/components/admin/teachers/teacher-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, CalendarDays } from "lucide-react";

interface TeacherPageProps {
  params: Promise<{
    teacherId: string;
    locale: string;
  }>;
}

export default async function TeacherPage({ params }: TeacherPageProps) {
  const { teacherId } = await params;

  return (
    <div className="flex flex-col gap-6 pb-8">
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

      {/* Curriculums & Schedule Section */}
      <Tabs defaultValue="curriculums" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="curriculums" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Curriculums
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Schedule
          </TabsTrigger>
        </TabsList>
        <TabsContent value="curriculums" className="mt-0">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <TeacherCurriculumsCard teacherId={teacherId} />
          </Suspense>
        </TabsContent>
        <TabsContent value="schedule" className="mt-0">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <TeacherCalendarCard teacherId={teacherId} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
