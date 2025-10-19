import { v, Validator } from "convex/values";
import { mutation, query, internalMutation, QueryCtx, action } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Tipo para los datos de usuario de Clerk
type UserJSON = {
  id: string;
  email_addresses?: Array<{ email_address: string }>;
  first_name?: string;
  last_name?: string;
  image_url?: string;
  [key: string]: any;
};

/**
 * Get current user by Clerk ID
 */
export const getCurrentUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    return user;
  },
});

/**
 * Get user role by Clerk ID
 */
export const getUserRole = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    return user?.role || null;
  },
});

/**
 * Get user by ID
 */
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Check if email is already in use
 */
export const checkEmailExists = query({
  args: {
    email: v.string(),
    excludeUserId: v.optional(v.id("users")), // Para excluir el usuario actual al editar
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    // Si encontramos un usuario y no es el que estamos editando
    if (user && (!args.excludeUserId || user._id !== args.excludeUserId)) {
      return true; // Email ya existe
    }

    return false; // Email disponible
  },
});

/**
 * Create or update user from Clerk webhook
 */
export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    role: v.optional(v.union(
      v.literal("teacher"),
      v.literal("admin"),
      v.literal("superadmin")
    )),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    const userData = {
      clerkId: args.clerkId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      fullName: `${args.firstName} ${args.lastName}`,
      role: args.role || "teacher" as const,
      isActive: true,
      status: "active" as const,
      updatedAt: Date.now(),
    };

    if (existingUser) {
      await ctx.db.patch(existingUser._id, userData);
      return existingUser._id;
    } else {
      const newUserId = await ctx.db.insert("users", {
        ...userData,
        createdAt: Date.now(),
      });
      return newUserId;
    }
  },
});

/**
 * Get all users with optional filtering
 */
