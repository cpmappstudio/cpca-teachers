"use client"

import { useConvexAuth, useQuery } from "convex/react"
import { useUser } from "@clerk/nextjs"
import { api } from "@/convex/_generated/api"

/**
 * Hook to get the current user from Convex database
 * This ensures the user exists in our database before allowing access
 * 
 * Usage:
 * const { isLoading, isAuthenticated, user } = useCurrentUser()
 * 
 * Returns:
 * - isLoading: true while checking auth or waiting for user to be synced
 * - isAuthenticated: true only when user is authenticated AND exists in our database
 * - user: the user document from Convex, or null if not authenticated
 */
export function useCurrentUser() {
    const { isLoading: isConvexLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuth()
    const { user: clerkUser } = useUser()

    // Query the current user from Convex database using Clerk ID
    const convexUser = useQuery(
        api.users.getCurrentUser,
        clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
    )

    // Combine the authentication state with the user existence check
    const isLoading = isConvexLoading || (isConvexAuthenticated && clerkUser && convexUser === null)
    const isAuthenticated = isConvexAuthenticated && convexUser !== null

    return {
        isLoading,
        isAuthenticated,
        user: convexUser,
    }
}
