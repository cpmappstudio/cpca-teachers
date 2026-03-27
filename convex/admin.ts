/**
 * Funciones administrativas para gestión de usuarios
 * Incluye función especial para crear el primer superadmin
 */

import { v } from "convex/values";
import { action, mutation, query, QueryCtx } from "./_generated/server";
import { api } from "./_generated/api";
import { mergeClerkPublicMetadata, patchClerkUser } from "./users";
import type { Doc, Id } from "./_generated/dataModel";

type LegacyPrincipalEntry = {
  userId: Id<"users">;
  clerkId: string;
  fullName: string;
  email: string;
  role: Doc<"users">["role"];
  campuses: Array<{
    campusId: Id<"campuses">;
    campusName: string;
  }>;
};

type LegacyPrincipalPreview = {
  convertibleCandidates: LegacyPrincipalEntry[];
  skippedCandidates: Array<
    LegacyPrincipalEntry & {
      reason: string;
    }
  >;
  orphanedCampuses: Array<{
    campusId: Id<"campuses">;
    campusName: string;
    directorId: Id<"users">;
  }>;
};

async function getCurrentAdminOrThrow(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const currentUser = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!currentUser) {
    throw new Error("User not found");
  }

  if (currentUser.role !== "admin" && currentUser.role !== "superadmin") {
    throw new Error("Not authorized");
  }

  return currentUser;
}

async function buildLegacyPrincipalPreview(
  ctx: QueryCtx,
): Promise<LegacyPrincipalPreview> {
  await getCurrentAdminOrThrow(ctx);

  const campuses = await ctx.db.query("campuses").collect();
  const candidateMap = new Map<string, LegacyPrincipalEntry>();
  const skippedMap = new Map<
    string,
    LegacyPrincipalEntry & { reason: string }
  >();
  const orphanedCampuses: LegacyPrincipalPreview["orphanedCampuses"] = [];

  for (const campus of campuses) {
    if (!campus.directorId) {
      continue;
    }

    const director = await ctx.db.get(campus.directorId);
    if (!director) {
      orphanedCampuses.push({
        campusId: campus._id,
        campusName: campus.name,
        directorId: campus.directorId,
      });
      continue;
    }

    if (director.role === "principal") {
      continue;
    }

    const campusRef = {
      campusId: campus._id,
      campusName: campus.name,
    };

    if (director.role === "admin") {
      const existing = candidateMap.get(director._id);
      if (existing) {
        existing.campuses.push(campusRef);
      } else {
        candidateMap.set(director._id, {
          userId: director._id,
          clerkId: director.clerkId,
          fullName: director.fullName,
          email: director.email,
          role: "admin",
          campuses: [campusRef],
        });
      }
      continue;
    }

    if (director.role === "superadmin") {
      const existing = skippedMap.get(director._id);
      if (existing) {
        existing.campuses.push(campusRef);
      } else {
        skippedMap.set(director._id, {
          userId: director._id,
          clerkId: director.clerkId,
          fullName: director.fullName,
          email: director.email,
          role: "superadmin",
          campuses: [campusRef],
          reason:
            "Superadmins are skipped to avoid removing system-wide access.",
        });
      }
      continue;
    }

    const existing = skippedMap.get(director._id);
    if (existing) {
      existing.campuses.push(campusRef);
    } else {
      skippedMap.set(director._id, {
        userId: director._id,
        clerkId: director.clerkId,
        fullName: director.fullName,
        email: director.email,
        role: "admin",
        campuses: [campusRef],
        reason: `Users with role "${director.role}" are not migratable.`,
      });
    }
  }

  const sortByName = <T extends { fullName: string }>(items: T[]) =>
    items.sort((a, b) => a.fullName.localeCompare(b.fullName));

  return {
    convertibleCandidates: sortByName(Array.from(candidateMap.values())),
    skippedCandidates: sortByName(Array.from(skippedMap.values())),
    orphanedCampuses,
  };
}

/**
 * Función especial para crear el primer superadmin del sistema
 * Solo debe ejecutarse una vez durante la inicialización
 */
export const createInitialSuperAdmin = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    fullName: v.string(),
    role: v.literal("superadmin"),
    phone: v.optional(v.string()),
    isActive: v.boolean(),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("on_leave"),
      v.literal("terminated"),
    ),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Verificar que no exista ya un superadmin
    const existingSuperAdmin = await ctx.db
      .query("users")
      .withIndex("by_role_active", (q) =>
        q.eq("role", "superadmin").eq("isActive", true),
      )
      .first();

    if (existingSuperAdmin) {
      throw new Error(
        "Ya existe un superadmin en el sistema. No se puede crear otro.",
      );
    }

    // Verificar que no exista un usuario con el mismo clerkId
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      throw new Error("Ya existe un usuario con este Clerk ID.");
    }

    // Crear el superadmin
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      fullName: args.fullName,
      role: args.role,
      phone: args.phone,
      isActive: args.isActive,
      status: args.status,
      createdAt: args.createdAt,
      // No tiene campusId porque el superadmin puede acceder a todos
    });

    return userId;
  },
});

/**
 * Verificar si ya existe un superadmin en el sistema
 */
export const checkSuperAdminExists = query({
  args: {},
  handler: async (ctx) => {
    const superAdmin = await ctx.db
      .query("users")
      .withIndex("by_role_active", (q) =>
        q.eq("role", "superadmin").eq("isActive", true),
      )
      .first();

    return !!superAdmin;
  },
});

