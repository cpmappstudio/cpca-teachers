"use client"

import * as React from "react"
import {
  Building,
  Users,
  Book,
  BookOpen,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useUser } from "@clerk/nextjs"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { UniversityLogo } from "@/components/university-logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
// import { ModeToggle } from "./mode-toggle"
// import { LangToggle } from "./lang-toggle"
import { UserButtonWrapper } from "./user-button-wrapper"
import type { UserRole } from "@/convex/types"

// Helper function to extract role from user object (client-safe)
function getUserRole(user: any): UserRole | null {
  if (!user) return null

  const publicMeta = user.publicMetadata
  const privateMeta = user.privateMetadata
  const unsafeMeta = user.unsafeMetadata

  const role = publicMeta?.role ?? privateMeta?.role ?? unsafeMeta?.role

  return (role as UserRole) ?? null
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state, isMobile, setOpenMobile } = useSidebar()
  const pathname = usePathname()
  const t = useTranslations('navigation')
  const { user } = useUser()

  // Cerrar sidebar automáticamente en móviles cuando cambia la ruta
  React.useEffect(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [pathname, isMobile, setOpenMobile])

  // Obtener rol del usuario
  const userRole = React.useMemo(() => {
    return getUserRole(user)
  }, [user])

  // Definir items de navegación según el rol
  const getNavItems = React.useCallback((role: UserRole | null) => {
    if (!role) return []

    // Items para teachers
    if (role === 'teacher') {
      return [
        {
          title: "My Courses",
          url: "/teaching",
          icon: Book,
          isActive: false,
          items: [],
        }
      ]
    }

    // Items para admin y superadmin
    if (role === 'admin' || role === 'superadmin') {
      return [
        {
          title: "Campuses",
          url: "/admin/campuses",
          icon: Building,
          isActive: false,
          items: [],
        },
        {
          title: "Teachers",
          url: "/admin/teachers",
          icon: Users,
          isActive: false,
          items: [],
        },
        {
          title: "Curriculums",
          url: "/admin/curriculums",
          icon: Book,
          isActive: false,
          items: [],
        },
        {
          title: "Lessons",
          url: "/admin/lessons",
          icon: BookOpen,
          isActive: false,
          items: [],
        }
      ]
    }

    return []
  }, [])

  // Obtener navegación según rol del usuario
  const navItems = React.useMemo(() => {
    return getNavItems(userRole)
  }, [userRole, getNavItems])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <UserButtonWrapper
          showName={state !== "collapsed"}
          collapsed={state === "collapsed"}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={navItems}
          navigationLabel="Navigation"
        />
      </SidebarContent>
      <SidebarFooter>
        {/* <LangToggle showText={state !== "collapsed"} />
        <ModeToggle showText={state !== "collapsed"} /> */}
        <UniversityLogo />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
