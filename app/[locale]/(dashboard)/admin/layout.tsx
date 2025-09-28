import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { canAccessAdmin, roleFromSessionClaims } from "@/lib/rbac";

export default async function AdminLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    const { userId, sessionClaims } = await auth();

    if (!userId) {
        redirect(`/${locale}/sign-in`);
    }

    const userRole = roleFromSessionClaims(sessionClaims);

    if (!canAccessAdmin(userRole)) {
        redirect(`/${locale}`);
    }

    return <>{children}</>;
}
