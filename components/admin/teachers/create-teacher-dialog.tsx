"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { UserPlus } from "lucide-react"
import { EntityDialog } from "@/components/ui/entity-dialog"

interface CreateTeacherDialogProps {
    campusId: string
}

export function CreateTeacherDialog({ campusId }: CreateTeacherDialogProps) {
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)

        // TODO: Implement Convex mutation to create teacher
    }

    const trigger = (
        <Button className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Teacher
        </Button>
    )

    return (
        <EntityDialog
            trigger={trigger}
            title="Add New Teacher"
            description="Create a new teacher profile and assign them to this campus."
            onSubmit={handleSubmit}
            submitLabel="Create Teacher"
        >
            <div className="grid gap-6">
                {/* Personal Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-3">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                            id="firstName"
                            name="firstName"
                            required
                        />
                    </div>
                    <div className="grid gap-3">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                            id="lastName"
                            name="lastName"
                            required
                        />
                    </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium border-b pb-2">Contact Information</h4>
                    <div className="grid gap-3">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            required
                        />
                    </div>
                    <div className="grid gap-3">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                            id="phone"
                            name="phone"
                        />
                    </div>
                </div>

                {/* Role & Status */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium border-b pb-2">Role & Status</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-3">
                            <Label htmlFor="role">Role</Label>
                            <Select name="role" defaultValue="teacher">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="teacher">Teacher</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-3">
                            <Label htmlFor="status">Status</Label>
                            <Select name="status" defaultValue="active">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                    <SelectItem value="on_leave">On Leave</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>
        </EntityDialog>
    )
}