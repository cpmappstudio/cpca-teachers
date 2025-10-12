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
    campusAssignments: v.optional(v.array(v.object({
      campusId: v.id("campuses"),
      assignedTeachers: v.array(v.id("users")),
      gradeCodes: v.array(v.string()),
    }))),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Calculate total assigned teachers across all campuses
    const totalAssignedTeachers = args.campusAssignments?.reduce((acc, assignment) => {
      return acc + assignment.assignedTeachers.length;
    }, 0) || 0;

    const curriculumId = await ctx.db.insert("curriculums", {
      name: args.name,
      code: args.code,
      description: args.description,
      numberOfQuarters: args.numberOfQuarters,
      resources: args.resources,
      campusAssignments: args.campusAssignments,
      isActive: true,
      status: "draft",
      createdAt: Date.now(),
      createdBy: args.createdBy,
      metrics: {
        totalLessons: 0,
        assignedTeachers: totalAssignedTeachers,
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
      campusAssignments: v.optional(v.array(v.object({
        campusId: v.id("campuses"),
        assignedTeachers: v.array(v.id("users")),
        gradeCodes: v.array(v.string()),
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
    // Update metrics if campusAssignments changed
    let metricsUpdate = {};
    if (args.updates.campusAssignments !== undefined) {
      const totalAssignedTeachers = args.updates.campusAssignments?.reduce((acc, assignment) => {
        return acc + assignment.assignedTeachers.length;
      }, 0) || 0;

      metricsUpdate = {
        metrics: {
          totalLessons: 0,
          assignedTeachers: totalAssignedTeachers,
          averageProgress: 0,
          lastUpdated: Date.now(),
        },
      };
    }

    await ctx.db.patch(args.curriculumId, {
      ...args.updates,
      ...metricsUpdate,
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

/**
 * Get lessons by curriculum
 */
export const getLessonsByCurriculum = query({
  args: {
    curriculumId: v.id("curriculums"),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("curriculum_lessons")
      .withIndex("by_curriculum_active", (q) =>
        q.eq("curriculumId", args.curriculumId).eq("isActive", args.isActive ?? true)
      )
      .collect();
  },
});

/**
 * Get curriculums assigned to a teacher
 */
export const getCurriculumsByTeacher = query({
  args: {
    teacherId: v.id("users"),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get teacher assignments
    const assignments = await ctx.db
      .query("teacher_assignments")
      .withIndex("by_teacher_active", (q) =>
        q.eq("teacherId", args.teacherId).eq("isActive", args.isActive ?? true)
      )
      .collect();

    // Get curriculum details for each assignment
    const curriculumsWithDetails = await Promise.all(
      assignments.map(async (assignment) => {
        const curriculum = await ctx.db.get(assignment.curriculumId);
        if (!curriculum) return null;

        // Get grade info if gradeId exists
        let gradeInfo = null;
        if (assignment.gradeId) {
          const grade = await ctx.db.get(assignment.gradeId);
          gradeInfo = grade ? {
            id: grade._id,
            name: grade.name,
            level: grade.level,
          } : null;
        }

        // Get total lessons count
        const lessons = await ctx.db
          .query("curriculum_lessons")
          .withIndex("by_curriculum_active", (q) =>
            q.eq("curriculumId", assignment.curriculumId).eq("isActive", true)
          )
          .collect();

        return {
          ...curriculum,
          assignmentId: assignment._id,
          assignmentType: assignment.assignmentType,
          assignmentStatus: assignment.status,
          grade: gradeInfo,
          lessonsCount: lessons.length,
          quarters: curriculum.numberOfQuarters,
          progressSummary: assignment.progressSummary,
        };
      })
    );

    // Filter out nulls and return
    return curriculumsWithDetails.filter((c) => c !== null);
  },
});
