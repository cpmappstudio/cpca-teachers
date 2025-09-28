// Enhanced cities data with more useful info for campus locations
export interface CityData {
    value: string;
    label: string;
    population?: number;
    isCapital?: boolean;
    hasUniversities?: boolean;
    metro?: string; // Metro area
}

// Example of enhanced data structure
export const enhancedCitiesByState: Record<string, CityData[]> = {
    CA: [
        {
            value: "los_angeles",
            label: "Los Angeles",
            population: 3900000,
            hasUniversities: true,
            metro: "Greater Los Angeles"
        },
        {
            value: "san_francisco",
            label: "San Francisco",
            population: 875000,
            hasUniversities: true,
            metro: "San Francisco Bay Area"
        },
        // ...more cities
    ]
};

// Smart filtering for campus-relevant cities
export const getCampusRelevantCities = (stateCode: string) => {
    const cities = enhancedCitiesByState[stateCode] || [];

    // Prioritize cities with universities or large population
    return cities
        .filter(city => city.hasUniversities || (city.population && city.population > 100000))
        .sort((a, b) => {
            // Universities first, then by population
            if (a.hasUniversities && !b.hasUniversities) return -1;
            if (!a.hasUniversities && b.hasUniversities) return 1;
            return (b.population || 0) - (a.population || 0);
        });
};