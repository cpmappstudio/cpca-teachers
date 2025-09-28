"use client"

import * as React from "react"
import {
  Building,
  Users,
  BookOpen,
} from "lucide-react"
import { useTranslations } from "next-intl"

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
import { ModeToggle } from "./mode-toggle"
import { LangToggle } from "./lang-toggle"
import { UserButtonWrapper } from "./user-button-wrapper"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar()
  const t = useTranslations('navigation')

  // Navegación simplificada - solo las 3 secciones principales
  const navItems = [
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
      icon: BookOpen,
      isActive: false,
      items: [],
    }
  ]

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
        <LangToggle showText={state !== "collapsed"} />
        <ModeToggle showText={state !== "collapsed"} />
        <UniversityLogo />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
