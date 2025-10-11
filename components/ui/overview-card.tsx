"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface InfoRowData {
    icon: ReactNode;
    label: string;
    value: ReactNode;
    extra?: ReactNode;
}

interface OverviewCardProps {
    title: string;
    description: string;
    imageStorageId?: Id<"_storage"> | undefined;
    imageUrl?: string | null;
    imageAlt: string;
    fallbackIcon: ReactNode;
    rows: InfoRowData[];
    className?: string;
}

export function OverviewCard({
    title,
    description,
    imageStorageId,
    imageUrl,
    imageAlt,
    fallbackIcon,
    rows,
    className = "gap-2"
}: OverviewCardProps) {
    // Get image URL from Convex storage if storageId is provided
    const convexImageUrl = useQuery(
        api.campuses.getImageUrl,
        imageStorageId ? { storageId: imageStorageId } : "skip"
    );

    // Prefer provided imageUrl, then convexImageUrl from storage
    const imageSrc = imageUrl || convexImageUrl || null;

    return (
        <Card className={`${className} overflow-hidden gap-0 w-full h-full`}>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                    <div className="w-20 h-20 flex-shrink-0">
                        <AspectRatio ratio={1} className="bg-muted rounded-lg">
                            {imageSrc ? (
                                <Image
                                    src={imageSrc}
                                    alt={imageAlt}
                                    fill
                                    className="h-full w-full rounded-lg object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted">
                                    {fallbackIcon}
                                </div>
                            )}
                        </AspectRatio>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
                {rows.map((row, index) => (
                    <div key={index}>
                        <InfoRow
                            icon={row.icon}
                            label={row.label}
                            value={row.value}
                            extra={row.extra}
                        />
                        {index < rows.length - 1 && <Separator className="my-3.5" />}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function InfoRow({ icon, label, value, extra }: { icon: ReactNode; label: string; value: ReactNode; extra?: ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1">
                <p className="font-medium text-foreground">{label}</p>
                <p>{value}</p>
                {extra}
            </div>
        </div>
    );
}