export const getUsers = query({
  args: {
    role: v.optional(v.union(
      v.literal("teacher"),
      v.literal("admin"),
      v.literal("superadmin")
    )),
    campusId: v.optional(v.id("campuses")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let users: Doc<"users">[];

    if (args.role) {
      users = await ctx.db
        .query("users")
        .withIndex("by_role_active", (q) =>
          q.eq("role", args.role!).eq("isActive", args.isActive ?? true)
        )
        .collect();
    } else if (args.campusId) {
      users = await ctx.db
        .query("users")
        .withIndex("by_campus_active", (q) =>
          q.eq("campusId", args.campusId!).eq("isActive", args.isActive ?? true)
        )
        .collect();
    } else {
      // Default: get all users
      users = await ctx.db.query("users").collect();
    }

    // If requesting teachers, calculate real progress based on assignments (multi-grade aware)
    if (args.role === "teacher") {
      const usersWithProgress = await Promise.all(
        users.map(async (user) => {
          // Get all active assignments for this teacher
          const assignments = await ctx.db
            .query("teacher_assignments")
            .withIndex("by_teacher_active", (q) =>
              q.eq("teacherId", user._id).eq("isActive", true)
            )
            .collect();

          if (assignments.length === 0) {
            return {
              ...user,
              progressMetrics: {
                totalLessons: 0,
                completedLessons: 0,
                progressPercentage: 0,
                lastUpdated: Date.now(),
              },
            };
          }

          // Calculate progress percentage per assignment, then average
          const assignmentProgressPercentages: number[] = [];
          let totalLessonsSum = 0;
          let completedLessonsSum = 0;

          for (const assignment of assignments) {
            // Get curriculum
            const curriculum = await ctx.db.get(assignment.curriculumId);
            if (!curriculum) continue;

            // Get campus to access grades
            const campus = await ctx.db.get(assignment.campusId);

            // Get grade codes from curriculum campus assignments
            const campusAssignment = curriculum.campusAssignments?.find(
              ca => ca.campusId === assignment.campusId
            );
            const gradeCodes = campusAssignment?.gradeCodes || [];

            // Get assigned grades for this teacher
            const assignedGrades = assignment.assignedGrades || gradeCodes;

            // Get grades from campus.grades - ONLY the ones assigned to this teacher
            const grades = campus?.grades
              ?.filter(g => assignedGrades.includes(g.code))
              .map(g => ({
                id: g.code,
                name: g.name,
                code: g.code,
                level: g.level,
              })) || [];

            // Get all lessons for this curriculum
            const allLessons = await ctx.db
              .query("curriculum_lessons")
              .withIndex("by_curriculum_active", (q) =>
                q.eq("curriculumId", curriculum._id).eq("isActive", true)
              )
              .collect();

            // Filter lessons by assigned grades (same logic as getAssignmentLessonProgress)
            const lessons = allLessons.filter(lesson => {
              if (lesson.gradeCodes && lesson.gradeCodes.length > 0) {
                return lesson.gradeCodes.some(gradeCode => assignedGrades.includes(gradeCode));
              }
              if (lesson.gradeCode) {
                return assignedGrades.includes(lesson.gradeCode);
              }
              return true; // Include lessons without grade restrictions
            });

            const assignmentTotalLessons = lessons.length;

            // Get progress records for this specific assignment
            const progressRecords = await ctx.db
              .query("lesson_progress")
              .withIndex("by_assignment_status", (q) =>
                q.eq("assignmentId", assignment._id)
              )
              .collect();

            // Calculate completion percentage using the SAME method as overallProgress
            // This sums up the completionPercentage of each lesson
            const assignedGroupCodes = assignment.assignedGroupCodes || [];
            const hasGroups = assignedGroupCodes.length > 0;

            let totalCompletionScore = 0;

            for (const lesson of lessons) {
              const lessonProgressRecords = progressRecords.filter(
                p => p.lessonId === lesson._id
              );

              let lessonCompletionPercentage = 0;

              if (hasGroups) {
                // Group-based: calculate percentage completion (same as getAssignmentLessonProgress)
                const completedGroups = lessonProgressRecords.filter(p =>
                  p.groupCode &&
                  assignedGroupCodes.includes(p.groupCode) &&
                  p.status === "completed" &&
                  (p.evidenceDocumentStorageId || p.evidencePhotoStorageId)
                ).length;

                const totalGroups = assignedGroupCodes.length;
                lessonCompletionPercentage = totalGroups > 0
                  ? (completedGroups / totalGroups) * 100
                  : 0;
              } else {
                // Legacy multi-grade: calculate percentage completion
                const completedGrades = lessonProgressRecords.filter(p =>
                  p.status === "completed" &&
                  (p.evidenceDocumentStorageId || p.evidencePhotoStorageId)
                ).length;

                const totalGrades = grades.length || 1;
                lessonCompletionPercentage = totalGrades > 0
                  ? (completedGrades / totalGrades) * 100
                  : 0;
              }

              totalCompletionScore += lessonCompletionPercentage;
            }

            // Calculate average percentage for this assignment (same as overallProgress)
            const assignmentPercentage = assignmentTotalLessons > 0
              ? Math.round(totalCompletionScore / assignmentTotalLessons)
              : 0;

            assignmentProgressPercentages.push(assignmentPercentage);
            totalLessonsSum += assignmentTotalLessons;
            // For completedLessonsSum, count lessons that are 100% complete
            completedLessonsSum += lessons.filter((lesson) => {
              const lessonProgressRecords = progressRecords.filter(
                p => p.lessonId === lesson._id
              );
              if (hasGroups) {
                const completedGroups = lessonProgressRecords.filter(p =>
                  p.groupCode &&
                  assignedGroupCodes.includes(p.groupCode) &&
                  p.status === "completed" &&
                  (p.evidenceDocumentStorageId || p.evidencePhotoStorageId)
                ).length;
                return completedGroups === assignedGroupCodes.length;
              } else {
                const completedGrades = lessonProgressRecords.filter(p =>
                  p.status === "completed" &&
                  (p.evidenceDocumentStorageId || p.evidencePhotoStorageId)
                ).length;
                return completedGrades === (grades.length || 1);
              }
            }).length;
          }

          // Calculate average progress percentage across all assignments
          const progressPercentage = assignmentProgressPercentages.length > 0
            ? Math.round(assignmentProgressPercentages.reduce((a, b) => a + b, 0) / assignmentProgressPercentages.length)
            : 0;

          // Update progressMetrics on the user object
          return {
            ...user,
            progressMetrics: {
              totalLessons: totalLessonsSum,
              completedLessons: completedLessonsSum,
              progressPercentage, // Average percentage across assignments
              lastUpdated: Date.now(),
            },
          };
        })
      );

      return usersWithProgress;
    }

    // For non-teachers, return as-is
    return users;
  },
});

/**
 * Update user profile
 */
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    updates: v.object({
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      avatarStorageId: v.optional(v.union(v.id("_storage"), v.null())), // Allow null to delete image
      campusId: v.optional(v.union(v.id("campuses"), v.null())), // Allow null to unassign campus
      role: v.optional(v.union(
        v.literal("teacher"),
        v.literal("admin"),
        v.literal("superadmin")
      )),
      status: v.optional(v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("on_leave"),
        v.literal("terminated")
      )),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updates: any = { ...args.updates, updatedAt: Date.now() };

    // Track if campus changed to update metrics
    const oldCampusId = user.campusId;
    const newCampusId = updates.campusId;
    const campusChanged = oldCampusId !== newCampusId;

    // Convert null to undefined for Convex schema compatibility
    if (updates.avatarStorageId === null) {
      updates.avatarStorageId = undefined;
    }
    if (updates.campusId === null) {
      updates.campusId = undefined;
    }

    if (args.updates.firstName || args.updates.lastName) {
      if (user) {
        updates.fullName = `${args.updates.firstName || user.firstName} ${args.updates.lastName || user.lastName}`;
      }
    }

    await ctx.db.patch(args.userId, updates);

    // Update campus metrics if campus assignment changed
    if (campusChanged && user.role === "teacher") {
      // Update old campus metrics if exists
      if (oldCampusId) {
        const oldCampus = await ctx.db.get(oldCampusId);
        if (oldCampus && "metrics" in oldCampus) {
          const teachers = await ctx.db
            .query("users")
            .withIndex("by_campus_active", (q) =>
              q.eq("campusId", oldCampusId).eq("isActive", true)
            )
            .filter((q) => q.eq(q.field("role"), "teacher"))
            .collect();

          const totalTeachers = teachers.length;
          const activeTeachers = teachers.filter((t) => t.status === "active").length;

          await ctx.db.patch(oldCampusId, {
            metrics: {
              totalTeachers,
              activeTeachers,
              averageProgress: oldCampus.metrics?.averageProgress || 0,
              lastUpdated: Date.now(),
            },
          });
        }
      }

      // Update new campus metrics if exists
      if (newCampusId) {
        const newCampus = await ctx.db.get(newCampusId);
        if (newCampus && "metrics" in newCampus) {
          const teachers = await ctx.db
            .query("users")
            .withIndex("by_campus_active", (q) =>
              q.eq("campusId", newCampusId).eq("isActive", true)
            )
            .filter((q) => q.eq(q.field("role"), "teacher"))
            .collect();

          const totalTeachers = teachers.length;
          const activeTeachers = teachers.filter((t) => t.status === "active").length;

          await ctx.db.patch(newCampusId, {
            metrics: {
              totalTeachers,
              activeTeachers,
              averageProgress: newCampus.metrics?.averageProgress || 0,
              lastUpdated: Date.now(),
            },
          });
        }
      }
    }
  },
});

