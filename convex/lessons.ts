import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all lessons
 */
export const getLessons = query({
  args: {
    curriculumId: v.optional(v.id("curriculums")),
    quarter: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Filter by curriculum and quarter if provided
    if (args.curriculumId !== undefined && args.quarter !== undefined) {
      const lessons = await ctx.db
        .query("curriculum_lessons")
        .withIndex(
          "by_curriculum_quarter",
          (q) =>
            q
              .eq("curriculumId", args.curriculumId!)
              .eq("quarter", args.quarter!)
        )
        .collect();

      // Apply isActive filter if needed
      if (args.isActive !== undefined) {
        return lessons.filter((lesson) => lesson.isActive === args.isActive);
      }
      return lessons;
    }

    // Filter by curriculum only
    if (args.curriculumId !== undefined) {
      const lessons = await ctx.db
        .query("curriculum_lessons")
        .withIndex("by_curriculum_active", (q) =>
          q.eq("curriculumId", args.curriculumId!)
        )
        .collect();

      // Apply isActive filter if needed
      if (args.isActive !== undefined) {
        return lessons.filter((lesson) => lesson.isActive === args.isActive);
      }
      return lessons;
    }

    // Filter by quarter and active status
    if (args.quarter !== undefined && args.isActive !== undefined) {
      return await ctx.db
        .query("curriculum_lessons")
        .withIndex("by_quarter", (q) =>
          q.eq("quarter", args.quarter!).eq("isActive", args.isActive!)
        )
        .collect();
    }

    // Get all lessons
    const lessons = await ctx.db.query("curriculum_lessons").collect();

    // Apply isActive filter if needed
    if (args.isActive !== undefined) {
      return lessons.filter((lesson) => lesson.isActive === args.isActive);
    }

    return lessons;
  },
});

/**
 * Get lesson by ID
 */
export const getLesson = query({
  args: { lessonId: v.id("curriculum_lessons") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.lessonId);
  },
});

/**
 * Create new lesson
 */
export const createLesson = mutation({
  args: {
    curriculumId: v.id("curriculums"),
    title: v.string(),
    description: v.optional(v.string()),
    quarter: v.number(),
    orderInQuarter: v.number(),
    expectedDurationMinutes: v.optional(v.number()),
    resources: v.optional(
      v.array(
        v.object({
          name: v.string(),
          url: v.string(),
          type: v.string(),
          isRequired: v.boolean(),
        })
      )
    ),
    objectives: v.optional(v.array(v.string())),
    isMandatory: v.optional(v.boolean()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const lessonId = await ctx.db.insert("curriculum_lessons", {
      curriculumId: args.curriculumId,
      title: args.title,
      description: args.description,
      quarter: args.quarter,
      orderInQuarter: args.orderInQuarter,
      expectedDurationMinutes: args.expectedDurationMinutes,
      resources: args.resources,
      objectives: args.objectives,
      isActive: true,
      isMandatory: args.isMandatory ?? true,
      createdAt: Date.now(),
      createdBy: args.createdBy,
    });

    return lessonId;
  },
});

/**
 * Update lesson
 */
export const updateLesson = mutation({
  args: {
    lessonId: v.id("curriculum_lessons"),
    updates: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      quarter: v.optional(v.number()),
      orderInQuarter: v.optional(v.number()),
      expectedDurationMinutes: v.optional(v.number()),
      resources: v.optional(
        v.array(
          v.object({
            name: v.string(),
            url: v.string(),
            type: v.string(),
            isRequired: v.boolean(),
          })
        )
      ),
      objectives: v.optional(v.array(v.string())),
      isActive: v.optional(v.boolean()),
      isMandatory: v.optional(v.boolean()),
    }),
    updatedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.lessonId, {
      ...args.updates,
      updatedAt: Date.now(),
      updatedBy: args.updatedBy,
    });
  },
});

/**
 * Delete lesson
 */
export const deleteLesson = mutation({
  args: { lessonId: v.id("curriculum_lessons") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.lessonId);
  },
});
