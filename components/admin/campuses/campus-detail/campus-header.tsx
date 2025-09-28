import Link from "next/link";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CampusDialog } from "../campus-dialog";

interface CampusHeaderProps {
    campus: Doc<"campuses">;
    locale: string;
    hasHero?: boolean;
    addressLabel?: string | null;
}

export function CampusHeader({ campus, locale, hasHero = false, addressLabel }: CampusHeaderProps) {
    const textColor = hasHero ? "text-white" : "text-foreground";
    const descriptionColor = hasHero ? "text-sm text-white/90" : "text-sm text-muted-foreground";

    return (
        <div className="mx-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
                <h1 className={`text-3xl font-semibold tracking-tight ${textColor}`}>
                    {campus.name}
                </h1>
                <p className={`${descriptionColor} font-semibold`}>
                    {addressLabel ?? "Campus details and academic overview"}
                </p>
            </div>
            <div className="flex items-center gap-3">
                <Button variant="outline" className="gap-2" asChild>
                    <Link href={`/${locale}/admin/campuses`}>
                        <ArrowLeft className="h-4 w-4" />
                        Back to campuses
                    </Link>
                </Button>
                <CampusDialog campus={campus} />
            </div>
        </div>
    );
}
