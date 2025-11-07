"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { ReactNode } from "react"
import { Save } from "lucide-react"

interface EntityDialogProps {
    // Trigger configuration
    trigger: ReactNode

    // Header configuration
    title: string

    // Content
    children: ReactNode

    // Form handling (optional - if not provided, no form or footer will be shown)
    onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void

    // Footer configuration (optional customization)
    submitLabel?: string
    isSubmitting?: boolean
    leftActions?: ReactNode // Para botones adicionales a la izquierda
    showActions?: boolean // Control si mostrar el footer con acciones

    // Size customization (optional)
    maxWidth?: string

    // Dialog state control (optional)
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function EntityDialog({
    trigger,
    title,
    children,
    onSubmit,
    submitLabel = "Save changes",
    isSubmitting = false,
    leftActions,
    showActions = true,
    maxWidth = "600px",
    open,
    onOpenChange
}: EntityDialogProps) {
    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        event.stopPropagation() // Prevenir propagación a formularios padres
        if (onSubmit) {
            onSubmit(event)
        }
    }

    // Si no hay onSubmit, renderizar sin form
    const content = (
        <>
            {/* Fixed Header */}
            <DialogHeader className="px-6 pt-6 pb-4 border-b bg-background flex-shrink-0">
                <DialogTitle>{title}</DialogTitle>
            </DialogHeader>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full w-full">
                    <div className="px-6 py-4">
                        {children}
                    </div>
                </ScrollArea>
            </div>

            {/* Fixed Footer - solo si showActions es true */}
            {showActions && (
                <DialogFooter className="px-6 py-4 border-t bg-background flex-shrink-0">
                    <div className="flex items-center gap-2 w-full justify-end">
                        {/* Left actions (like delete button) */}
                        {leftActions}

                        {/* Submit button */}
                        <Button
                            type="submit"
                            className="min-w-[120px]"
                            disabled={isSubmitting}
                            variant="default"
                        >
                            <Save className="h-4 w-4" />
                            {isSubmitting ? "Saving..." : submitLabel}
                        </Button>
                    </div>
                </DialogFooter>
            )}
        </>
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent
                className="w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden"
                style={{ maxWidth }}
            >
                {onSubmit ? (
                    <form onSubmit={handleFormSubmit} className="flex flex-col h-full">
                        {content}
                    </form>
                ) : (
                    <div className="flex flex-col h-full">
                        {content}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}