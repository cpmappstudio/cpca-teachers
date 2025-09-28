"use client"

import { Button } from "@/components/ui/button"
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
    cancelLabel?: string
    isSubmitting?: boolean

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
    cancelLabel = "Cancel",
    isSubmitting = false,
    maxWidth = "600px"
}: EntityDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent
                className="w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden"
                style={{ maxWidth }}
            >
                <form onSubmit={onSubmit} className="flex flex-col h-full min-h-0">
                    {/* Fixed Header */}
                    <DialogHeader className="px-6 pt-6 pb-4 border-b bg-background flex-shrink-0">
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>{description}</DialogDescription>
                    </DialogHeader>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
                        {children}
                    </div>

                    {/* Fixed Footer */}
                    <DialogFooter className="px-6 py-4 border-t bg-background flex-shrink-0 flex flex-col-reverse sm:flex-row gap-2">
                        <DialogClose asChild>
                            <Button
                                variant="outline"
                                className="w-full sm:w-auto"
                                disabled={isSubmitting}
                            >
                                {cancelLabel}
                            </Button>
                        </DialogClose>
                        <Button
                            type="submit"
                            className="w-full sm:w-auto"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Saving..." : submitLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}