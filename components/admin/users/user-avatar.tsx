"use client";

import { useQuery } from "convex/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface UserAvatarProps {
  fullName: string;
  avatarStorageId?: Id<"_storage">;
  firstName?: string;
  lastName?: string;
  className?: string;
}

export function UserAvatar({
  fullName,
  avatarStorageId,
  firstName,
  lastName,
  className = "h-8 w-8 lg:h-10 lg:w-10",
}: UserAvatarProps) {
  const avatarUrl = useQuery(
    api.users.getAvatarUrl,
    avatarStorageId ? { storageId: avatarStorageId } : "skip",
  );

  const initials =
    `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase() ||
    fullName.charAt(0).toUpperCase();

  return (
    <Avatar className={className}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
      <AvatarFallback className="bg-deep-koamaru/10 text-deep-koamaru text-xs lg:text-sm font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