/**
 * Update user profile and sync with Clerk
 * Use this instead of updateUser when you want to sync changes to Clerk
 */
export const updateUserWithClerk = action({
  args: {
    userId: v.id("users"),
    updates: v.object({
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      avatarStorageId: v.optional(v.union(v.id("_storage"), v.null())), // Allow null to delete image
      campusId: v.optional(v.union(v.id("campuses"), v.null())), // Allow null to unassign campus
      status: v.optional(v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("on_leave"),
        v.literal("terminated")
      )),
    }),
  },
  handler: async (ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;

    if (!clerkSecretKey) {
      throw new Error("CLERK_SECRET_KEY not configured in environment variables");
    }

    // Get the user to find their Clerk ID
    const user = await ctx.runQuery(api.users.getUser, { userId: args.userId });

    if (!user) {
      throw new Error("User not found");
    }

    // Don't sync if user has temporary Clerk ID
    if (user.clerkId.startsWith("temp_")) {
      // Just update in Convex
      await ctx.runMutation(api.users.updateUser, { userId: args.userId, updates: args.updates });
      return;
    }

    try {
      // Prepare Clerk update payload for basic fields and metadata
      const clerkUpdates: any = {};
      const publicMetadataUpdates: any = {};

      if (args.updates.firstName) {
        clerkUpdates.first_name = args.updates.firstName;
      }
      if (args.updates.lastName) {
        clerkUpdates.last_name = args.updates.lastName;
      }

      // Update public_metadata with new values
      if (args.updates.campusId !== undefined) {
        publicMetadataUpdates.campusId = args.updates.campusId;
      }
      if (args.updates.phone !== undefined) {
        publicMetadataUpdates.phone = args.updates.phone;
      }
      if (args.updates.status !== undefined) {
        publicMetadataUpdates.status = args.updates.status;
      }
      if (args.updates.avatarStorageId !== undefined) {
        publicMetadataUpdates.avatarStorageId = args.updates.avatarStorageId;
      }

      // Add public_metadata to updates if there are changes
      if (Object.keys(publicMetadataUpdates).length > 0) {
        // First get current public_metadata to merge with new values
        const currentUserResponse = await fetch(`https://api.clerk.com/v1/users/${user.clerkId}`, {
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
          },
        });

        if (currentUserResponse.ok) {
          const currentUser = await currentUserResponse.json();
          clerkUpdates.public_metadata = {
            ...currentUser.public_metadata,
            ...publicMetadataUpdates,
          };
        } else {
          // If we can't get current metadata, just set what we have
          clerkUpdates.public_metadata = publicMetadataUpdates;
        }
      }

      // Update basic fields in Clerk if there are changes
      if (Object.keys(clerkUpdates).length > 0) {
        const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${user.clerkId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(clerkUpdates),
        });

        if (!clerkResponse.ok) {
          const errorData = await clerkResponse.json();
          console.error("Failed to update user in Clerk:", errorData);
          throw new Error(`Failed to update user in Clerk: ${errorData.errors?.[0]?.message || "Unknown error"}`);
        }

      }

      // Update profile image in Clerk if changed or deleted
      if (args.updates.avatarStorageId !== undefined) {
        if (args.updates.avatarStorageId === null) {
          // Delete image from Clerk
          try {
            const deleteImageResponse = await fetch(
              `https://api.clerk.com/v1/users/${user.clerkId}/profile_image`,
              {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${clerkSecretKey}`,
                },
              }
            );

          } catch (imageError) {
            console.error("Error deleting image from Clerk:", imageError);
            // No lanzar error - continuar con la actualización
          }
        } else {
          // Upload new image to Clerk
          try {
            const imageUrl = await ctx.storage.getUrl(args.updates.avatarStorageId);


            if (imageUrl) {
              // Download the image from Convex storage
              const imageResponse = await fetch(imageUrl);
              const imageBlob = await imageResponse.blob();

              // Upload to Clerk using multipart/form-data
              const formData = new FormData();
              formData.append('file', imageBlob, 'avatar.png');

              const uploadImageResponse = await fetch(
                `https://api.clerk.com/v1/users/${user.clerkId}/profile_image`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${clerkSecretKey}`,
                  },
                  body: formData,
                }
              );
            }
          } catch (imageError) {
            console.error("Error updating image in Clerk:", imageError);
            // No lanzar error - continuar con la actualización
          }
        }
      }

      // Update in Convex
      await ctx.runMutation(api.users.updateUser, { userId: args.userId, updates: args.updates });

    } catch (error) {
      console.error("Error updating user with Clerk:", error);
      throw error;
    }
  },
});

