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
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("archived"),
      v.literal("deprecated")
    )),
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
      status: args.status || "draft",
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

/**
 * Get curriculums assigned to a teacher via campusAssignments
 */
export const getCurriculumsByTeacherNew = query({
  args: {
    teacherId: v.id("users"),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get all curriculums (filtered by isActive if specified)
    const allCurriculums = await ctx.db
      .query("curriculums")
      .filter((q) =>
        args.isActive !== undefined
          ? q.eq(q.field("isActive"), args.isActive)
          : true
      )
      .collect();

    // Filter curriculums where this teacher is assigned
    const assignedCurriculums = allCurriculums.filter(curriculum => {
      if (!curriculum.campusAssignments) return false;

      return curriculum.campusAssignments.some(assignment =>
        assignment.assignedTeachers.includes(args.teacherId)
      );
    });

    // Get detailed info for each curriculum
    const curriculumsWithDetails = await Promise.all(
      assignedCurriculums.map(async (curriculum) => {
        // Find which campus assignments include this teacher
        const teacherAssignments = curriculum.campusAssignments?.filter(ca =>
          ca.assignedTeachers.includes(args.teacherId)
        ) || [];

        // Get campus info
        const campusInfos = await Promise.all(
          teacherAssignments.map(async (assignment) => {
            const campus = await ctx.db.get(assignment.campusId);
            return {
              campusId: assignment.campusId,
              campusName: campus?.name || "Unknown",
              gradeCodes: assignment.gradeCodes,
            };
          })
        );

        // Get total lessons count
        const lessons = await ctx.db
          .query("curriculum_lessons")
          .withIndex("by_curriculum_active", (q) =>
            q.eq("curriculumId", curriculum._id).eq("isActive", true)
          )
          .collect();

        // For compatibility, create a combined response
        // If teacher is assigned to multiple campuses, we'll show the first one
        const firstAssignment = teacherAssignments[0];
        const firstCampus = campusInfos[0];

        // Try to get grade info from the first campus
        let gradeInfo = null;
        if (firstCampus && firstCampus.gradeCodes.length > 0) {
          const campus = await ctx.db.get(firstCampus.campusId);
          if (campus?.grades) {
            const firstGrade = campus.grades.find(g => g.code === firstCampus.gradeCodes[0]);
            if (firstGrade) {
              gradeInfo = {
                id: firstCampus.campusId, // Using campus ID as placeholder
                name: firstGrade.name,
                level: 0, // Placeholder
              };
            }
          }
        }

        return {
          ...curriculum,
          assignmentId: curriculum._id, // Using curriculum ID since no separate assignment
          assignmentType: "primary" as const, // Default type
          assignmentStatus: curriculum.status === "active" ? "active" as const : "pending" as const,
          grade: gradeInfo,
          lessonsCount: lessons.length,
          quarters: curriculum.numberOfQuarters,
          campusAssignments: campusInfos, // Include all campus assignments
          progressSummary: undefined,
        };
      })
    );

    return curriculumsWithDetails;
  },
});

/**
 * Add teacher to curriculum's campus assignments
 */
export const addTeacherToCurriculum = mutation({
  args: {
    curriculumId: v.id("curriculums"),
    teacherId: v.id("users"),
    campusId: v.id("campuses"),
  },
  handler: async (ctx, args) => {
    const curriculum = await ctx.db.get(args.curriculumId);
    if (!curriculum) {
      throw new Error("Curriculum not found");
    }

    const campusAssignments = curriculum.campusAssignments || [];

    // Find if there's already an assignment for this campus
    const existingAssignmentIndex = campusAssignments.findIndex(
      ca => ca.campusId === args.campusId
    );

    if (existingAssignmentIndex >= 0) {
      // Campus assignment exists, add teacher if not already there
      const assignment = campusAssignments[existingAssignmentIndex];
      if (!assignment.assignedTeachers.includes(args.teacherId)) {
        assignment.assignedTeachers.push(args.teacherId);
        campusAssignments[existingAssignmentIndex] = assignment;
      }
    } else {
      // Create new campus assignment with this teacher
      campusAssignments.push({
        campusId: args.campusId,
        assignedTeachers: [args.teacherId],
        gradeCodes: [],
      });
    }

    await ctx.db.patch(args.curriculumId, {
      campusAssignments,
    });

    return args.curriculumId;
  },
});

/**
 * Remove teacher from curriculum's campus assignments
 */
export const removeTeacherFromCurriculum = mutation({
  args: {
    curriculumId: v.id("curriculums"),
    teacherId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const curriculum = await ctx.db.get(args.curriculumId);
    if (!curriculum) {
      throw new Error("Curriculum not found");
    }

    const campusAssignments = curriculum.campusAssignments || [];

    // Remove teacher from all campus assignments, but keep the campus and grades
    const updatedAssignments = campusAssignments.map(assignment => ({
      ...assignment,
      assignedTeachers: assignment.assignedTeachers.filter(
        id => id !== args.teacherId
      ),
    }));

    await ctx.db.patch(args.curriculumId, {
      campusAssignments: updatedAssignments.length > 0 ? updatedAssignments : undefined,
    });

    return args.curriculumId;
  },
});
