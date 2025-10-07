import { LessonsTable } from "./lessons-table"

export default function LessonsPage() {
    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Lessons Management</h2>
                    <p className="text-muted-foreground">
                        Manage lesson plans, curriculum content, and educational materials
                    </p>
                </div>
            </div>
            <LessonsTable />
        </div>
    );
}
