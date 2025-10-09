import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { canAccessAdmin, roleFromSessionClaims, isTeacher } from "@/lib/rbac";

export default async function CurriculumsLayout({
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

    // Permitir acceso a admin, superadmin y teacher
    if (!canAccessAdmin(userRole) && !isTeacher(userRole)) {
        redirect(`/${locale}`);
    }

    return <>{children}</>;
}
