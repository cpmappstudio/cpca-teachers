import { TeachersTable } from "./teachers-table";

export default function TeachersPage() {
    return (
        <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
            <div className="flex flex-col space-y-2">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Teachers Management</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                    Manage all teachers across all campuses
                </p>
            </div>
            <TeachersTable />
        </div>
    );
}
