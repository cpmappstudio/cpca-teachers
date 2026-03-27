"use client";

import { ManagedUserDialog } from "@/components/admin/users/managed-user-dialog";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { ReactNode } from "react";

interface TeacherDialogProps {
  teacher?: Doc<"users">;
  trigger?: ReactNode;
  defaultCampusId?: Id<"campuses">;
}

export function TeacherDialog({
  teacher,
  trigger,
  defaultCampusId,
}: TeacherDialogProps) {
  return (
    <ManagedUserDialog
      user={teacher}
      role="teacher"
      trigger={trigger}
      defaultCampusId={defaultCampusId}
    />
  );
}
