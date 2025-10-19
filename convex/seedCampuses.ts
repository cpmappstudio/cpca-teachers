/**
 * Seed script to populate campuses with images
 * 
 * This function should be called from a mutation to properly handle
 * authentication and storage uploads.
 * 
 * Usage:
 * 1. Upload campus images to Convex Storage first
 * 2. Run this mutation to create campuses with image references
 * 
 * Or use the CLI import method:
 * npx convex import --table campuses convex/seedCampuses.jsonl
 * Then update images manually via dashboard or separate mutation
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Campus seed data structure
 */
const STANDARD_GRADES = [
    {
        name: "Pre-K",
        code: "PK",
        level: 0,
        category: "prekinder" as const,
        numberOfGroups: 1,
        isActive: true,
    },
    {
        name: "Kinder",
        code: "K",
        level: 1,
        category: "kinder" as const,
        numberOfGroups: 2,
        isActive: true,
    },
    {
        name: "1st Grade",
        code: "01",
        level: 2,
        category: "elementary" as const,
        numberOfGroups: 6,
        isActive: true,
    },
    {
        name: "2nd Grade",
        code: "02",
        level: 3,
        category: "elementary" as const,
        numberOfGroups: 6,
        isActive: true,
    },
    {
        name: "3rd Grade",
        code: "03",
        level: 4,
        category: "elementary" as const,
        numberOfGroups: 6,
        isActive: true,
    },
    {
        name: "4th Grade",
        code: "04",
        level: 5,
        category: "elementary" as const,
        numberOfGroups: 6,
        isActive: true,
    },
    {
        name: "5th Grade",
        code: "05",
        level: 6,
        category: "elementary" as const,
        numberOfGroups: 6,
        isActive: true,
    },
    {
        name: "6th Grade",
        code: "06",
        level: 7,
        category: "middle" as const,
        numberOfGroups: 6,
        isActive: true,
    },
    {
        name: "7th Grade",
        code: "07",
        level: 8,
        category: "middle" as const,
        numberOfGroups: 6,
        isActive: true,
    },
    {
        name: "8th Grade",
        code: "08",
        level: 9,
        category: "middle" as const,
        numberOfGroups: 6,
        isActive: true,
    },
    {
        name: "9th Grade",
        code: "09",
        level: 10,
        category: "high" as const,
        numberOfGroups: 6,
        isActive: true,
    },
    {
        name: "10th Grade",
        code: "10",
        level: 11,
        category: "high" as const,
        numberOfGroups: 6,
        isActive: true,
    },
    {
        name: "11th Grade",
        code: "11",
        level: 12,
        category: "high" as const,
        numberOfGroups: 6,
        isActive: true,
    },
    {
        name: "12th Grade",
        code: "12",
        level: 13,
        category: "high" as const,
        numberOfGroups: 6,
        isActive: true,
    },
];

/**
 * Campus definitions
 * 
 * CODE NOMENCLATURE RULES:
 * - US Campuses in Florida: Descriptive abbreviations
 *   - NEPT-HS: Neptune / High School
 *   - LC: Learning Centers
 *   - SIMP: Simpson Campus
 *   - POIN: Poinciana Campus
 * - International Campuses: Country codes
 *   - HND: Honduras
 *   - PR: Puerto Rico
 * 
 * IMAGE MAPPING:
 * - neptune.jpg -> Neptune / High School
 * - learning-centers.jpg -> Learning Centers
 * - simpsom.jpg -> Simpson Campus (note: typo in filename)
 * - poinciana.jpg -> Poinciana Campus
 * - honduras.jpg -> Honduras Campus
 * - puertorico.jpg -> Puerto Rico Campus
 */
