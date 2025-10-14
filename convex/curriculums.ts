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
    let curriculums;

    if (args.isActive !== undefined) {
      curriculums = await ctx.db
        .query("curriculums")
        .withIndex("by_active", (q) => q.eq("isActive", args.isActive!))
        .collect();
    } else {
      curriculums = await ctx.db.query("curriculums").collect();
    }

    // Calculate real metrics for each curriculum
    const curriculumsWithMetrics = await Promise.all(
      curriculums.map(async (curriculum) => {
        // Count lessons for this curriculum
        const lessons = await ctx.db
          .query("curriculum_lessons")
          .withIndex("by_curriculum_active", (q) =>
            q.eq("curriculumId", curriculum._id).eq("isActive", true)
          )
          .collect();

        const totalLessons = lessons.length;

        // Return curriculum with updated metrics
        return {
          ...curriculum,
          metrics: {
            totalLessons,
            assignedTeachers: curriculum.metrics?.assignedTeachers || 0,
            averageProgress: curriculum.metrics?.averageProgress || 0,
            lastUpdated: Date.now(),
          },
        };
      })
    );

    return curriculumsWithMetrics;
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

    // Create teacher_assignments and lesson_progress for each assigned teacher
    if (args.campusAssignments && args.campusAssignments.length > 0) {
      // Get current academic year
      const currentYear = new Date().getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;
      const now = Date.now();

      // Get all lessons for this curriculum
      const lessons = await ctx.db
        .query("curriculum_lessons")
        .withIndex("by_curriculum_active", (q) =>
          q.eq("curriculumId", curriculumId).eq("isActive", true)
        )
        .collect();

      // For each campus assignment
      for (const campusAssignment of args.campusAssignments) {
        // For each teacher in this campus
        for (const teacherId of campusAssignment.assignedTeachers) {
          // Check if teacher_assignment already exists (shouldn't, but be safe)
          const existingAssignments = await ctx.db
            .query("teacher_assignments")
            .withIndex("by_teacher_campus", (q) =>
              q.eq("teacherId", teacherId).eq("campusId", campusAssignment.campusId).eq("isActive", true)
            )
            .collect();

          const existingAssignment = existingAssignments.find(
            (a) => a.curriculumId === curriculumId
          );

          if (!existingAssignment) {
            // Create the teacher_assignment record
            const assignmentId = await ctx.db.insert("teacher_assignments", {
              teacherId,
              curriculumId,
              campusId: campusAssignment.campusId,
              academicYear,
              startDate: now,
              assignmentType: "primary",
              progressSummary: {
                totalLessons: lessons.length,
                completedLessons: 0,
                progressPercentage: 0,
                lastUpdated: now,
              },
              isActive: true,
              status: "active",
              assignedAt: now,
              assignedBy: args.createdBy,
            });

            // Create lesson_progress records for each lesson
            const gradeCodes = campusAssignment.gradeCodes || [];

            for (const lesson of lessons) {
              if (gradeCodes.length > 0) {
                // Multi-grade: create one progress record per grade
                for (const gradeCode of gradeCodes) {
                  await ctx.db.insert("lesson_progress", {
                    teacherId,
                    lessonId: lesson._id,
                    assignmentId,
                    curriculumId,
                    campusId: campusAssignment.campusId,
                    quarter: lesson.quarter,
                    gradeCode,
                    status: "not_started",
                    isVerified: false,
                    createdAt: now,
                  });
                }
              } else {
                // No grades specified yet: create single progress record without gradeCode
                await ctx.db.insert("lesson_progress", {
                  teacherId,
                  lessonId: lesson._id,
                  assignmentId,
                  curriculumId,
                  campusId: campusAssignment.campusId,
                  quarter: lesson.quarter,
                  status: "not_started",
                  isVerified: false,
                  createdAt: now,
                });
              }
            }
          }
        }
      }
    }

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
      campusAssignments: v.optional(v.union(
        v.array(v.object({
          campusId: v.id("campuses"),
          assignedTeachers: v.array(v.id("users")),
          gradeCodes: v.array(v.string()),
        })),
        v.null() // Allow null to clear the field
      )),
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
    // Get current curriculum to compare assignments
    const currentCurriculum = await ctx.db.get(args.curriculumId);
    if (!currentCurriculum) {
      throw new Error("Curriculum not found");
    }

    // Build update object
    const updateData: any = {
      updatedAt: Date.now(),
      updatedBy: args.updatedBy,
    };

    // Handle campusAssignments - if null, remove the field entirely
    if ('campusAssignments' in args.updates) {
      const oldAssignments = currentCurriculum.campusAssignments || [];
      const newAssignments = args.updates.campusAssignments || [];

      if (args.updates.campusAssignments === null) {
        updateData.campusAssignments = undefined; // This removes the field
        updateData.metrics = {
          totalLessons: 0,
          assignedTeachers: 0,
          averageProgress: 0,
          lastUpdated: Date.now(),
        };

        // Deactivate ALL teacher_assignments for this curriculum
        const allAssignments = await ctx.db
          .query("teacher_assignments")
          .withIndex("by_curriculum", (q) =>
            q.eq("curriculumId", args.curriculumId).eq("isActive", true)
          )
          .collect();

        for (const assignment of allAssignments) {
          await ctx.db.patch(assignment._id, {
            isActive: false,
            status: "cancelled",
            updatedAt: Date.now(),
          });
        }
      } else if (args.updates.campusAssignments !== undefined) {
        updateData.campusAssignments = args.updates.campusAssignments;
        const totalAssignedTeachers = args.updates.campusAssignments.reduce((acc, assignment) => {
          return acc + assignment.assignedTeachers.length;
        }, 0);
        updateData.metrics = {
          totalLessons: 0,
          assignedTeachers: totalAssignedTeachers,
          averageProgress: 0,
          lastUpdated: Date.now(),
        };

        // Sync teacher_assignments
        // 1. Get current year for new assignments
        const currentYear = new Date().getFullYear();
        const academicYear = `${currentYear}-${currentYear + 1}`;

        // 2. Build sets of (teacherId, campusId) pairs for comparison
        const oldPairs = new Set(
          oldAssignments.flatMap(ca =>
            ca.assignedTeachers.map(tid => `${tid}|${ca.campusId}`)
          )
        );

        const newPairs = new Set(
          newAssignments.flatMap(ca =>
            ca.assignedTeachers.map(tid => `${tid}|${ca.campusId}`)
          )
        );

        // 3. Find teachers to add (in new but not in old)
        const toAdd: Array<{ teacherId: string; campusId: string }> = [];
        for (const pair of newPairs) {
          if (!oldPairs.has(pair)) {
            const [teacherId, campusId] = pair.split('|');
            toAdd.push({ teacherId, campusId });
          }
        }

        // 4. Find teachers to remove (in old but not in new)
        const toRemove: Array<{ teacherId: string; campusId: string }> = [];
        for (const pair of oldPairs) {
          if (!newPairs.has(pair)) {
            const [teacherId, campusId] = pair.split('|');
            toRemove.push({ teacherId, campusId });
          }
        }

        // 5. Create new teacher_assignments
        const now = Date.now();

        // Get all lessons for this curriculum
        const lessons = await ctx.db
          .query("curriculum_lessons")
          .withIndex("by_curriculum_active", (q) =>
            q.eq("curriculumId", args.curriculumId).eq("isActive", true)
          )
          .collect();

        for (const { teacherId, campusId } of toAdd) {
          // Check if it already exists (shouldn't, but be safe)
          const existingAssignments = await ctx.db
            .query("teacher_assignments")
            .withIndex("by_teacher_campus", (q) =>
              q.eq("teacherId", teacherId as any).eq("campusId", campusId as any).eq("isActive", true)
            )
            .collect();

          const exists = existingAssignments.some(
            a => a.curriculumId === args.curriculumId
          );

          if (!exists) {
            // Create the teacher_assignment record
            const assignmentId = await ctx.db.insert("teacher_assignments", {
              teacherId: teacherId as any,
              curriculumId: args.curriculumId,
              campusId: campusId as any,
              academicYear,
              startDate: now,
              assignmentType: "primary",
              progressSummary: {
                totalLessons: lessons.length,
                completedLessons: 0,
                progressPercentage: 0,
                lastUpdated: now,
              },
              isActive: true,
              status: "active",
              assignedAt: now,
              assignedBy: args.updatedBy,
            });

            // Get gradeCodes for this campus assignment
            const campusAssignment = newAssignments.find(
              ca => ca.campusId === campusId
            );
            const gradeCodes = campusAssignment?.gradeCodes || [];

            // Create lesson_progress records for each lesson
            for (const lesson of lessons) {
              if (gradeCodes.length > 0) {
                // Multi-grade: create one progress record per grade
                for (const gradeCode of gradeCodes) {
                  await ctx.db.insert("lesson_progress", {
                    teacherId: teacherId as any,
                    lessonId: lesson._id,
                    assignmentId,
                    curriculumId: args.curriculumId,
                    campusId: campusId as any,
                    quarter: lesson.quarter,
                    gradeCode,
                    status: "not_started",
                    isVerified: false,
                    createdAt: now,
                  });
                }
              } else {
                // No grades specified yet: create single progress record without gradeCode
                await ctx.db.insert("lesson_progress", {
                  teacherId: teacherId as any,
                  lessonId: lesson._id,
                  assignmentId,
                  curriculumId: args.curriculumId,
                  campusId: campusId as any,
                  quarter: lesson.quarter,
                  status: "not_started",
                  isVerified: false,
                  createdAt: now,
                });
              }
            }
          }
        }

        // 6. Deactivate removed teacher_assignments
        for (const { teacherId, campusId } of toRemove) {
          const assignments = await ctx.db
            .query("teacher_assignments")
            .withIndex("by_teacher_campus", (q) =>
              q.eq("teacherId", teacherId as any).eq("campusId", campusId as any).eq("isActive", true)
            )
            .collect();

          const toDeactivate = assignments.find(
            a => a.curriculumId === args.curriculumId
          );

          if (toDeactivate) {
            await ctx.db.patch(toDeactivate._id, {
              isActive: false,
              status: "cancelled",
              updatedAt: Date.now(),
            });

            // Also deactivate all lesson_progress for this assignment
            const progressRecords = await ctx.db
              .query("lesson_progress")
              .withIndex("by_assignment_status", (q) =>
                q.eq("assignmentId", toDeactivate._id)
              )
              .collect();

            // Note: We don't actually delete lesson_progress, just mark assignment as inactive
            // This preserves historical data
          }
        }

        // 7. Handle grade changes for existing teachers
        // If grades changed for a campus assignment, update lesson_progress records
        for (const newAssignment of newAssignments) {
          const oldAssignment = oldAssignments.find(
            oa => oa.campusId === newAssignment.campusId
          );

          if (oldAssignment) {
            // Check if grades changed
            const oldGrades = new Set(oldAssignment.gradeCodes);
            const newGrades = new Set(newAssignment.gradeCodes);

            const gradesChanged = oldGrades.size !== newGrades.size ||
              [...oldGrades].some(g => !newGrades.has(g)) ||
              [...newGrades].some(g => !oldGrades.has(g));

            if (gradesChanged) {
              // For each teacher in this campus assignment
              for (const teacherId of newAssignment.assignedTeachers) {
                // Get the teacher_assignment
                const assignments = await ctx.db
                  .query("teacher_assignments")
                  .withIndex("by_teacher_campus", (q) =>
                    q.eq("teacherId", teacherId).eq("campusId", newAssignment.campusId).eq("isActive", true)
                  )
                  .collect();

                const assignment = assignments.find(
                  a => a.curriculumId === args.curriculumId
                );

                if (assignment) {
                  // Get all lessons for this curriculum
                  const lessons = await ctx.db
                    .query("curriculum_lessons")
                    .withIndex("by_curriculum_active", (q) =>
                      q.eq("curriculumId", args.curriculumId).eq("isActive", true)
                    )
                    .collect();

                  // Get existing lesson_progress for this assignment
                  const existingProgress = await ctx.db
                    .query("lesson_progress")
                    .withIndex("by_assignment_status", (q) =>
                      q.eq("assignmentId", assignment._id)
                    )
                    .collect();

                  // For each lesson, ensure progress records exist for all new grades
                  for (const lesson of lessons) {
                    if (newAssignment.gradeCodes.length > 0) {
                      // Multi-grade mode
                      for (const gradeCode of newAssignment.gradeCodes) {
                        // Check if progress record exists for this lesson + grade
                        const exists = existingProgress.some(
                          p => p.lessonId === lesson._id && p.gradeCode === gradeCode
                        );

                        if (!exists) {
                          // Create new progress record for this grade
                          await ctx.db.insert("lesson_progress", {
                            teacherId,
                            lessonId: lesson._id,
                            assignmentId: assignment._id,
                            curriculumId: args.curriculumId,
                            campusId: newAssignment.campusId,
                            quarter: lesson.quarter,
                            gradeCode,
                            status: "not_started",
                            isVerified: false,
                            createdAt: now,
                          });
                        }
                      }

                      // Remove progress records for grades that are no longer assigned
                      // (Optional: you might want to keep historical data instead)
                      // For now, we'll keep them but they won't be displayed in the UI
                    } else {
                      // Switched from multi-grade to single grade or no grades
                      const exists = existingProgress.some(
                        p => p.lessonId === lesson._id && !p.gradeCode
                      );

                      if (!exists && existingProgress.filter(p => p.lessonId === lesson._id).length === 0) {
                        // Create single progress record without grade
                        await ctx.db.insert("lesson_progress", {
                          teacherId,
                          lessonId: lesson._id,
                          assignmentId: assignment._id,
                          curriculumId: args.curriculumId,
                          campusId: newAssignment.campusId,
                          quarter: lesson.quarter,
                          status: "not_started",
                          isVerified: false,
                          createdAt: now,
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Add other updates
    if (args.updates.name !== undefined) updateData.name = args.updates.name;
    if (args.updates.code !== undefined) updateData.code = args.updates.code;
    if (args.updates.description !== undefined) updateData.description = args.updates.description;
    if (args.updates.numberOfQuarters !== undefined) updateData.numberOfQuarters = args.updates.numberOfQuarters;
    if (args.updates.resources !== undefined) updateData.resources = args.updates.resources;
    if (args.updates.status !== undefined) updateData.status = args.updates.status;

    await ctx.db.patch(args.curriculumId, updateData);
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

    let isNewTeacher = false;

    if (existingAssignmentIndex >= 0) {
      // Campus assignment exists, add teacher if not already there
      const assignment = campusAssignments[existingAssignmentIndex];
      if (!assignment.assignedTeachers.includes(args.teacherId)) {
        assignment.assignedTeachers.push(args.teacherId);
        campusAssignments[existingAssignmentIndex] = assignment;
        isNewTeacher = true;
      }
    } else {
      // Create new campus assignment with this teacher
      campusAssignments.push({
        campusId: args.campusId,
        assignedTeachers: [args.teacherId],
        gradeCodes: [],
      });
      isNewTeacher = true;
    }

    await ctx.db.patch(args.curriculumId, {
      campusAssignments,
    });

    // Create teacher_assignment record if this is a new teacher assignment
    if (isNewTeacher) {
      // Check if teacher_assignment already exists
      const existingAssignments = await ctx.db
        .query("teacher_assignments")
        .withIndex("by_teacher_campus", (q) =>
          q.eq("teacherId", args.teacherId).eq("campusId", args.campusId).eq("isActive", true)
        )
        .collect();

      const existingAssignment = existingAssignments.find(
        (a) => a.curriculumId === args.curriculumId
      );

      if (!existingAssignment) {
        // Get current academic year (you might want to make this configurable)
        const currentYear = new Date().getFullYear();
        const academicYear = `${currentYear}-${currentYear + 1}`;

        // Get the current user as assignedBy (or use a system user ID if needed)
        const identity = await ctx.auth.getUserIdentity();
        const currentUser = identity
          ? await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .first()
          : null;

        // Get curriculum to calculate total lessons
        const lessons = await ctx.db
          .query("curriculum_lessons")
          .withIndex("by_curriculum_active", (q) =>
            q.eq("curriculumId", args.curriculumId).eq("isActive", true)
          )
          .collect();

        const now = Date.now();

        // Create the teacher_assignment record
        const assignmentId = await ctx.db.insert("teacher_assignments", {
          teacherId: args.teacherId,
          curriculumId: args.curriculumId,
          campusId: args.campusId,
          academicYear,
          startDate: now,
          assignmentType: "primary",
          progressSummary: {
            totalLessons: lessons.length,
            completedLessons: 0,
            progressPercentage: 0,
            lastUpdated: now,
          },
          isActive: true,
          status: "active",
          assignedAt: now,
          assignedBy: currentUser?._id || args.teacherId, // Use current user or fallback to teacher
        });

        // Get gradeCodes from campus assignment for this campus
        const campusAssignment = campusAssignments.find(ca => ca.campusId === args.campusId);
        const gradeCodes = campusAssignment?.gradeCodes || [];

        // Create lesson_progress records for each lesson
        // If there are multiple grades, create one progress record per grade per lesson
        // If there are no grades yet, create one progress record per lesson (can be updated later)
        for (const lesson of lessons) {
          if (gradeCodes.length > 0) {
            // Multi-grade: create one progress record per grade
            for (const gradeCode of gradeCodes) {
              await ctx.db.insert("lesson_progress", {
                teacherId: args.teacherId,
                lessonId: lesson._id,
                assignmentId,
                curriculumId: args.curriculumId,
                campusId: args.campusId,
                quarter: lesson.quarter,
                gradeCode,
                status: "not_started",
                isVerified: false,
                createdAt: now,
              });
            }
          } else {
            // No grades specified yet: create single progress record without gradeCode
            await ctx.db.insert("lesson_progress", {
              teacherId: args.teacherId,
              lessonId: lesson._id,
              assignmentId,
              curriculumId: args.curriculumId,
              campusId: args.campusId,
              quarter: lesson.quarter,
              status: "not_started",
              isVerified: false,
              createdAt: now,
            });
          }
        }
      }
    }

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

    // Also deactivate the teacher_assignment record
    const assignments = await ctx.db
      .query("teacher_assignments")
      .withIndex("by_teacher_active", (q) =>
        q.eq("teacherId", args.teacherId).eq("isActive", true)
      )
      .collect();

    const assignmentToRemove = assignments.find(
      (a) => a.curriculumId === args.curriculumId
    );

    if (assignmentToRemove) {
      await ctx.db.patch(assignmentToRemove._id, {
        isActive: false,
        status: "cancelled",
        updatedAt: Date.now(),
      });
    }

    return args.curriculumId;
  },
});

/**
 * Get detailed campus assignments for a curriculum (with campus names and teacher details)
 */
export const getCurriculumCampusAssignments = query({
  args: {
    curriculumId: v.id("curriculums"),
  },
  handler: async (ctx, args) => {
    const curriculum = await ctx.db.get(args.curriculumId);
    if (!curriculum || !curriculum.campusAssignments) {
      return [];
    }

    // Get detailed information for each campus assignment
    const detailedAssignments = await Promise.all(
      curriculum.campusAssignments.map(async (assignment) => {
        // Get campus details
        const campus = await ctx.db.get(assignment.campusId);

        // Get teacher details
        const teachers = await Promise.all(
          assignment.assignedTeachers.map(async (teacherId) => {
            const teacher = await ctx.db.get(teacherId);
            return teacher ? {
              _id: teacher._id,
              fullName: teacher.fullName,
              email: teacher.email,
            } : null;
          })
        );

        // Get grade names from campus grades
        const gradeNames = campus?.grades
          ?.filter(g => assignment.gradeCodes.includes(g.code))
          .map(g => g.name) || [];

        return {
          campusId: assignment.campusId,
          campusName: campus?.name || "Unknown Campus",
          campusCode: campus?.code,
          teachers: teachers.filter(t => t !== null),
          gradeCodes: assignment.gradeCodes,
          gradeNames,
        };
      })
    );

    return detailedAssignments;
  },
});
