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
 * Check if a lesson with the same curriculum, quarter, and order already exists
 */
export const checkLessonExists = query({
  args: {
    curriculumId: v.id("curriculums"),
    quarter: v.number(),
    orderInQuarter: v.number(),
    excludeLessonId: v.optional(v.id("curriculum_lessons")),
  },
  handler: async (ctx, args) => {
    const lessons = await ctx.db
      .query("curriculum_lessons")
      .withIndex("by_curriculum_quarter", (q) =>
        q.eq("curriculumId", args.curriculumId).eq("quarter", args.quarter)
      )
      .filter((q) => q.eq(q.field("orderInQuarter"), args.orderInQuarter))
      .collect();

    // If excluding a lesson (for updates), filter it out
    const filteredLessons = args.excludeLessonId
      ? lessons.filter((lesson) => lesson._id !== args.excludeLessonId)
      : lessons;

    return filteredLessons.length > 0 ? filteredLessons[0] : null;
  },
});

/**
 * Get occupied orders for a curriculum and quarter
 */
export const getOccupiedOrders = query({
  args: {
    curriculumId: v.id("curriculums"),
    quarter: v.number(),
    excludeLessonId: v.optional(v.id("curriculum_lessons")),
  },
  handler: async (ctx, args) => {
    const lessons = await ctx.db
      .query("curriculum_lessons")
      .withIndex("by_curriculum_quarter", (q) =>
        q.eq("curriculumId", args.curriculumId).eq("quarter", args.quarter)
      )
      .collect();

    // If excluding a lesson (for updates), filter it out
    const filteredLessons = args.excludeLessonId
      ? lessons.filter((lesson) => lesson._id !== args.excludeLessonId)
      : lessons;

    return filteredLessons.map((lesson) => lesson.orderInQuarter).sort((a, b) => a - b);
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
    // Validate curriculum exists and get its numberOfQuarters
    const curriculum = await ctx.db.get(args.curriculumId);
    if (!curriculum) {
      throw new Error("Curriculum not found");
    }

    // Validate quarter is within curriculum's range
    if (args.quarter < 1 || args.quarter > curriculum.numberOfQuarters) {
      throw new Error(
        `Invalid quarter. This curriculum has ${curriculum.numberOfQuarters} quarter(s). Please select a quarter between 1 and ${curriculum.numberOfQuarters}.`
      );
    }

    // Check if lesson with same curriculum, quarter, and order already exists
    const existingLesson = await ctx.db
      .query("curriculum_lessons")
      .withIndex("by_curriculum_quarter", (q) =>
        q.eq("curriculumId", args.curriculumId).eq("quarter", args.quarter)
      )
      .filter((q) => q.eq(q.field("orderInQuarter"), args.orderInQuarter))
      .first();

    if (existingLesson) {
      throw new Error(
        `A lesson already exists at position ${args.orderInQuarter} in Quarter ${args.quarter} for this curriculum. Please choose a different order number.`
      );
    }

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
    // Get the existing lesson
    const existingLesson = await ctx.db.get(args.lessonId);
    if (!existingLesson) {
      throw new Error("Lesson not found");
    }

    // Get curriculum to validate quarter
    const curriculum = await ctx.db.get(existingLesson.curriculumId);
    if (!curriculum) {
      throw new Error("Curriculum not found");
    }

    // If quarter is being updated, validate it's within curriculum's range
    if (args.updates.quarter !== undefined) {
      if (args.updates.quarter < 1 || args.updates.quarter > curriculum.numberOfQuarters) {
        throw new Error(
          `Invalid quarter. This curriculum has ${curriculum.numberOfQuarters} quarter(s). Please select a quarter between 1 and ${curriculum.numberOfQuarters}.`
        );
      }
    }

    // Check for duplicate if quarter or order is being changed
    if (args.updates.quarter !== undefined || args.updates.orderInQuarter !== undefined) {
      const newQuarter = args.updates.quarter ?? existingLesson.quarter;
      const newOrder = args.updates.orderInQuarter ?? existingLesson.orderInQuarter;

      // Only check for duplicates if the combination is different from current
      if (newQuarter !== existingLesson.quarter || newOrder !== existingLesson.orderInQuarter) {
        const duplicateLesson = await ctx.db
          .query("curriculum_lessons")
          .withIndex("by_curriculum_quarter", (q) =>
            q.eq("curriculumId", existingLesson.curriculumId).eq("quarter", newQuarter)
          )
          .filter((q) => q.eq(q.field("orderInQuarter"), newOrder))
          .first();

        if (duplicateLesson && duplicateLesson._id !== args.lessonId) {
          throw new Error(
            `A lesson already exists at position ${newOrder} in Quarter ${newQuarter} for this curriculum. Please choose a different order number.`
          );
        }
      }
    }

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

/**
 * Get all lessons with curriculum details
 * Returns lessons with curriculum name and code for display
 */
export const getLessonsWithCurriculum = query({
  args: {
    curriculumId: v.optional(v.id("curriculums")),
    quarter: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get all lessons first (reuse the logic from getLessons)
    let lessons;

    // Filter by curriculum and quarter if provided
    if (args.curriculumId !== undefined && args.quarter !== undefined) {
      lessons = await ctx.db
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
        lessons = lessons.filter((lesson) => lesson.isActive === args.isActive);
      }
    }
    // Filter by curriculum only
    else if (args.curriculumId !== undefined) {
      lessons = await ctx.db
        .query("curriculum_lessons")
        .withIndex("by_curriculum_active", (q) =>
          q.eq("curriculumId", args.curriculumId!)
        )
        .collect();

      // Apply isActive filter if needed
      if (args.isActive !== undefined) {
        lessons = lessons.filter((lesson) => lesson.isActive === args.isActive);
      }
    }
    // Filter by quarter and active status
    else if (args.quarter !== undefined && args.isActive !== undefined) {
      lessons = await ctx.db
        .query("curriculum_lessons")
        .withIndex("by_quarter", (q) =>
          q.eq("quarter", args.quarter!).eq("isActive", args.isActive!)
        )
        .collect();
    }
    // Get all lessons
    else {
      lessons = await ctx.db.query("curriculum_lessons").collect();

      // Apply isActive filter if needed
      if (args.isActive !== undefined) {
        lessons = lessons.filter((lesson) => lesson.isActive === args.isActive);
      }
    }

    // Fetch curriculum details for each lesson
    const lessonsWithCurriculum = await Promise.all(
      lessons.map(async (lesson) => {
        const curriculum = await ctx.db.get(lesson.curriculumId);
        return {
          ...lesson,
          curriculum: curriculum
            ? {
                _id: curriculum._id,
                name: curriculum.name,
                code: curriculum.code,
              }
            : null,
        };
      })
    );

    return lessonsWithCurriculum;
  },
});
