import type { Doc } from "@/convex/_generated/dataModel";
import { OverviewCard } from "@/components/ui/overview-card";
import { Building2, Mail, MapPin, Phone, Users, ImageIcon } from "lucide-react";

interface CampusOverviewCardProps {
    campus: Doc<"campuses">;
    addressLabel?: string | null;
}

export function CampusOverviewCard({ campus, addressLabel }: CampusOverviewCardProps) {
    const directorDisplay = campus.directorName ?? campus.directorEmail ?? "Not assigned";

    const rows = [
        {
            icon: <Building2 className="h-4 w-4 text-primary" />,
            label: "Campus code",
            value: campus.code ?? "-"
        },
        {
            icon: <Users className="h-4 w-4 text-primary" />,
            label: "Director",
            value: directorDisplay,
            extra: campus.directorEmail ? (
                <div className="mt-1 space-y-1">
                    <span className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" />
                        {campus.directorEmail}
                    </span>
                    {campus.directorPhone ? (
                        <span className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5" />
                            {campus.directorPhone}
                        </span>
                    ) : null}
                </div>
            ) : undefined
        },
        {
            icon: <MapPin className="h-4 w-4 text-primary" />,
            label: "Location",
            value: addressLabel ?? "Address not provided"
        }
    ];

    return (
        <OverviewCard
            title="Campus summary"
            description="Key information about this campus and contact details."
            imageStorageId={campus.campusImageStorageId}
            imageAlt={`${campus.name} campus image`}
            fallbackIcon={<ImageIcon className="h-8 w-8 text-muted-foreground" />}
            rows={rows}
            className="gap-2"
        />
    );
}
