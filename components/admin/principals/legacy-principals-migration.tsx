"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction, useQuery } from "convex/react";
import { Database, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";

function formatCampusList(campuses: Array<{ campusName: string }>) {
  return campuses.map((campus) => campus.campusName).join(", ");
}

export function LegacyPrincipalsMigration() {
  const router = useRouter();
  const preview = useQuery(api.admin.getLegacyPrincipalCandidates, {});
  const migrateLegacyPrincipals = useAction(api.admin.migrateLegacyPrincipals);
  const [isRunning, setIsRunning] = useState(false);

  if (!preview) {
    return null;
  }

  const hasIssues =
    preview.convertibleCandidates.length > 0 ||
    preview.skippedCandidates.length > 0 ||
    preview.orphanedCampuses.length > 0;

  if (!hasIssues) {
    return null;
  }

  const handleMigrate = async () => {
    if (
      !confirm(
        "This will convert legacy campus principals saved as admins into the new principal role. Superadmins will be skipped. Continue?",
      )
    ) {
      return;
    }

    setIsRunning(true);
    try {
      const result = await migrateLegacyPrincipals({});
      toast.success("Legacy principal migration completed", {
        description: result.message,
      });
      router.refresh();
    } catch (error) {
      toast.error("Legacy principal migration failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-700" />
            <h2 className="text-sm font-semibold">Legacy Principal Migration</h2>
          </div>

          <p className="text-sm text-amber-900/90">
            Some campus principals may still be stored with legacy roles. Review the
            candidates below before converting them to the new <code>principal</code>{" "}
            role.
          </p>

          {preview.convertibleCandidates.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Ready to migrate: {preview.convertibleCandidates.length}
              </p>
              <ul className="space-y-1 text-sm text-amber-900/90">
                {preview.convertibleCandidates.map((candidate) => (
                  <li key={candidate.userId}>
                    {candidate.fullName} ({candidate.email}){" "}
                    <span className="text-amber-800/80">
                      - {formatCampusList(candidate.campuses)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.skippedCandidates.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Skipped automatically: {preview.skippedCandidates.length}
              </p>
              <ul className="space-y-1 text-sm text-amber-900/90">
                {preview.skippedCandidates.map((candidate) => (
                  <li key={candidate.userId}>
                    {candidate.fullName} ({candidate.role}){" "}
                    <span className="text-amber-800/80">- {candidate.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.orphanedCampuses.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Campuses with broken principal references: {preview.orphanedCampuses.length}
              </p>
              <ul className="space-y-1 text-sm text-amber-900/90">
                {preview.orphanedCampuses.map((campus) => (
                  <li key={campus.campusId}>
                    {campus.campusName}{" "}
                    <span className="text-amber-800/80">
                      - missing user {campus.directorId}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {preview.convertibleCandidates.length > 0 && (
          <Button
            onClick={handleMigrate}
            disabled={isRunning}
            variant="outline"
            className="gap-2 border-amber-300 bg-white/70 text-amber-950 hover:bg-amber-100"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {isRunning
              ? "Migrating..."
              : `Migrate ${preview.convertibleCandidates.length} Legacy Principal(s)`}
          </Button>
        )}
      </div>
    </div>
  );
}
