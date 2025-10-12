import { getCurrentUserRole } from '@/lib/rbac';
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const { userId } = await auth();
  const userRole = await getCurrentUserRole();

  if (!userId) {
    redirect(`/${locale}/sign-in`)
  }

  // Redirect admins and superadmins to campuses management
  if (userRole === 'admin' || userRole === 'superadmin') {
    redirect(`/${locale}/admin/campuses`)
  }

  return (
    <div className="dashboard-container">
      {/* Render condicional por rol - AQUÍ van los componentes */}
      {userRole === 'teacher' && <div>Teacher Dashboard Placeholder</div>}

      {/* Fallback si no hay rol asignado */}
      {!userRole && <div>Welcome! Please contact admin to assign your role.</div>}
    </div>
  )
}
