"use client";

import { ManagedUserDialog } from "@/components/admin/users/managed-user-dialog";
import type { Doc } from "@/convex/_generated/dataModel";
import type { ReactNode } from "react";

interface PrincipalDialogProps {
  principal?: Doc<"users">;
  trigger?: ReactNode;
}

export function PrincipalDialog({ principal, trigger }: PrincipalDialogProps) {
  return (
    <ManagedUserDialog user={principal} role="principal" trigger={trigger} />
  );
}
