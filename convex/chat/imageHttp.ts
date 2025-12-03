import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { HttpRouter } from "convex/server";

/**
 * Register HTTP routes for serving chat images.
 */
export function registerImageRoutes(http: HttpRouter) {
  // Route: GET /api/image/:fileId?variant=full|thumb&token=<sessionToken>
  http.route({
    pathPrefix: "/api/image/",
    method: "GET",
    handler: httpAction(async (ctx, req) => {
      const url = new URL(req.url);
      const pathParts = url.pathname.split("/");
      const fileIdStr = pathParts[pathParts.length - 1];

      if (!fileIdStr) {
        return new Response("Missing file ID", { status: 400 });
      }

      // Parse variant (default to full)
      const variant = url.searchParams.get("variant") || "full";
      if (variant !== "full" && variant !== "thumb") {
        return new Response("Invalid variant. Use 'full' or 'thumb'.", {
          status: 400,
        });
      }

      // Get auth token from query param or Authorization header
      const tokenFromQuery = url.searchParams.get("token");
      const authHeader = req.headers.get("Authorization");
      const tokenFromHeader = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;
      const token = tokenFromQuery || tokenFromHeader;

      if (!token) {
        return new Response("Authentication required", { status: 401 });
      }

      // Validate the file ID format
      let storageId: Id<"_storage">;
      try {
        storageId = fileIdStr as Id<"_storage">;
      } catch {
        return new Response("Invalid file ID format", { status: 400 });
      }

      // Find the message that contains this storage ID
      const messageInfo = await ctx.runQuery(
        internal.chat.images.findMessageByStorageId,
        { storageId }
      );

      if (!messageInfo) {
        return new Response("Image not found", { status: 404 });
      }

      // Get the conversation to check membership
      const conversation = await ctx.runQuery(
        internal.chat.conversations.getInternal,
        { conversationId: messageInfo.conversationId }
      );

      if (!conversation) {
        return new Response("Conversation not found", { status: 404 });
      }

      // Validate user has access to this conversation
      // We need to verify the token and get the user's player ID
      const accessCheck = await ctx.runQuery(
        internal.chat.imageAccess.validateAccess,
        {
          token,
          conversationId: messageInfo.conversationId,
        }
      );

      if (!accessCheck.allowed) {
        return new Response(accessCheck.error || "Access denied", {
          status: 403,
        });
      }

      // Get the blob from storage
      const blob = await ctx.storage.get(storageId);
      if (!blob) {
        return new Response("Image blob not found", { status: 404 });
      }

      // Return the image with appropriate headers
      return new Response(blob, {
        status: 200,
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "private, max-age=31536000, immutable",
          "Content-Length": blob.size.toString(),
        },
      });
    }),
  });
}
