// /src/middlewares/audit-context.ts

import type { Context, Next } from "koa";

interface StrapiConfig {
  strapi: any;
}

interface UserContext extends Context {
  auditUser?: any;
}

export default (config: any, { strapi }: StrapiConfig) => {
  return async (ctx: UserContext, next: Next) => {
    try {
      // Skip audit middleware for static assets and health checks
      if (
        ctx.url.startsWith("/uploads/") ||
        ctx.url.startsWith("/assets/") ||
        ctx.url === "/health" ||
        ctx.url.startsWith("/_health")
      ) {
        await next();
        return;
      }

      // Log middleware execution for debugging (only for relevant routes)
      strapi.log.debug("Audit context middleware executing for:", {
        method: ctx.method,
        url: ctx.url,
        hasUser: !!ctx.state?.user,
        hasAuth: !!ctx.request?.header?.authorization,
      });

      // Store user context for audit logging
      if (ctx.state?.user) {
        ctx.auditUser = ctx.state.user;
        // Also store in global context as fallback
        global.currentUser = ctx.state.user;

        strapi.log.info("User context set for audit:", {
          userId: ctx.state.user.id,
          username: ctx.state.user.username,
          email: ctx.state.user.email,
        });
      } else {
        // Check if there's an authorization header but no user
        if (ctx.request?.header?.authorization) {
          strapi.log.warn(
            "Authorization header present but no user in context state"
          );

          // Try to get user info from JWT token if possible
          try {
            const authHeader = ctx.request.header.authorization;
            if (authHeader.startsWith("Bearer ")) {
              const token = authHeader.substring(7);

              // Try to decode JWT and get user with proper error handling
              try {
                // Check if users-permissions plugin is available
                if (strapi.plugins["users-permissions"]?.services?.jwt) {
                  // Properly await the JWT verification
                  const decoded =
                    await strapi.plugins[
                      "users-permissions"
                    ].services.jwt.verify(token);

                  if (decoded && decoded.id) {
                    // Fetch full user data
                    const user = await strapi.entityService.findOne(
                      "plugin::users-permissions.user",
                      decoded.id
                    );

                    if (user) {
                      ctx.auditUser = user;
                      global.currentUser = user;

                      strapi.log.info("User context set from JWT token:", {
                        userId: user.id,
                        username: user.username,
                        email: user.email,
                      });
                    } else {
                      // If user not found in DB, use the decoded token data
                      ctx.auditUser = { id: decoded.id };
                      global.currentUser = { id: decoded.id };

                      strapi.log.info(
                        "User context set from JWT token (minimal data):",
                        {
                          userId: decoded.id,
                        }
                      );
                    }
                  }
                } else {
                  strapi.log.warn(
                    "Users-permissions plugin JWT service not available"
                  );
                }
              } catch (jwtError) {
                // Log JWT error but don't crash the application
                strapi.log.debug(
                  "JWT verification failed (token may be expired or invalid):",
                  {
                    error: jwtError.message,
                    url: ctx.url,
                  }
                );
                // Don't rethrow the error - just continue without user context
              }
            }
          } catch (error) {
            strapi.log.error("Error processing authorization header:", error);
            // Don't rethrow - continue without user context
          }
        } else {
          strapi.log.debug(
            "No user found in context state and no authorization header"
          );
        }
      }

      // Execute the next middleware/controller
      await next();
    } catch (error) {
      // Catch any errors in the middleware to prevent crashes
      strapi.log.error("Error in audit context middleware:", error);

      // Still proceed with the request even if middleware fails
      try {
        await next();
      } catch (nextError) {
        // If the next middleware also fails, log and rethrow
        strapi.log.error("Error in next middleware:", nextError);
        throw nextError;
      }
    } finally {
      // Clean up global context after request
      if (global.currentUser) {
        delete global.currentUser;
      }
    }
  };
};
