import { LessonsTable } from "@/app/[locale]/(dashboard)/admin/lessons/lessons-table"

export default function TeacherLessonsPage() {
    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">My Lessons</h2>
                    <p className="text-muted-foreground">
                        Manage your lesson plans and track your teaching progress
                    </p>
                </div>
            </div>
            <LessonsTable />
        </div>
    );
}
