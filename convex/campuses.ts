import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all campuses
 */
export const getCampuses = query({
  args: {
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.isActive !== undefined) {
      return await ctx.db
        .query("campuses")
        .withIndex("by_active", (q) => q.eq("isActive", args.isActive!))
        .collect();
    }

    return await ctx.db.query("campuses").collect();
  },
});

/**
 * Get campus by ID
 */
export const getCampus = query({
  args: { campusId: v.id("campuses") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.campusId);
  },
});

/**
 * Create new campus
 */
export const createCampus = mutation({
  args: {
    name: v.string(),
    code: v.optional(v.string()),
    directorId: v.optional(v.id("users")),
    directorName: v.optional(v.string()),
    directorEmail: v.optional(v.string()),
    directorPhone: v.optional(v.string()),
    address: v.optional(v.object({
      street: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      zipCode: v.optional(v.string()),
      country: v.optional(v.string()),
    })),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const campusId = await ctx.db.insert("campuses", {
      name: args.name,
      code: args.code,
      directorId: args.directorId,
      directorName: args.directorName,
      directorEmail: args.directorEmail,
      directorPhone: args.directorPhone,
      address: args.address,
      isActive: true,
      status: "active",
      createdAt: Date.now(),
      createdBy: args.createdBy,
      metrics: {
        totalTeachers: 0,
        activeTeachers: 0,
        averageProgress: 0,
        lastUpdated: Date.now(),
      },
    });

    return campusId;
  },
});

/**
 * Update campus
 */
export const updateCampus = mutation({
  args: {
    campusId: v.id("campuses"),
    updates: v.object({
      name: v.optional(v.string()),
      code: v.optional(v.string()),
      directorId: v.optional(v.id("users")),
      directorName: v.optional(v.string()),
      directorEmail: v.optional(v.string()),
      directorPhone: v.optional(v.string()),
      address: v.optional(v.object({
        street: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zipCode: v.optional(v.string()),
        country: v.optional(v.string()),
      })),
      status: v.optional(v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("maintenance")
      )),
    }),
    updatedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.campusId, {
      ...args.updates,
      updatedAt: Date.now(),
      updatedBy: args.updatedBy,
    });
  },
});

/**
 * Delete campus
 */
export const deleteCampus = mutation({
  args: { campusId: v.id("campuses") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.campusId);
  },
});

/**
 * Get teachers by campus
 */
export const getTeachersByCampus = query({
  args: {
    campusId: v.id("campuses"),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_campus_active", (q) =>
        q.eq("campusId", args.campusId).eq("isActive", args.isActive ?? true)
      )
      .collect();
  },
});