/**
 * Remove teacher from campus
 */
export const removeTeacherFromCampus = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get the user to access their current campus
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const oldCampusId = user.campusId;

    // Remove campus assignment
    await ctx.db.patch(args.userId, {
      campusId: undefined,
      updatedAt: Date.now(),
    });

    // Update old campus metrics if the user was a teacher
    if (oldCampusId && user.role === "teacher") {
      const oldCampus = await ctx.db.get(oldCampusId);
      if (oldCampus && "metrics" in oldCampus) {
        const teachers = await ctx.db
          .query("users")
          .withIndex("by_campus_active", (q) =>
            q.eq("campusId", oldCampusId).eq("isActive", true)
          )
          .filter((q) => q.eq(q.field("role"), "teacher"))
          .collect();

        const totalTeachers = teachers.length;
        const activeTeachers = teachers.filter((t) => t.status === "active").length;

        await ctx.db.patch(oldCampusId, {
          metrics: {
            totalTeachers,
            activeTeachers,
            averageProgress: oldCampus.metrics?.averageProgress || 0,
            lastUpdated: Date.now(),
          },
        });
      }
    }
  },
});

/**
 * Generate upload URL for user avatar
 */
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

/**
 * Get user avatar URL from storage
 */
export const getAvatarUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Delete user avatar
 * Removes the avatar from storage and clears the avatarStorageId field
 */
