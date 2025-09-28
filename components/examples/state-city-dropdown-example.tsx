import { SelectDropdown } from "@/components/ui/select-dropdown"
import { usStates } from "@/lib/location-data"
import { getCitiesByState } from "@/lib/cities-data"
import { useState } from "react"

export function StateCityDropdownExample() {
    const [selectedState, setSelectedState] = useState<string>("")
    const [selectedCity, setSelectedCity] = useState<string>("")

    // Get available cities based on selected state
    const availableCities = getCitiesByState(selectedState)

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <div className="space-y-2">
                <h3 className="text-lg font-medium">State → City Selection Example</h3>
                <p className="text-sm text-muted-foreground">
                    Select a state first, then choose from major cities in that state. Both dropdowns are scrolleable and responsive.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* State Selector */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">State</label>
                    <SelectDropdown
                        options={usStates}
                        value={selectedState}
                        onValueChange={(value) => {
                            setSelectedState(value)
                            // Reset city when state changes
                            setSelectedCity("")
                        }}
                        placeholder="Select state..."
                        label="US States"
                    />
                </div>

                {/* City Selector - Dynamic */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">City</label>
                    <SelectDropdown
                        options={availableCities}
                        value={selectedCity}
                        onValueChange={setSelectedCity}
                        placeholder={availableCities.length > 0 ? "Select city..." : "Select state first"}
                        label={availableCities.length > 0 ? "Major Cities" : undefined}
                        disabled={availableCities.length === 0}
                    />
                    {availableCities.length === 0 && selectedState && (
                        <p className="text-xs text-muted-foreground">
                            No major cities available for {usStates.find(s => s.value === selectedState)?.label}
                        </p>
                    )}
                </div>
            </div>

            {/* Results */}
            {(selectedState || selectedCity) && (
                <div className="p-4 bg-muted rounded-md space-y-2">
                    <h4 className="font-medium">Selection:</h4>
                    {selectedState && (
                        <p className="text-sm">
                            <strong>State:</strong> {usStates.find(s => s.value === selectedState)?.label} ({selectedState})
                        </p>
                    )}
                    {selectedCity && (
                        <p className="text-sm">
                            <strong>City:</strong> {availableCities.find(c => c.value === selectedCity)?.label}
                        </p>
                    )}
                    {selectedState && (
                        <p className="text-xs text-muted-foreground">
                            Available cities in this state: {availableCities.length}
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}