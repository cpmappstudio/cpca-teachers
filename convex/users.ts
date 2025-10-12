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
    if (args.role) {
      return await ctx.db
        .query("users")
        .withIndex("by_role_active", (q) =>
          q.eq("role", args.role!).eq("isActive", args.isActive ?? true)
        )
        .collect();
    } else if (args.campusId) {
      return await ctx.db
        .query("users")
        .withIndex("by_campus_active", (q) =>
          q.eq("campusId", args.campusId!).eq("isActive", args.isActive ?? true)
        )
        .collect();
    }

    // Default: get all users
    return await ctx.db.query("users").collect();
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
      console.log("User has temporary Clerk ID, skipping Clerk sync");
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
        console.log("Updating user in Clerk:", { userId: user.clerkId, updates: clerkUpdates });
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

        console.log("✅ User updated in Clerk successfully");
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

            if (deleteImageResponse.ok) {
              console.log("✅ Profile image deleted from Clerk successfully");
            } else {
              console.warn("⚠️ Failed to delete profile image from Clerk (might not exist)");
            }
          } catch (imageError) {
            console.error("Error deleting image from Clerk:", imageError);
            // No lanzar error - continuar con la actualización
          }
        } else {
          // Upload new image to Clerk
          try {
            const imageUrl = await ctx.storage.getUrl(args.updates.avatarStorageId);
            console.log("Updating avatar - Storage ID:", args.updates.avatarStorageId);
            console.log("Updating avatar - Generated URL:", imageUrl);

            if (imageUrl) {
              // Download the image from Convex storage
              const imageResponse = await fetch(imageUrl);
              const imageBlob = await imageResponse.blob();

              console.log("Downloaded image blob, size:", imageBlob.size, "type:", imageBlob.type);

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

              if (uploadImageResponse.ok) {
                const updatedUser = await uploadImageResponse.json();
                console.log("✅ Profile image updated in Clerk successfully");
                console.log("Clerk image_url:", updatedUser.image_url);
              } else {
                const errorData = await uploadImageResponse.json();
                console.error("❌ Failed to update profile image in Clerk:", errorData);
              }
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
    await ctx.db.patch(args.userId, {
      campusId: undefined,
      updatedAt: Date.now(),
    });
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
      console.log(`✅ Updated user from Clerk webhook: ${data.id}`, { email, firstName, lastName, role });
    } else {
      // Create new user
      await ctx.db.insert("users", {
        ...userData,
        isActive: true,
        createdAt: Date.now(),
      });
      console.log(`✅ Created new user from Clerk webhook: ${data.id}`, { email, firstName, lastName, role, campusId });
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
      console.log(`✅ Deleted user from Clerk webhook: ${clerkUserId}`);
    } else {
      console.warn(
        `⚠️ Can't delete user, there is none for Clerk user ID: ${clerkUserId}`
      );
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
      console.log("Created user in Clerk:", clerkUser.id);

      // Step 2: Upload profile image to Clerk if provided
      if (args.avatarStorageId) {
        try {
          // Get the image URL from Convex storage
          const imageUrl = await ctx.storage.getUrl(args.avatarStorageId);

          console.log("Avatar storage ID:", args.avatarStorageId);
          console.log("Generated image URL:", imageUrl);

          if (imageUrl) {
            // Download the image from Convex storage
            const imageResponse = await fetch(imageUrl);
            const imageBlob = await imageResponse.blob();

            console.log("Downloaded image blob, size:", imageBlob.size, "type:", imageBlob.type);

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

            if (uploadImageResponse.ok) {
              const updatedUser = await uploadImageResponse.json();
              console.log("Profile image uploaded to Clerk successfully");
              console.log("Clerk image_url:", updatedUser.image_url);
            } else {
              const errorData = await uploadImageResponse.json();
              console.error("Failed to upload profile image to Clerk:", errorData);
            }
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