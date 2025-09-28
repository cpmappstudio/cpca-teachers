import { SelectDropdown } from "@/components/ui/select-dropdown"
import { usStates } from "@/lib/location-data"
import { useState } from "react"

export function StateDropdownExample() {
    const [selectedState, setSelectedState] = useState<string>("")

    return (
        <div className="max-w-md mx-auto p-6 space-y-4">
            <h3 className="text-lg font-medium">State Selection Example</h3>
            <p className="text-sm text-muted-foreground">
                This dropdown is scrolleable and responsive. Try selecting a state:
            </p>

            <SelectDropdown
                options={usStates}
                value={selectedState}
                onValueChange={setSelectedState}
                placeholder="Select a state..."
                label="US States"
            />

            {selectedState && (
                <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm">
                        Selected state: <strong>{usStates.find(s => s.value === selectedState)?.label}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">Code: {selectedState}</p>
                </div>
            )}
        </div>
    )
}