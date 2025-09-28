"use client"

import { AddTeachersDialog } from "@/components/admin/campuses/campus-detail/add-teachers-dialog"
import { AddTeachersDialogMock } from "./add-teachers-dialog-mock"

export function AddTeachersDialogExample() {
    return (
        <div className="p-6 space-y-8">
            <div className="space-y-4">
                <h2 className="text-2xl font-bold">Add Teachers Dialog Examples</h2>
                <p className="text-muted-foreground">
                    Compare the real component (depends on Convex) vs the mock version with sample data.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Real Component</h3>
                    <p className="text-sm text-muted-foreground">
                        This version queries Convex for real teacher data. May show "No available teachers" if no data exists.
                    </p>
                    <AddTeachersDialog campusId={"mock-campus-id" as any} />
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Mock Component</h3>
                    <p className="text-sm text-muted-foreground">
                        This version uses mock data to demonstrate the full functionality with 8 sample teachers.
                    </p>
                    <AddTeachersDialogMock campusId={"mock-campus-id" as any} />
                </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium mb-2">Mock Teachers Available:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div>• María García López</div>
                    <div>• Carlos Rodríguez Martín</div>
                    <div>• Ana Isabel Fernández</div>
                    <div>• José Miguel Hernández</div>
                    <div>• Carmen Dolores Ruiz</div>
                    <div>• Francisco Javier Torres</div>
                    <div>• Lucía Montero Vázquez</div>
                    <div>• Roberto Silva Jiménez</div>
                </div>
            </div>

            <div className="space-y-2">
                <h4 className="font-medium">Test Scenarios:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Select multiple teachers and see them appear as badges</li>
                    <li>Remove individual teachers with the X button</li>
                    <li>Watch the submit button label change dynamically</li>
                    <li>See the selection summary at the bottom</li>
                    <li>Try the "Create Teacher" button (shows alert)</li>
                    <li>Submit the form to see console output</li>
                </ul>
            </div>
        </div>
    )
}