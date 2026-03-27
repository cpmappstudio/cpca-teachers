import { LegacyPrincipalsMigration } from "@/components/admin/principals/legacy-principals-migration";
import { PrincipalsTable } from "./principals-table";

export default function PrincipalsPage() {
  return (
    <div className="flex-1 space-y-4">
      <LegacyPrincipalsMigration />
      <PrincipalsTable />
    </div>
  );
}
