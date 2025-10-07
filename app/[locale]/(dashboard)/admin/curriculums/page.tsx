import { CurriculumsTable } from "./curriculums-table";

export default function CurriculumsPage() {
    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Curriculum Management</h2>
                    <p className="text-muted-foreground">
                        Manage educational programs, courses, and learning objectives
                    </p>
                </div>
            </div>
            <CurriculumsTable />
        </div>
    );
}
