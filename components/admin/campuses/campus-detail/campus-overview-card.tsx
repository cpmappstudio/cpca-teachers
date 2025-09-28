import type { ReactNode } from "react";
import Image from "next/image";
import type { Doc } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Separator } from "@/components/ui/separator";
import { Building2, Mail, MapPin, Phone, Users, ImageIcon } from "lucide-react";

interface CampusOverviewCardProps {
    campus: Doc<"campuses">;
    addressLabel?: string | null;
}

export function CampusOverviewCard({ campus, addressLabel }: CampusOverviewCardProps) {
    const directorDisplay = campus.directorName ?? campus.directorEmail ?? "Not assigned";

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <CardTitle>Campus summary</CardTitle>
                        <CardDescription>Key information about this campus and contact details.</CardDescription>
                    </div>
                    <div className="w-20 h-20 flex-shrink-0">
                        <AspectRatio ratio={1} className="bg-muted rounded-lg">
                            {campus.campusImageStorageId ? (
                                <Image
                                    src={`/api/convex/storage/${campus.campusImageStorageId}`}
                                    alt={`${campus.name} campus image`}
                                    fill
                                    className="h-full w-full rounded-lg object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted">
                                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                </div>
                            )}
                        </AspectRatio>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
                <InfoRow icon={<Building2 className="h-4 w-4 text-primary" />} label="Campus code" value={campus.code ?? "-"} />
                <Separator />
                <InfoRow
                    icon={<Users className="h-4 w-4 text-primary" />} label="Director" value={directorDisplay}
                    extra={
                        campus.directorEmail ? (
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
                        ) : null
                    }
                />
                <Separator />
                <InfoRow
                    icon={<MapPin className="h-4 w-4 text-primary" />} label="Location"
                    value={addressLabel ?? "Address not provided"}
                />
            </CardContent>
        </Card>
    );
}

function InfoRow({ icon, label, value, extra }: { icon: ReactNode; label: string; value: ReactNode; extra?: ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5">{icon}</div>
            <div>
                <p className="font-medium text-foreground">{label}</p>
                <p>{value}</p>
                {extra}
            </div>
        </div>
    );
}