export const deleteUserAvatar = mutation({
  args: {
    userId: v.id("users"),
    updatedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get the user to find the current avatar storage ID
    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Delete the avatar from storage if it exists
    if (user.avatarStorageId) {
      try {
        await ctx.storage.delete(user.avatarStorageId);
      } catch (error) {
        // File might already be deleted, just log and continue
        console.warn("Avatar storage file not found, might already be deleted:", user.avatarStorageId);
      }
    }

    // Clear the avatarStorageId field
    await ctx.db.patch(args.userId, {
      avatarStorageId: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Create new teacher
 */
export const createTeacher = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    campusId: v.optional(v.id("campuses")),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("on_leave"),
      v.literal("terminated")
    )),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Generate a temporary clerkId for teachers created manually
    // This will be replaced when they first sign in via Clerk
    const tempClerkId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    const userId = await ctx.db.insert("users", {
      clerkId: tempClerkId,
      firstName: args.firstName,
      lastName: args.lastName,
      fullName: `${args.firstName} ${args.lastName}`,
      email: args.email,
      phone: args.phone,
      avatarStorageId: args.avatarStorageId,
      campusId: args.campusId,
      role: "teacher",
      isActive: true,
      status: args.status || "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update campus metrics if teacher is assigned to a campus
    if (args.campusId) {
      const campus = await ctx.db.get(args.campusId);
      if (campus && "metrics" in campus) {
        const teachers = await ctx.db
          .query("users")
          .withIndex("by_campus_active", (q) =>
            q.eq("campusId", args.campusId!).eq("isActive", true)
          )
          .filter((q) => q.eq(q.field("role"), "teacher"))
          .collect();

        const totalTeachers = teachers.length;
        const activeTeachers = teachers.filter((t) => t.status === "active").length;

        await ctx.db.patch(args.campusId, {
          metrics: {
            totalTeachers,
            activeTeachers,
            averageProgress: campus.metrics?.averageProgress || 0,
            lastUpdated: Date.now(),
          },
        });
      }
    }

    return userId;
  },
});

/**
 * Delete user
 */
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get the user to find the avatar storage ID and campus
    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Store campusId before deletion for metrics update
    const campusId = user.campusId;
    const isTeacher = user.role === "teacher";

    // Delete the avatar from storage if it exists
    if (user.avatarStorageId) {
      try {
        await ctx.storage.delete(user.avatarStorageId);
      } catch (error) {
        console.warn("Avatar storage file not found, might already be deleted:", user.avatarStorageId);
      }
    }

    // Delete the user
    await ctx.db.delete(args.userId);

    // Update campus metrics if the deleted user was a teacher assigned to a campus
    if (isTeacher && campusId) {
      const campus = await ctx.db.get(campusId);
      if (campus && "metrics" in campus) {
        const teachers = await ctx.db
          .query("users")
          .withIndex("by_campus_active", (q) =>
            q.eq("campusId", campusId).eq("isActive", true)
          )
          .filter((q) => q.eq(q.field("role"), "teacher"))
          .collect();

        const totalTeachers = teachers.length;
        const activeTeachers = teachers.filter((t) => t.status === "active").length;

        await ctx.db.patch(campusId, {
          metrics: {
            totalTeachers,
            activeTeachers,
            averageProgress: campus.metrics?.averageProgress || 0,
            lastUpdated: Date.now(),
          },
        });
      }
    }
  },
});

