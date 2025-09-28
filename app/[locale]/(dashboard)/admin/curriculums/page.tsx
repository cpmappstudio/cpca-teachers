import { CurriculumsTable } from "./curriculums-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Curriculum
                </Button>
            </div>

            <CurriculumsTable />
        </div>
    );
}
