"use client"

import * as React from "react"
import { Check, ChevronDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SelectDropdownProps {
    options: { value: string; label: string }[]
    value?: string
    onValueChange: (value: string) => void
    placeholder?: string
    label?: string
    className?: string
    disabled?: boolean
    searchable?: boolean
    searchPlaceholder?: string
}

export function SelectDropdown({
    options,
    value,
    onValueChange,
    placeholder = "Select option...",
    label,
    className,
    disabled = false,
    searchable = false,
    searchPlaceholder = "Search...",
}: SelectDropdownProps) {
    const [open, setOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")
    const selectedOption = options.find((option) => option.value === value)

    const filteredOptions = React.useMemo(() => {
        if (!searchable || !searchQuery.trim()) return options
        return options.filter((option) =>
            option.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [options, searchQuery, searchable])

    // Reset search when dropdown closes
    React.useEffect(() => {
        if (!open) {
            setSearchQuery("")
        }
    }, [open])

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className={cn("w-full justify-between", className)}
                    disabled={disabled}
                >
                    <span className="truncate text-left">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-56 max-h-[300px] overflow-y-auto"
                align="start"
                side="bottom"
                sideOffset={4}
            >
                {label && (
                    <>
                        <DropdownMenuLabel>{label}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                    </>
                )}

                {/* Search input */}
                {searchable && (
                    <>
                        <div className="p-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder={searchPlaceholder}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 h-8"
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                        <DropdownMenuSeparator />
                    </>
                )}

                {/* Clear option */}
                {value && (
                    <>
                        <DropdownMenuItem
                            onClick={() => {
                                onValueChange("")
                                setOpen(false)
                            }}
                            className="text-muted-foreground"
                        >
                            <span>Clear selection</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}

                {/* Options */}
                {filteredOptions.map((option) => (
                    <DropdownMenuItem
                        key={option.value}
                        onClick={() => {
                            onValueChange(option.value)
                            setOpen(false)
                        }}
                        className={cn(
                            "flex items-center justify-between cursor-pointer",
                            value === option.value && "bg-accent"
                        )}
                    >
                        <span className="truncate">{option.label}</span>
                        {value === option.value && (
                            <Check className="ml-2 h-4 w-4 shrink-0" />
                        )}
                    </DropdownMenuItem>
                ))}

                {filteredOptions.length === 0 && (
                    <DropdownMenuItem disabled>
                        {searchable && searchQuery ? "No matching options" : "No options available"}
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}