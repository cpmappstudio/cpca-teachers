import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all curriculums
 */
export const getCurriculums = query({
  args: {
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.isActive !== undefined) {
      return await ctx.db
        .query("curriculums")
        .withIndex("by_active", (q) => q.eq("isActive", args.isActive!))
        .collect();
    }

    return await ctx.db.query("curriculums").collect();
  },
});

/**
 * Get curriculum by ID
 */
export const getCurriculum = query({
  args: { curriculumId: v.id("curriculums") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.curriculumId);
  },
});

/**
 * Create new curriculum
 */
export const createCurriculum = mutation({
  args: {
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    numberOfQuarters: v.number(),
    resources: v.optional(v.array(v.object({
      name: v.string(),
      url: v.string(),
      type: v.string(),
    }))),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const curriculumId = await ctx.db.insert("curriculums", {
      name: args.name,
      code: args.code,
      description: args.description,
      numberOfQuarters: args.numberOfQuarters,
      resources: args.resources,
      isActive: true,
      status: "draft",
      createdAt: Date.now(),
      createdBy: args.createdBy,
      metrics: {
        totalLessons: 0,
        assignedTeachers: 0,
        averageProgress: 0,
        lastUpdated: Date.now(),
      },
    });

    return curriculumId;
  },
});

/**
 * Update curriculum
 */
export const updateCurriculum = mutation({
  args: {
    curriculumId: v.id("curriculums"),
    updates: v.object({
      name: v.optional(v.string()),
      code: v.optional(v.string()),
      description: v.optional(v.string()),
      numberOfQuarters: v.optional(v.number()),
      resources: v.optional(v.array(v.object({
        name: v.string(),
        url: v.string(),
        type: v.string(),
      }))),
      status: v.optional(v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("archived"),
        v.literal("deprecated")
      )),
    }),
    updatedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.curriculumId, {
      ...args.updates,
      updatedAt: Date.now(),
      updatedBy: args.updatedBy,
    });
  },
});

/**
 * Delete curriculum
 */
export const deleteCurriculum = mutation({
  args: { curriculumId: v.id("curriculums") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.curriculumId);
  },
});