// ============================================================================
// CLERK WEBHOOK HANDLERS (Internal Mutations)
// ============================================================================

/**
 * Upsert user from Clerk webhook
 * This is called automatically when a user is created or updated in Clerk
 */
export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> }, // Trust Clerk's payload
  async handler(ctx, { data }) {
    // Extract user data from Clerk webhook
    // Clerk puede enviar el email de varias formas
    const email = data.email_addresses?.[0]?.email_address ||
      data.primary_email_address_id ||
      `user_${data.id}@temp.clerk`;

    const firstName = data.first_name || "";
    const lastName = data.last_name || "";
    const imageUrl = data.image_url;

    // Extract additional data from public_metadata (set by createTeacherWithClerk)
    const publicMetadata = data.public_metadata || {};
    const role = publicMetadata.role || "teacher";
    const campusId = publicMetadata.campusId || undefined;
    const phone = publicMetadata.phone || undefined;
    const avatarStorageId = publicMetadata.avatarStorageId || undefined;
    const status = publicMetadata.status || "active";

    // Check if user already exists in our database
    const existingUser = await userByClerkId(ctx, data.id);

    const userData = {
      clerkId: data.id,
      email,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim() || email,
      phone,
      avatarStorageId,
      campusId,
      role,
      status,
      updatedAt: Date.now(),
    };

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, userData);
    } else {
      // Create new user
      await ctx.db.insert("users", {
        ...userData,
        isActive: true,
        createdAt: Date.now(),
      });
    }
  },
});

/**
 * Delete user from Clerk webhook
 * This is called automatically when a user is deleted in Clerk
 */
export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const user = await userByClerkId(ctx, clerkUserId);

    if (user !== null) {
      // Delete avatar from storage if it exists
      if (user.avatarStorageId) {
        try {
          await ctx.storage.delete(user.avatarStorageId);
        } catch (error) {
          console.warn("Avatar storage file not found, might already be deleted:", user.avatarStorageId);
        }
      }

      // Delete the user
      await ctx.db.delete(user._id);
    } else {
      console.warn(
        `⚠️ Can't delete user, there is none for Clerk user ID: ${clerkUserId}`
      );
    }
  },
});

/**
 * Delete user from both Clerk and Convex
 * This action deletes the user from Clerk, which triggers the webhook to delete from Convex
 */
export const deleteUserWithClerk = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;

    if (!clerkSecretKey) {
      throw new Error("CLERK_SECRET_KEY not configured in environment variables");
    }

    // Get the user to find their Clerk ID
    const user = await ctx.runQuery(api.users.getUser, { userId: args.userId });

    if (!user) {
      throw new Error("User not found");
    }

    // Don't try to delete from Clerk if user has temporary Clerk ID
    if (user.clerkId.startsWith("temp_")) {
      // Just delete from Convex directly
      await ctx.runMutation(api.users.deleteUser, { userId: args.userId });
      return;
    }

    try {
      // Delete user from Clerk
      const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${user.clerkId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
        },
      });

      if (!clerkResponse.ok) {
        const errorData = await clerkResponse.json();
        console.error("Failed to delete user from Clerk:", errorData);
        throw new Error(`Failed to delete user from Clerk: ${errorData.errors?.[0]?.message || "Unknown error"}`);
      }

      // Note: The Clerk webhook will automatically delete the user from Convex
      // via the deleteFromClerk internal mutation

    } catch (error) {
      console.error("Error deleting user with Clerk:", error);
      throw error;
    }
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create teacher in both Clerk and Convex
 * This action creates the user in Clerk first, then stores it in Convex
 */
