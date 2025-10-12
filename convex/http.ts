import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

// Tipo del webhook event de Clerk
type WebhookEvent = {
    type: "user.created" | "user.updated" | "user.deleted" | string;
    data: {
        id: string;
        email_addresses?: Array<{ email_address: string }>;
        first_name?: string;
        last_name?: string;
        image_url?: string;
        [key: string]: any;
    };
};

const http = httpRouter();

/**
 * Webhook endpoint for Clerk user events
 * This endpoint is called by Clerk whenever a user is created, updated, or deleted
 * 
 * Setup instructions:
 * 1. Go to Clerk Dashboard > Webhooks > Add Endpoint
 * 2. Set Endpoint URL to: https://<your-deployment>.convex.site/clerk-users-webhook
 * 3. Subscribe to: user.created, user.updated, user.deleted events
 * 4. Copy the Signing Secret and set it as CLERK_WEBHOOK_SECRET in Convex Dashboard
 */
http.route({
    path: "/clerk-users-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const event = await validateClerkWebhook(request);

        if (!event) {
            return new Response("Error validating webhook", { status: 400 });
        }

        switch (event.type) {
            case "user.created":
            case "user.updated":
                await ctx.runMutation(internal.users.upsertFromClerk, {
                    data: event.data as any, // Clerk webhook data
                });
                break;

            case "user.deleted":
                const clerkUserId = event.data.id!;
                await ctx.runMutation(internal.users.deleteFromClerk, {
                    clerkUserId
                });
                break;

            default:
                console.log("Ignored Clerk webhook event", event.type);
        }

        return new Response(null, { status: 200 });
    }),
});

/**
 * Validate Clerk webhook signature
 */
async function validateClerkWebhook(
    req: Request
): Promise<WebhookEvent | null> {
    const payloadString = await req.text();
    const svixHeaders = {
        "svix-id": req.headers.get("svix-id")!,
        "svix-timestamp": req.headers.get("svix-timestamp")!,
        "svix-signature": req.headers.get("svix-signature")!,
    };

    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

    try {
        return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
    } catch (error) {
        console.error("Error verifying webhook event", error);
        return null;
    }
}

export default http;