const CAMPUSES_DATA = [
    {
        name: "Neptune / High School",
        code: "NEPT-HS",
        imageFilename: "neptune.jpg",
        address: {
            city: "Kissimmee",
            state: "FL",
            country: "US",
        },
    },
    {
        name: "Learning Centers",
        code: "LC",
        imageFilename: "learning-centers.jpg",
        address: {
            city: "Kissimmee",
            state: "FL",
            country: "US",
        },
    },
    {
        name: "Simpson Campus",
        code: "SIMP",
        imageFilename: "simpsom.jpg", // Note: Original filename has typo
        address: {
            city: "Kissimmee",
            state: "FL",
            country: "US",
        },
    },
    {
        name: "Poinciana Campus",
        code: "POIN",
        imageFilename: "poinciana.jpg",
        address: {
            city: "Poinciana",
            state: "FL",
            country: "US",
        },
    },
    {
        name: "Honduras Campus",
        code: "HND",
        imageFilename: "honduras.jpg",
        address: {
            city: "Tegucigalpa",
            state: "FM", // Francisco Morazán department
            country: "HN",
        },
    },
    {
        name: "Puerto Rico Campus",
        code: "PR",
        imageFilename: "puertorico.jpg",
        address: {
            city: "San Juan",
            state: "SJ", // San Juan region
            country: "PR",
        },
    },
];

/**
 * Mutation to seed campuses
 * 
 * This mutation creates all campuses with standard grades.
 * Images should be uploaded separately via the dashboard or another mutation.
 * 
 * @param ctx - Convex mutation context
 * @param args - createdBy: User ID who is creating the campuses
 * @returns Array of created campus IDs
 */
export const seedCampuses = mutation({
    args: {
        createdBy: v.id("users"),
    },
    handler: async (ctx, args) => {
        const currentTimestamp = Date.now();
        const campusIds: string[] = [];
        const skipped: string[] = [];

        for (const campusData of CAMPUSES_DATA) {
            // Check if campus already exists
            const existing = await ctx.db
                .query("campuses")
                .filter((q) => q.eq(q.field("code"), campusData.code))
                .first();

            if (existing) {
                console.log(`Campus ${campusData.code} already exists, skipping...`);
                campusIds.push(existing._id);
                skipped.push(campusData.code);
                continue;
            }

            // Create campus
            const campusId = await ctx.db.insert("campuses", {
                name: campusData.name,
                code: campusData.code,

                // Image will be null initially - update separately
                campusImageStorageId: undefined,

                // Director information - not assigned yet
                directorId: undefined,
                directorName: undefined,
                directorEmail: undefined,
                directorPhone: undefined,

                // Address information
                address: {
                    street: undefined,
                    city: campusData.address.city,
                    state: campusData.address.state,
                    zipCode: undefined,
                    country: campusData.address.country,
                },

                // All campuses have the same grade structure
                grades: STANDARD_GRADES,

                // Initial metrics
                metrics: {
                    totalTeachers: 0,
                    activeTeachers: 0,
                    averageProgress: 0,
                    lastUpdated: currentTimestamp,
                },

                // Status fields
                isActive: true,
                status: "active",

                // Timestamps
                createdAt: currentTimestamp,
                createdBy: args.createdBy,
                updatedAt: undefined,
                updatedBy: undefined,
            });

            console.log(`Created campus: ${campusData.name} (${campusData.code}) - ID: ${campusId}`);
            campusIds.push(campusId);
        }

        const created = campusIds.length - skipped.length;

        return {
            success: true,
            campusesCreated: created,
            campusesSkipped: skipped.length,
            campusIds,
            skippedCodes: skipped,
            message: `Successfully seeded ${created} campuses${skipped.length > 0 ? ` (${skipped.length} already existed)` : ""}`,
        };
    },
});

/**
 * Helper mutation to get the first admin/superadmin user ID
 * Use this to get a valid createdBy ID for seeding
 */
export const getAdminUserId = query({
    args: {},
    handler: async (ctx) => {
        const admin = await ctx.db
            .query("users")
            .filter((q) =>
                q.or(
                    q.eq(q.field("role"), "admin"),
                    q.eq(q.field("role"), "superadmin")
                )
            )
            .first();

        if (!admin) {
            return null;
        }

        return {
            userId: admin._id,
            email: admin.email,
            fullName: admin.fullName,
            role: admin.role,
        };
    },
});

/**
 * Export campus data for reference
 */
export const CAMPUS_IMAGE_MAPPING = CAMPUSES_DATA.map((c) => ({
    code: c.code,
    name: c.name,
    imageFilename: c.imageFilename,
    imagePath: `public/data/campus images/${c.imageFilename}`,
}));
