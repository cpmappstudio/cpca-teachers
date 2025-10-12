import { CurriculumsTable } from "@/app/[locale]/(dashboard)/admin/curriculums/curriculums-table";

export default function TeacherCurriculumsPage() {
    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">My Curriculums</h2>
                    <p className="text-muted-foreground">
                        View your assigned curriculums and learning objectives
                    </p>
                </div>
            </div>

            <CurriculumsTable />
        </div>
    );
}