export const createTeacherWithClerk = action({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    campusId: v.optional(v.id("campuses")),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("on_leave"),
      v.literal("terminated")
    )),
  },
  handler: async (ctx, args): Promise<{ clerkId: string; invitationSent: boolean }> => {
    // Get Clerk secret key from environment
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;

    if (!clerkSecretKey) {
      throw new Error("CLERK_SECRET_KEY not configured in environment variables");
    }

    try {
      // Step 1: Create user in Clerk with public_metadata
      const clerkResponse = await fetch("https://api.clerk.com/v1/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: [args.email],
          first_name: args.firstName,
          last_name: args.lastName,
          public_metadata: {
            role: "teacher",
            campusId: args.campusId,
            phone: args.phone,
            avatarStorageId: args.avatarStorageId,
            status: args.status || "active",
          },
          skip_password_checks: true,
          skip_password_requirement: true,
          // Crear sin contraseña - el usuario la configurará cuando acepte la invitación
        }),
      });

      if (!clerkResponse.ok) {
        const errorData = await clerkResponse.json();
        console.error("Clerk API error:", errorData);
        throw new Error(`Failed to create user in Clerk: ${errorData.errors?.[0]?.message || "Unknown error"}`);
      }

      const clerkUser = await clerkResponse.json();

      // Step 2: Upload profile image to Clerk if provided
      if (args.avatarStorageId) {
        try {
          // Get the image URL from Convex storage
          const imageUrl = await ctx.storage.getUrl(args.avatarStorageId);

          if (imageUrl) {
            // Download the image from Convex storage
            const imageResponse = await fetch(imageUrl);
            const imageBlob = await imageResponse.blob();

            // Upload to Clerk using multipart/form-data
            const formData = new FormData();
            formData.append('file', imageBlob, 'avatar.png');

            const uploadImageResponse = await fetch(
              `https://api.clerk.com/v1/users/${clerkUser.id}/profile_image`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${clerkSecretKey}`,
                },
                body: formData,
              }
            );

          } else {
            console.warn("Could not generate URL for avatar storage ID:", args.avatarStorageId);
          }
        } catch (imageError) {
          console.error("Error uploading image to Clerk:", imageError);
          // No lanzar error - continuar con la creación del usuario
        }
      }

      // Step 3: Create user in Convex database
      // REMOVED - Let the webhook create the user in Convex
      // The webhook will read public_metadata and create the user with all fields

      // Step 4: Send invitation email via Clerk
      // Crear un "magic link" para que el usuario configure su cuenta
      const invitationResponse = await fetch(`https://api.clerk.com/v1/invitations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: args.email,
          public_metadata: {
            role: "teacher",
          },
          redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/sign-in`,
        }),
      });

      if (!invitationResponse.ok) {
        console.warn("Failed to send invitation, but user was created:", await invitationResponse.json());
        // No lanzar error - el usuario fue creado exitosamente
      } else {
        console.log("Invitation sent successfully to:", args.email);
      }

      return {
        clerkId: clerkUser.id,
        invitationSent: invitationResponse.ok
      };

    } catch (error) {
      console.error("Error creating teacher with Clerk:", error);
      throw error;
    }
  },
});

/**
 * DEPRECATED: No longer used - webhook creates users automatically
 * Internal mutation to create teacher in database
 * Called from createTeacherWithClerk action
 */
/*
export const createTeacherInDatabase = mutation({
  args: {
    clerkId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    campusId: v.optional(v.id("campuses")),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("on_leave"),
      v.literal("terminated")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      firstName: args.firstName,
      lastName: args.lastName,
      fullName: `${args.firstName} ${args.lastName}`,
      email: args.email,
      phone: args.phone,
      avatarStorageId: args.avatarStorageId,
      campusId: args.campusId,
      role: "teacher",
      isActive: true,
      status: args.status,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});
*/

/**
 * Get current user or throw error
 * Use this in mutations that require authentication
 */
export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrentUserFromAuth(ctx);
  if (!userRecord) {
    throw new Error("User not authenticated");
  }
  return userRecord;
}

/**
 * Get current user from auth context
 * Returns null if not authenticated
 */
export async function getCurrentUserFromAuth(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  // The subject field in Clerk JWT contains the Clerk user ID
  return await userByClerkId(ctx, identity.subject);
}

/**
 * Get user by Clerk ID
 * Helper function used internally
 */
async function userByClerkId(ctx: QueryCtx, clerkId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .first(); // Use .first() instead of .unique() to handle duplicates gracefully
}