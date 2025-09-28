"use client"

import { CampusDialog } from "@/components/admin/campuses/campus-dialog"
import { CampusesOverview } from "@/components/admin/campuses/campuses-overview"
import type { Doc } from "@/convex/_generated/dataModel"
import type { CampusOverview } from "@/lib/campuses/campus-overview"

// Mock campus data para el ejemplo de edición
const mockCampus: Doc<"campuses"> = {
    _id: "campus123" as any,
    _creationTime: Date.now(),
    name: "Main Campus",
    code: "MAIN",
    address: {
        street: "123 University Avenue",
        city: "Los Angeles",
        state: "California",
        zipCode: "90210",
        country: "United States"
    },
    status: "active",
    isActive: true,
    createdAt: Date.now(),
    createdBy: "user123" as any,
    directorId: undefined,
    directorName: undefined,
    directorEmail: undefined,
    directorPhone: undefined,
    campusImageStorageId: undefined,
    metrics: undefined,
    updatedAt: undefined,
    updatedBy: undefined
}

// Mock campus overview data
const mockCampusesOverview: CampusOverview[] = [
    {
        id: "campus1",
        name: "Main Campus",
        description: "The primary campus location",
        status: "active",
        teacherCount: 25,
        hero: {
            type: "initials",
            label: "MC",
            backgroundClass: "bg-blue-500",
            textClass: "text-white"
        }
    },
    {
        id: "campus2",
        name: "North Campus",
        description: "Northern branch location",
        status: "maintenance",
        teacherCount: 15,
        hero: {
            type: "initials",
            label: "NC",
            backgroundClass: "bg-green-500",
            textClass: "text-white"
        }
    }
]

export function CampusDialogExamples() {
    return (
        <div className="p-6 space-y-8">
            <div className="space-y-6">
                <h2 className="text-2xl font-bold">Campus Dialog Examples</h2>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Create Campus Dialog</h3>
                        <p className="text-muted-foreground">
                            Click the button below to test the create campus dialog.
                        </p>
                        <CampusDialog />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Edit Campus Dialog</h3>
                        <p className="text-muted-foreground">
                            Click the button below to test the edit campus dialog with mock data.
                        </p>
                        <CampusDialog campus={mockCampus} />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-2xl font-bold">Refactored Campuses Overview</h2>
                <p className="text-muted-foreground">
                    Example of the new modular campuses overview structure.
                </p>
                <div className="border rounded-lg p-4">
                    <CampusesOverview campuses={mockCampusesOverview} />
                </div>
            </div>
        </div>
    )
}