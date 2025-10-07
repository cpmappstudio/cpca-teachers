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
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between px-2 md:px-4">
            <div className="space-y-1.5">
                <h1 className={`text-3xl font-semibold tracking-tight ${textColor}`}>
                    {campus.name}
                </h1>
                <p className={`${descriptionColor}`}>{addressLabel ?? "Campus details and academic overview"}</p>
            </div>
            <div className="flex items-center gap-3 pt-1 md:pt-0">
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
