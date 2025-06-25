/**
 * audit-log controller
 */
import type { Context } from "koa";

interface AuditLogController {
  find: (ctx: Context) => Promise<any>;
  findByProduct: (ctx: Context) => Promise<any>;
}

const auditLogController: AuditLogController = {
  async find(ctx: Context) {
    const { query } = ctx;

    try {
      const auditLogs = await strapi.entityService.findMany(
        "api::audit-log.audit-log",
        {
          ...query,
          populate: {
            users_permissions_user: {
              fields: ["username", "email"],
            },
          },
          sort: { timestamp: "desc" },
        }
      );

      return auditLogs;
    } catch (error) {
      strapi.log.error("Failed to fetch audit logs:", error);
      ctx.throw(500, "Failed to fetch audit logs");
    }
  },

  async findByProduct(ctx: Context) {
    const { id } = ctx.params;

    if (!id) {
      ctx.throw(400, "Product ID is required");
    }

    try {
      const auditLogs = await strapi.entityService.findMany(
        "api::audit-log.audit-log",
        {
          filters: {
            $or: [{ entity_id: id }, { entity_document_id: id }],
          },
          populate: {
            users_permissions_user: {
              fields: ["username", "email"],
            },
          },
          sort: { timestamp: "desc" },
        }
      );

      return auditLogs;
    } catch (error) {
      strapi.log.error(`Failed to fetch audit logs for product ${id}:`, error);
      ctx.throw(500, "Failed to fetch audit logs for product");
    }
  },
};

export default auditLogController;
