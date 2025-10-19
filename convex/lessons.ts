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
 * Get lesson progress for a specific teacher and lesson
 * Returns all progress records (one per grade for multi-grade curriculums)
 */
export const getLessonProgress = query({
  args: {
    lessonId: v.id("curriculum_lessons"),
    teacherId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all progress records for this lesson (across all grades)
    const progressRecords = await ctx.db
      .query("lesson_progress")
      .withIndex("by_teacher_lesson", (q) =>
        q.eq("teacherId", args.teacherId).eq("lessonId", args.lessonId)
      )
      .collect();

    return progressRecords;
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
    gradeCode: v.optional(v.string()), // Legacy: single grade (deprecated)
    gradeCodes: v.optional(v.array(v.string())), // New: multiple grades
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

    // Auto-calculate orderInQuarter: find max order for this curriculum+quarter and add 1
    const existingLessons = await ctx.db
      .query("curriculum_lessons")
      .withIndex("by_curriculum_quarter", (q) =>
        q.eq("curriculumId", args.curriculumId).eq("quarter", args.quarter)
      )
      .collect();

    const maxOrder = existingLessons.reduce(
      (max, lesson) => Math.max(max, lesson.orderInQuarter),
      0
    );
    const newOrder = maxOrder + 1;

    const lessonId = await ctx.db.insert("curriculum_lessons", {
      curriculumId: args.curriculumId,
      title: args.title,
      description: args.description,
      quarter: args.quarter,
      orderInQuarter: newOrder,
      gradeCode: args.gradeCode, // Keep for backward compatibility
      gradeCodes: args.gradeCodes, // New field for multiple grades
      resources: args.resources,
      objectives: args.objectives,
      isActive: true,
      isMandatory: args.isMandatory ?? true,
      createdAt: Date.now(),
      createdBy: args.createdBy,
    });

    // Create lesson_progress records for all existing teacher_assignments
    // for this curriculum
    const teacherAssignments = await ctx.db
      .query("teacher_assignments")
      .withIndex("by_curriculum", (q) =>
        q.eq("curriculumId", args.curriculumId).eq("isActive", true)
      )
      .collect();

    const now = Date.now();

    for (const assignment of teacherAssignments) {
      // Get the campus assignment to find gradeCodes
      const campusAssignment = curriculum.campusAssignments?.find(
        ca => ca.campusId === assignment.campusId
      );
      const gradeCodes = campusAssignment?.gradeCodes || [];

      if (gradeCodes.length > 0) {
        // Multi-grade: create one progress record per grade
        for (const gradeCode of gradeCodes) {
          await ctx.db.insert("lesson_progress", {
            teacherId: assignment.teacherId,
            lessonId,
            assignmentId: assignment._id,
            curriculumId: args.curriculumId,
            campusId: assignment.campusId,
            quarter: args.quarter,
            gradeCode,
            status: "not_started",
            isVerified: false,
            createdAt: now,
          });
        }
      } else {
        // No grades specified: create single progress record without gradeCode
        await ctx.db.insert("lesson_progress", {
          teacherId: assignment.teacherId,
          lessonId,
          assignmentId: assignment._id,
          curriculumId: args.curriculumId,
          campusId: assignment.campusId,
          quarter: args.quarter,
          status: "not_started",
          isVerified: false,
          createdAt: now,
        });
      }

      // Update the assignment's progressSummary
      await ctx.db.patch(assignment._id, {
        progressSummary: {
          totalLessons: (assignment.progressSummary?.totalLessons || 0) + 1,
          completedLessons: assignment.progressSummary?.completedLessons || 0,
          progressPercentage: assignment.progressSummary?.progressPercentage || 0,
          lastUpdated: now,
        },
      });
    }

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
      gradeCode: v.optional(v.string()), // Legacy
      gradeCodes: v.optional(v.array(v.string())), // New: multiple grades
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
    // Get the lesson first to know which curriculum it belongs to
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson) {
      throw new Error("Lesson not found");
    }

    // Get all lesson_progress records for this lesson
    // Since there's no index by lessonId alone, we need to collect all and filter
    const allProgressRecords = await ctx.db
      .query("lesson_progress")
      .collect();
    
    const progressRecords = allProgressRecords.filter(
      (progress) => progress.lessonId === args.lessonId
    );

    // Delete all evidence files from storage and progress records
    for (const progress of progressRecords) {
      // Delete photo evidence if exists
      if (progress.evidencePhotoStorageId) {
        try {
          await ctx.storage.delete(progress.evidencePhotoStorageId);
        } catch (error) {
          // File might already be deleted, continue
          console.error("Error deleting photo evidence:", error);
        }
      }

      // Delete document evidence if exists
      if (progress.evidenceDocumentStorageId) {
        try {
          await ctx.storage.delete(progress.evidenceDocumentStorageId);
        } catch (error) {
          // File might already be deleted, continue
          console.error("Error deleting document evidence:", error);
        }
      }

      // Delete the progress record
      await ctx.db.delete(progress._id);
    }

    // Get all teacher_assignments for this curriculum
    const teacherAssignments = await ctx.db
      .query("teacher_assignments")
      .withIndex("by_curriculum", (q) =>
        q.eq("curriculumId", lesson.curriculumId).eq("isActive", true)
      )
      .collect();

    const now = Date.now();

    // Update each teacher_assignment to decrement totalLessons
    for (const assignment of teacherAssignments) {
      const newTotalLessons = Math.max(
        (assignment.progressSummary?.totalLessons || 0) - 1,
        0
      );

      await ctx.db.patch(assignment._id, {
        progressSummary: {
          totalLessons: newTotalLessons,
          completedLessons: assignment.progressSummary?.completedLessons || 0,
          progressPercentage: assignment.progressSummary?.progressPercentage || 0,
          lastUpdated: now,
        },
      });
    }

    // Delete the lesson itself
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

/**
 * Generate upload URL for lesson evidence
 * This is used to upload files directly to Convex storage
 */
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

/**
 * Save lesson evidence after file upload
 * Updates the lesson progress with the storage ID and marks as completed
 */
export const saveLessonEvidence = mutation({
  args: {
    lessonId: v.id("curriculum_lessons"),
    storageId: v.id("_storage"),
    teacherId: v.id("users"),
    assignmentId: v.id("teacher_assignments"),
    gradeCode: v.optional(v.string()), // Grade code (e.g., "PK1", "K1") for multi-grade support
    groupCode: v.optional(v.string()), // Group code (e.g., "01-1", "01-2") for multi-group support
  },
  handler: async (ctx, args) => {
    // Get the assignment to get curriculum and campus info
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Get the lesson to get quarter info
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson) {
      throw new Error("Lesson not found");
    }

    // Check if progress record already exists
    // Use appropriate index based on whether groupCode or gradeCode is provided
    let existingProgress;
    if (args.groupCode) {
      existingProgress = await ctx.db
        .query("lesson_progress")
        .withIndex("by_teacher_lesson_group", (q) =>
          q.eq("teacherId", args.teacherId)
            .eq("lessonId", args.lessonId)
            .eq("groupCode", args.groupCode)
        )
        .first();
    } else if (args.gradeCode) {
      existingProgress = await ctx.db
        .query("lesson_progress")
        .withIndex("by_teacher_lesson_grade", (q) =>
          q.eq("teacherId", args.teacherId)
            .eq("lessonId", args.lessonId)
            .eq("gradeCode", args.gradeCode)
        )
        .first();
    } else {
      existingProgress = await ctx.db
        .query("lesson_progress")
        .withIndex("by_teacher_lesson", (q) =>
          q.eq("teacherId", args.teacherId).eq("lessonId", args.lessonId)
        )
        .filter(q => q.eq(q.field("gradeCode"), undefined))
        .first();
    }

    if (existingProgress) {
      // Update existing progress
      await ctx.db.patch(existingProgress._id, {
        evidenceDocumentStorageId: args.storageId,
        status: "completed",
        completedAt: Date.now(),
        updatedAt: Date.now(),
      });

      return existingProgress._id;
    } else {
      // Extract gradeCode from groupCode if not provided
      const gradeCode = args.gradeCode || (args.groupCode ? args.groupCode.split('-')[0] : undefined);

      // Create new progress record
      const progressId = await ctx.db.insert("lesson_progress", {
        teacherId: args.teacherId,
        lessonId: args.lessonId,
        assignmentId: args.assignmentId,
        curriculumId: assignment.curriculumId,
        campusId: assignment.campusId,
        gradeCode: gradeCode, // Store gradeCode (extracted from groupCode if needed)
        groupCode: args.groupCode, // Store groupCode if provided
        quarter: lesson.quarter,
        status: "completed",
        evidenceDocumentStorageId: args.storageId,
        completedAt: Date.now(),
        isVerified: false,
        createdAt: Date.now(),
      });

      return progressId;
    }
  },
});

/**
 * Delete lesson evidence
 * Removes the uploaded file from storage and updates the lesson progress
 */
export const deleteLessonEvidence = mutation({
  args: {
    lessonId: v.id("curriculum_lessons"),
    teacherId: v.id("users"),
    gradeCode: v.optional(v.string()), // Grade code for multi-grade support
    groupCode: v.optional(v.string()), // Group code for multi-group support
  },
  handler: async (ctx, args) => {
    // Find the progress record
    let progressRecord;
    if (args.groupCode) {
      // Multi-group: find specific group progress
      progressRecord = await ctx.db
        .query("lesson_progress")
        .withIndex("by_teacher_lesson_group", (q) =>
          q.eq("teacherId", args.teacherId)
            .eq("lessonId", args.lessonId)
            .eq("groupCode", args.groupCode)
        )
        .first();
    } else if (args.gradeCode) {
      // Multi-grade: find specific grade progress
      progressRecord = await ctx.db
        .query("lesson_progress")
        .withIndex("by_teacher_lesson_grade", (q) =>
          q.eq("teacherId", args.teacherId)
            .eq("lessonId", args.lessonId)
            .eq("gradeCode", args.gradeCode)
        )
        .first();
    } else {
      // Single-grade: find progress without gradeCode
      progressRecord = await ctx.db
        .query("lesson_progress")
        .withIndex("by_teacher_lesson", (q) =>
          q.eq("teacherId", args.teacherId).eq("lessonId", args.lessonId)
        )
        .filter(q => q.eq(q.field("gradeCode"), undefined))
        .first();
    }

    if (!progressRecord) {
      throw new Error("Progress record not found");
    }

    // Delete the file from storage if it exists
    if (progressRecord.evidenceDocumentStorageId) {
      await ctx.storage.delete(progressRecord.evidenceDocumentStorageId);
    }
    if (progressRecord.evidencePhotoStorageId) {
      await ctx.storage.delete(progressRecord.evidencePhotoStorageId);
    }

    // Update the progress record to remove evidence and reset status
    await ctx.db.patch(progressRecord._id, {
      evidenceDocumentStorageId: undefined,
      evidencePhotoStorageId: undefined,
      status: "not_started",
      completedAt: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Reorder lessons within a quarter
 * Updates the orderInQuarter for multiple lessons after a drag & drop operation
 */
export const reorderLessons = mutation({
  args: {
    curriculumId: v.id("curriculums"),
    quarter: v.number(),
    lessonOrders: v.array(
      v.object({
        lessonId: v.id("curriculum_lessons"),
        newOrder: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Validate that all lessons belong to the specified curriculum and quarter
    for (const { lessonId } of args.lessonOrders) {
      const lesson = await ctx.db.get(lessonId);
      if (!lesson) {
        throw new Error(`Lesson ${lessonId} not found`);
      }
      if (lesson.curriculumId !== args.curriculumId) {
        throw new Error(`Lesson ${lessonId} does not belong to the specified curriculum`);
      }
      if (lesson.quarter !== args.quarter) {
        throw new Error(`Lesson ${lessonId} does not belong to quarter ${args.quarter}`);
      }
    }

    // Update each lesson's orderInQuarter
    for (const { lessonId, newOrder } of args.lessonOrders) {
      await ctx.db.patch(lessonId, {
        orderInQuarter: newOrder,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});
