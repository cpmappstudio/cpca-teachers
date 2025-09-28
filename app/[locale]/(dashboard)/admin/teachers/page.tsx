import { TeachersTable } from "./teachers-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function TeachersPage() {
    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Teachers Management</h2>
                    <p className="text-muted-foreground">
                        Manage all teachers across all campuses
                    </p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Teacher
                </Button>
            </div>

            <TeachersTable />
        </div>
    );
}