/**
 * Obtener información del superadmin actual
 */
export const getSuperAdminInfo = query({
  args: {},
  handler: async (ctx) => {
    const superAdmin = await ctx.db
      .query("users")
      .withIndex("by_role_active", (q) =>
        q.eq("role", "superadmin").eq("isActive", true),
      )
      .first();

    if (!superAdmin) {
      return null;
    }

    // No devolver información sensible
    return {
      id: superAdmin._id,
      email: superAdmin.email,
      fullName: superAdmin.fullName,
      createdAt: superAdmin.createdAt,
      lastLoginAt: superAdmin.lastLoginAt,
      status: superAdmin.status,
    };
  },
});

/**
 * Obtener usuarios que pueden ser asignados como principals de campus
 */
export const getPotentialDirectors = query({
  args: {},
  handler: async (ctx) => {
    const principals = await ctx.db
      .query("users")
      .withIndex("by_role_active", (q) =>
        q.eq("role", "principal").eq("isActive", true),
      )
      .collect();

    return principals.map((user) => ({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      campusId: user.campusId,
    }));
  },
});

export const getLegacyPrincipalCandidates = query({
  args: {},
  handler: async (ctx) => {
    return await buildLegacyPrincipalPreview(ctx);
  },
});

export const migrateLegacyPrincipals = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    migrated: number;
    skipped: number;
    orphaned: number;
    failed: number;
    migratedUsers: Array<{
      userId: Id<"users">;
      fullName: string;
      campusCount: number;
    }>;
    failedUsers: Array<{
      userId: Id<"users">;
      fullName: string;
      error: string;
    }>;
    message: string;
  }> => {
    const preview: LegacyPrincipalPreview = await ctx.runQuery(
      api.admin.getLegacyPrincipalCandidates,
      {},
    );

    let migrated = 0;
    const migratedUsers: Array<{
      userId: Id<"users">;
      fullName: string;
      campusCount: number;
    }> = [];
    const failedUsers: Array<{
      userId: Id<"users">;
      fullName: string;
      error: string;
    }> = [];

    for (const candidate of preview.convertibleCandidates) {
      try {
        const user = await ctx.runQuery(api.users.getUser, {
          userId: candidate.userId,
        });

        if (!user) {
          failedUsers.push({
            userId: candidate.userId,
            fullName: candidate.fullName,
            error: "User not found",
          });
          continue;
        }

        if (user.role !== "admin") {
          failedUsers.push({
            userId: candidate.userId,
            fullName: candidate.fullName,
            error: `User role changed to "${user.role}" before migration ran`,
          });
          continue;
        }

        if (!user.clerkId.startsWith("temp_")) {
          const publicMetadata = await mergeClerkPublicMetadata(user.clerkId, {
            role: "principal",
          });
          await patchClerkUser(user.clerkId, {
            public_metadata: publicMetadata,
          });
        }

        await ctx.runMutation(api.users.updateUser, {
          userId: user._id,
          updates: {
            role: "principal",
          },
        });

        migrated += 1;
        migratedUsers.push({
          userId: candidate.userId,
          fullName: candidate.fullName,
          campusCount: candidate.campuses.length,
        });
      } catch (error) {
        failedUsers.push({
          userId: candidate.userId,
          fullName: candidate.fullName,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      migrated,
      skipped: preview.skippedCandidates.length,
      orphaned: preview.orphanedCampuses.length,
      failed: failedUsers.length,
      migratedUsers,
      failedUsers,
      message:
        migrated > 0
          ? `Migrated ${migrated} legacy principal(s).`
          : "No legacy principals were migrated.",
    };
  },
});

/**
 * Migración: Crear teacher_assignments para asignaciones existentes en campusAssignments
 * Esta función solo debe ejecutarse una vez para migrar datos existentes
 */
export const migrateTeacherAssignments = mutation({
  args: {},
  handler: async (ctx) => {
    // Get the current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Get all active curriculums with campus assignments
    const curriculums = await ctx.db.query("curriculums").collect();

    let created = 0;
    let skipped = 0;

    for (const curriculum of curriculums) {
      if (
        !curriculum.campusAssignments ||
        curriculum.campusAssignments.length === 0
      ) {
        continue;
      }

      for (const campusAssignment of curriculum.campusAssignments) {
        for (const teacherId of campusAssignment.assignedTeachers) {
          // Check if teacher_assignment already exists
          const existingAssignments = await ctx.db
            .query("teacher_assignments")
            .withIndex("by_teacher_active", (q) =>
              q.eq("teacherId", teacherId).eq("isActive", true),
            )
            .collect();

          const exists = existingAssignments.some(
            (a) =>
              a.curriculumId === curriculum._id &&
              a.campusId === campusAssignment.campusId,
          );

          if (!exists) {
            // Create the teacher_assignment
            const currentYear = new Date().getFullYear();
            const academicYear = `${currentYear}-${currentYear + 1}`;

            await ctx.db.insert("teacher_assignments", {
              teacherId,
              curriculumId: curriculum._id,
              campusId: campusAssignment.campusId,
              academicYear,
              assignmentType: "primary",
              status: "active",
              isActive: true,
              startDate: Date.now(),
              assignedAt: Date.now(),
              assignedBy: currentUser._id,
            });

            created++;
          } else {
            skipped++;
          }
        }
      }
    }

    return {
      created,
      skipped,
      message: `Migration completed: ${created} teacher_assignments created, ${skipped} already existed.`,
    };
  },
});
