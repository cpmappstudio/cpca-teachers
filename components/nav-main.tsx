"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, memo } from "react"
import { type LucideIcon } from "lucide-react"
import { clsx } from "clsx"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export const NavMain = memo(function NavMain({
  items,
  navigationLabel,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
  navigationLabel: string
}) {
  const pathname = usePathname()

  // Memoize the path processing to avoid regex on every render
  const pathWithoutLocale = useMemo(() => {
    return pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '')
  }, [pathname])

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{navigationLabel}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild
              className={clsx({
                'bg-sidebar-accent text-sidebar-accent-foreground': pathWithoutLocale === item.url,
              })}
            >
              <Link href={item.url}>
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
})
