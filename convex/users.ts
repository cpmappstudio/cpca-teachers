import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

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
      campusId: v.optional(v.id("campuses")),
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
    const updates: any = { ...args.updates, updatedAt: Date.now() };

    if (args.updates.firstName || args.updates.lastName) {
      const user = await ctx.db.get(args.userId);
      if (user) {
        updates.fullName = `${args.updates.firstName || user.firstName} ${args.updates.lastName || user.lastName}`;
      }
    }

    await ctx.db.patch(args.userId, updates);
  },
});