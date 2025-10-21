/**
 * Grade utilities for handling grade codes and groups
 * Separates the concept of grades (academic levels) from groups (sections/classes)
 */

/**
 * Generate group codes for a grade
 * @param gradeCode - Base grade code (e.g., "01", "K", "PK")
 * @param numberOfGroups - Number of groups/sections for this grade
 * @returns Array of group codes (e.g., ["01-1", "01-2", "01-3"])
 * 
 * @example
 * generateGroupCodes("01", 3) // ["01-1", "01-2", "01-3"]
 * generateGroupCodes("K", 2)  // ["K-1", "K-2"]
 */
export function generateGroupCodes(gradeCode: string, numberOfGroups: number): string[] {
    const groupCodes: string[] = [];

    for (let i = 1; i <= numberOfGroups; i++) {
        groupCodes.push(`${gradeCode}-${i}`);
    }

    return groupCodes;
}

/**
 * Extract base grade code from a group code
 * @param groupCode - Full group code (e.g., "01-1", "K-2")
 * @returns Base grade code (e.g., "01", "K")
 * 
 * @example
 * extractBaseGradeCode("01-1") // "01"
 * extractBaseGradeCode("K-2")  // "K"
 * extractBaseGradeCode("01")   // "01" (handles base codes too)
 */
export function extractBaseGradeCode(groupCode: string): string {
    const parts = groupCode.split('-');
    return parts[0];
}

/**
 * Extract group number from a group code
 * @param groupCode - Full group code (e.g., "01-1", "K-2")
 * @returns Group number or null if not a group code
 * 
 * @example
 * extractGroupNumber("01-1") // 1
 * extractGroupNumber("K-2")  // 2
 * extractGroupNumber("01")   // null
 */
export function extractGroupNumber(groupCode: string): number | null {
    const parts = groupCode.split('-');
    if (parts.length < 2) return null;

    const groupNum = parseInt(parts[1]);
    return isNaN(groupNum) ? null : groupNum;
}

/**
 * Check if a code is a group code (has a group suffix)
 * @param code - Code to check
 * @returns true if it's a group code (e.g., "01-1"), false if base grade (e.g., "01")
 * 
 * @example
 * isGroupCode("01-1") // true
 * isGroupCode("01")   // false
 */
export function isGroupCode(code: string): boolean {
    return extractGroupNumber(code) !== null;
}

/**
 * Get group display name
 * @param groupCode - Full group code (e.g., "01-1")
 * @param gradeName - Grade name (e.g., "First Grade")
 * @returns Display name (e.g., "First Grade - Section 1")
 * 
 * @example
 * getGroupDisplayName("01-1", "First Grade") // "First Grade - Section 1"
 * getGroupDisplayName("K-2", "Kinder")       // "Kinder - Section 2"
 */
export function getGroupDisplayName(groupCode: string, gradeName: string): string {
    const groupNumber = extractGroupNumber(groupCode);

    if (groupNumber === null) {
        return gradeName;
    }

    return `${gradeName} - Section ${groupNumber}`;
}

/**
 * Group codes by base grade
 * @param codes - Array of grade/group codes
 * @returns Map of base grade code to array of full codes
 * 
 * @example
 * groupCodesByGrade(["01-1", "01-2", "02-1", "K"])
 * // Map { "01" => ["01-1", "01-2"], "02" => ["02-1"], "K" => ["K"] }
 */
export function groupCodesByGrade(codes: string[]): Map<string, string[]> {
    const grouped = new Map<string, string[]>();

    codes.forEach(code => {
        const baseCode = extractBaseGradeCode(code);

        if (!grouped.has(baseCode)) {
            grouped.set(baseCode, []);
        }

        grouped.get(baseCode)!.push(code);
    });

    return grouped;
}

/**
 * Get all group codes from campus grades
 * @param grades - Array of grade objects from campus
 * @returns Array of all group codes for all grades
 * 
 * @example
 * getAllGroupCodes([
 *   { code: "01", numberOfGroups: 3, ... },
 *   { code: "02", numberOfGroups: 2, ... }
 * ])
 * // ["01-1", "01-2", "01-3", "02-1", "02-2"]
 */
export function getAllGroupCodes(grades: Array<{ code: string; numberOfGroups?: number }>): string[] {
    const allGroupCodes: string[] = [];

    grades.forEach(grade => {
        // Default to 1 group if numberOfGroups is not defined
        const numberOfGroups = grade.numberOfGroups ?? 1;
        const groupCodes = generateGroupCodes(grade.code, numberOfGroups);
        allGroupCodes.push(...groupCodes);
    });

    return allGroupCodes;
}

/**
 * Format grade code for display
 * @param code - Grade code (e.g., "01", "K", "PK")
 * @returns Formatted code (e.g., "1st", "K", "PK")
 * 
 * @example
 * formatGradeCode("01") // "1st"
 * formatGradeCode("02") // "2nd"
 * formatGradeCode("K")  // "K"
 */
export function formatGradeCode(code: string): string {
    // If it's a numeric code, format with ordinal suffix
    const num = parseInt(code);
    if (!isNaN(num)) {
        const suffixes = ["th", "st", "nd", "rd"];
        const v = num % 100;
        return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
    }

    // Otherwise return as is (for K, PK, etc.)
    return code;
}

/**
 * Get available groups for a grade from campus data
 * @param campus - Campus object with grades array
 * @param gradeCode - Base grade code to get groups for
 * @returns Array of group objects with code and display name
 * 
 * @example
 * getAvailableGroupsForGrade(campus, "01")
 * // [
 * //   { code: "01-1", displayName: "1st Grade - Group 1" },
 * //   { code: "01-2", displayName: "1st Grade - Group 2" },
 * //   { code: "01-3", displayName: "1st Grade - Group 3" }
 * // ]
 */
export function getAvailableGroupsForGrade(
    campus: { grades?: Array<{ code: string; name: string; numberOfGroups?: number }> },
    gradeCode: string
): Array<{ code: string; displayName: string }> {
    if (!campus.grades) return [];

    const grade = campus.grades.find(g => g.code === gradeCode);
    if (!grade) return [];

    // Default to 1 group if numberOfGroups is not defined
    const numberOfGroups = grade.numberOfGroups ?? 1;
    const groupCodes = generateGroupCodes(gradeCode, numberOfGroups);

    return groupCodes.map((code, index) => ({
        code,
        displayName: `${grade.name} - Group ${index + 1}`
    }));
}
