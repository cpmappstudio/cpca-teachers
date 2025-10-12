"use client"

import * as React from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"

export function UniversityLogo() {
    const { state } = useSidebar()
    const t = useTranslations('university')
    const isCollapsed = state === "collapsed"

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <div className={`flex w-full items-center gap-1 rounded-md pb-2 text-left text-sm ${isCollapsed ? 'px-0 justify-center' : 'px-1'}`}>
                    <div className={`flex aspect-square items-center justify-center ${isCollapsed ? 'size-8' : 'size-14'}`}>
                        <Image
                            src="/cpca.png"
                            alt="cpca logo"
                            width={isCollapsed ? 32 : 56}
                            height={isCollapsed ? 32 : 56}
                            className="object-contain"
                        />
                    </div>
                    <div className="grid flex-1 text-left text-sm antialiased leading-tight ">
                        <span className="truncate font-medium text-base">
                            {t('name')}
                        </span>
                        <span className="truncate text-xs font-semibold text-sidebar-accent-foreground tracking-wider">
                            {t('academicRecords')}
                        </span>
                    </div>
                </div>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
