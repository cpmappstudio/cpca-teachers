import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export function CampusesEmptyState() {
    return (
        <Card className="border-dashed bg-muted/30">
            <CardHeader className="items-center text-center">
                <CardTitle className="text-lg">No campuses yet</CardTitle>
                <CardDescription>
                    Create a campus to start assigning teachers and tracking progress.
                </CardDescription>
            </CardHeader>
        </Card>
    );
}