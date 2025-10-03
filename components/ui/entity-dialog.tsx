"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { ReactNode } from "react"

interface EntityDialogProps {
    // Trigger configuration
    trigger: ReactNode

    // Header configuration
    title: string
    description: string

    // Content
    children: ReactNode

    // Form handling
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void

    // Footer configuration (optional customization)
    submitLabel?: string
    isSubmitting?: boolean
    leftActions?: ReactNode // Para botones adicionales a la izquierda

    // Size customization (optional)
    maxWidth?: string
}

export function EntityDialog({
    trigger,
    title,
    description,
    children,
    onSubmit,
    submitLabel = "Save changes",
    isSubmitting = false,
    leftActions,
    maxWidth = "600px"
}: EntityDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent
                className="w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden"
                style={{ maxWidth }}
            >
                <form onSubmit={onSubmit} className="flex flex-col h-full">
                    {/* Fixed Header */}
                    <DialogHeader className="px-6 pt-6 pb-4 border-b bg-background flex-shrink-0">
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>{description}</DialogDescription>
                    </DialogHeader>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full w-full">
                            <div className="px-6 py-4">
                                {children}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Fixed Footer */}
                    <DialogFooter className="px-6 py-4 border-t bg-background flex-shrink-0 flex justify-between items-center flex-nowrap">
                        {/* Left actions (like delete button) */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {leftActions}
                        </div>

                        {/* Right actions (submit button) */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                                type="submit"
                                className="min-w-[120px]"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Saving..." : submitLabel}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}