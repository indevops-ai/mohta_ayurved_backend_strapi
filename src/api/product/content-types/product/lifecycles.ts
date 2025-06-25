// /src/api/product/content-types/product/lifecycles.ts

import * as _ from "lodash";

interface Product {
  id: number;
  documentId: string;
  name: string;
  category: "proprietary" | "classical";
  description: string;
  proprietary_fields?: {
    id?: number;
    usage?: string;
    ingredients?: string;
    dosage?: string;
    price_list?: Array<{
      id?: number;
      sr_no: number | string;
      qty: string;
      price: string;
    }>;
  };
  classical_fields?: {
    id?: number;
    sub_category?: string;
    usage?: string;
    ingredients?: string;
    dosage_anupan?: string;
    reference?: string;
    price_list?: Array<{
      id?: number;
      sr_no: number | string;
      qty: string;
      price: string;
    }>;
  };
  [key: string]: any;
}

interface AuditLogData {
  users_permissions_user?: number | null;
  action: "create" | "update" | "delete";
  entity_type: string;
  entity_id: number;
  entity_document_id: string;
  changes: Record<string, any>;
  previous_values: Record<string, any>;
  timestamp: Date;
}

// Enhanced function to get current user from context
// Enhanced function to get current user from context
async function getCurrentUser(): Promise<any | null> {
  try {
    // Get the current request context
    const ctx = strapi.requestContext?.get();

    if (ctx) {
      // Check state.user (for authenticated users)
      if (ctx.state?.user) {
        strapi.log.info("Found user in ctx.state.user:", {
          id: ctx.state.user.id,
          username: ctx.state.user.username,
          email: ctx.state.user.email,
        });
        return ctx.state.user;
      }

      // Check auditUser (set by middleware)
      if (ctx.auditUser) {
        strapi.log.info("Found user in ctx.auditUser:", {
          id: ctx.auditUser.id,
          username: ctx.auditUser.username,
          email: ctx.auditUser.email,
        });
        return ctx.auditUser;
      }

      // Try to get user from params if available (for admin panel operations)
      if (ctx.params?.data?.createdBy) {
        strapi.log.info("Found user in params.data.createdBy");
        return { id: ctx.params.data.createdBy };
      }

      // Check request headers for API token users
      if (ctx.request?.header?.authorization) {
        strapi.log.info("Authorization header found, attempting to decode JWT");

        // Try to decode JWT token to get user information
        try {
          const authHeader = ctx.request.header.authorization;
          if (authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7);

            // Check if users-permissions plugin is available
            if (strapi.plugins["users-permissions"]?.services?.jwt) {
              // Properly await the JWT verification
              const decoded =
                await strapi.plugins["users-permissions"].services.jwt.verify(
                  token
                );

              if (decoded && decoded.id) {
                strapi.log.info(
                  "Successfully decoded JWT token for user:",
                  decoded.id
                );

                // Try to fetch full user data
                try {
                  const user = await strapi.entityService.findOne(
                    "plugin::users-permissions.user",
                    decoded.id
                  );

                  if (user) {
                    strapi.log.info("Full user data fetched:", {
                      id: user.id,
                      username: user.username,
                      email: user.email,
                    });
                    return user;
                  }
                } catch (fetchError) {
                  strapi.log.warn(
                    "Could not fetch full user data, using decoded token data:",
                    fetchError.message
                  );
                  return { id: decoded.id };
                }

                return { id: decoded.id };
              }
            } else {
              strapi.log.warn(
                "Users-permissions plugin JWT service not available"
              );
            }
          }
        } catch (jwtError) {
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
    }

    // Fallback: Try to get from global context if available
    if (global.currentUser) {
      strapi.log.info("Found user in global context");
      return global.currentUser;
    }

    strapi.log.warn("No user context found in any location");
    return null;
  } catch (error) {
    strapi.log.error("Error getting current user context:", error);
    return null;
  }
}

// Enhanced function to deeply compare objects and get changes
function getChanges(
  oldData: Product,
  newData: Product
): {
  changes: Record<string, any>;
  previousValues: Record<string, any>;
} {
  const changes: Record<string, any> = {};
  const previousValues: Record<string, any> = {};

  // Function to recursively compare nested objects
  function compareObjects(oldObj: any, newObj: any, path: string = "") {
    // Handle null/undefined values
    if (oldObj === null || oldObj === undefined) {
      if (newObj !== null && newObj !== undefined) {
        changes[path] = newObj;
        previousValues[path] = oldObj;
      }
      return;
    }

    if (newObj === null || newObj === undefined) {
      if (oldObj !== null && oldObj !== undefined) {
        changes[path] = newObj;
        previousValues[path] = oldObj;
      }
      return;
    }

    if (typeof oldObj !== typeof newObj) {
      changes[path] = newObj;
      previousValues[path] = oldObj;
      return;
    }

    if (Array.isArray(newObj) && Array.isArray(oldObj)) {
      // Compare arrays deeply
      if (!_.isEqual(oldObj, newObj)) {
        changes[path] = newObj;
        previousValues[path] = oldObj;
      }
      return;
    }

    if (typeof newObj === "object" && newObj !== null && oldObj !== null) {
      // Compare objects deeply
      const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

      for (const key of allKeys) {
        const newPath = path ? `${path}.${key}` : key;
        const oldValue = oldObj[key];
        const newValue = newObj[key];

        if (!_.isEqual(oldValue, newValue)) {
          if (
            typeof newValue === "object" &&
            newValue !== null &&
            typeof oldValue === "object" &&
            oldValue !== null &&
            !Array.isArray(newValue) &&
            !Array.isArray(oldValue)
          ) {
            // Recursively compare nested objects
            compareObjects(oldValue, newValue, newPath);
          } else {
            // Direct value change
            changes[newPath] = newValue;
            previousValues[newPath] = oldValue;
          }
        }
      }
    } else {
      // Simple value comparison
      if (!_.isEqual(oldObj, newObj)) {
        changes[path] = newObj;
        previousValues[path] = oldObj;
      }
    }
  }

  // Compare all top-level properties
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  for (const key of allKeys) {
    // Skip system fields
    if (
      ["id", "createdAt", "updatedAt", "publishedAt", "locale"].includes(key)
    ) {
      continue;
    }

    const oldValue = oldData[key];
    const newValue = newData[key];

    compareObjects(oldValue, newValue, key);
  }

  return { changes, previousValues };
}

// Function to fetch product with full population
async function fetchProductWithPopulation(
  identifier: string | number,
  findBy: string = "documentId"
): Promise<Product | null> {
  try {
    strapi.log.info(`Fetching product with ${findBy}:`, identifier);

    const products = (await strapi.entityService.findMany(
      "api::product.product",
      {
        filters: {
          [findBy]: identifier,
        },
        populate: {
          proprietary_fields: {
            populate: {
              price_list: true,
            },
          },
          classical_fields: {
            populate: {
              price_list: true,
            },
          },
        },
      }
    )) as Product[];

    if (products && products.length > 0) {
      strapi.log.info("Product fetched successfully:", {
        id: products[0].id,
        documentId: products[0].documentId,
        hasProprietaryFields: !!products[0].proprietary_fields,
        hasClassicalFields: !!products[0].classical_fields,
        proprietaryFieldsContent: products[0].proprietary_fields,
        classicalFieldsContent: products[0].classical_fields,
      });
      return products[0];
    }

    strapi.log.warn(`No product found with ${findBy}:`, identifier);
    return null;
  } catch (error) {
    strapi.log.error(
      `Failed to fetch product with ${findBy} ${identifier}:`,
      error
    );
    return null;
  }
}

// Enhanced function to create audit log
// Enhanced function to create audit log
async function createAuditLog(
  action: "create" | "update" | "delete",
  entity: string,
  entityId: number,
  documentId: string,
  changes: Record<string, any> = {},
  previousValues: Record<string, any> = {}
): Promise<void> {
  try {
    // Properly await the getCurrentUser function
    const user = await getCurrentUser();

    // Log the user information for debugging
    strapi.log.info("Creating audit log with user:", {
      userId: user?.id,
      username: user?.username,
      email: user?.email,
      action,
      entityId,
      documentId,
    });

    const auditData: AuditLogData = {
      users_permissions_user: user?.id || null,
      action,
      entity_type: entity,
      entity_id: entityId,
      entity_document_id: documentId,
      changes,
      previous_values: previousValues,
      timestamp: new Date(),
    };

    // Log the audit data for debugging
    strapi.log.info(
      "Audit data being saved:",
      JSON.stringify(auditData, null, 2)
    );

    const result = await strapi.entityService.create(
      "api::audit-log.audit-log",
      {
        data: auditData,
      }
    );

    strapi.log.info("Audit log created successfully:", result.id);
  } catch (error) {
    strapi.log.error("Failed to create audit log:", error);
    strapi.log.error("Error details:", {
      message: error.message,
      stack: error.stack,
    });

    // Don't throw the error to prevent crashing the main operation
    // The audit log failure should not prevent the product creation/update
  }
}

// Function to prepare changes for create operation
function prepareCreateChanges(result: Product): Record<string, any> {
  const createChanges: Record<string, any> = {
    name: result.name,
    category: result.category,
    description: result.description,
  };

  // Include nested fields based on category
  if (result.category === "proprietary" && result.proprietary_fields) {
    createChanges.proprietary_fields = result.proprietary_fields;
  }

  if (result.category === "classical" && result.classical_fields) {
    createChanges.classical_fields = result.classical_fields;
  }

  return createChanges;
}

// Function to prepare previous values for delete operation
function preparePreviousValues(data: Product): Record<string, any> {
  const previousValues: Record<string, any> = {
    name: data.name,
    category: data.category,
    description: data.description,
  };

  if (data.proprietary_fields) {
    previousValues.proprietary_fields = data.proprietary_fields;
  }

  if (data.classical_fields) {
    previousValues.classical_fields = data.classical_fields;
  }

  return previousValues;
}

export default {
  async afterCreate(event: any): Promise<void> {
    const { result } = event;

    strapi.log.info("Product created - logging audit:", {
      id: result.id,
      documentId: result.documentId,
      name: result.name,
      category: result.category,
    });

    // Fetch the created product with full population to get all component data
    const createdProduct = await fetchProductWithPopulation(result.documentId);

    if (createdProduct) {
      const createChanges = prepareCreateChanges(createdProduct);

      await createAuditLog(
        "create",
        "product",
        createdProduct.id,
        createdProduct.documentId,
        createChanges,
        {} // No previous values for create
      );
    } else {
      // Fallback to result data if fetch fails
      const createChanges = prepareCreateChanges(result);

      await createAuditLog(
        "create",
        "product",
        result.id,
        result.documentId,
        createChanges,
        {}
      );
    }
  },

  async beforeUpdate(event: any): Promise<void> {
    const { params } = event;

    if (!params.where?.documentId && !params.where?.id) {
      strapi.log.warn("No ID or documentId found in update params");
      return;
    }

    try {
      // Use documentId if available, otherwise use id
      const identifier = params.where.documentId || params.where.id;
      const findBy = params.where.documentId ? "documentId" : "id";

      strapi.log.info("Fetching existing data for update:", {
        identifier,
        findBy,
      });

      const existing = await fetchProductWithPopulation(identifier, findBy);

      if (existing) {
        // Store existing data in params for afterUpdate hook
        params.existingData = existing;
        strapi.log.info("Existing data fetched for update:", {
          id: existing.id,
          documentId: existing.documentId,
          hasProprietaryFields: !!existing.proprietary_fields,
          hasClassicalFields: !!existing.classical_fields,
        });
      } else {
        strapi.log.warn("No existing data found for identifier:", identifier);
      }
    } catch (error) {
      strapi.log.error("Failed to fetch existing product data:", error);
    }
  },

  async afterUpdate(event: any): Promise<void> {
    const { result, params } = event;

    strapi.log.info("Product updated - logging audit:", {
      id: result.id,
      documentId: result.documentId,
      hasExistingData: !!params.existingData,
    });

    // Fetch the updated product with full population
    const updatedProduct = await fetchProductWithPopulation(result.documentId);

    if (params.existingData && updatedProduct) {
      const { changes, previousValues } = getChanges(
        params.existingData,
        updatedProduct
      );

      strapi.log.info("Changes detected:", {
        changesCount: Object.keys(changes).length,
        changeKeys: Object.keys(changes),
      });

      // Log detailed changes for debugging
      if (Object.keys(changes).length > 0) {
        strapi.log.debug("Detailed changes:", {
          changes: JSON.stringify(changes, null, 2),
          previousValues: JSON.stringify(previousValues, null, 2),
        });

        await createAuditLog(
          "update",
          "product",
          updatedProduct.id,
          updatedProduct.documentId,
          changes,
          previousValues
        );
      } else {
        strapi.log.info("No changes detected, skipping audit log");
      }
    } else {
      strapi.log.warn(
        "Missing data for comparison - logging all current data as changes"
      );

      // If no existing data, log current state as changes
      const currentProduct = updatedProduct || result;
      const allChanges = prepareCreateChanges(currentProduct);

      await createAuditLog(
        "update",
        "product",
        currentProduct.id,
        currentProduct.documentId,
        allChanges,
        {}
      );
    }
  },

  async beforeDelete(event: any): Promise<void> {
    const { params } = event;

    if (!params.where?.documentId && !params.where?.id) {
      strapi.log.warn("No ID or documentId found in delete params");
      return;
    }

    try {
      const identifier = params.where.documentId || params.where.id;
      const findBy = params.where.documentId ? "documentId" : "id";

      const existing = await fetchProductWithPopulation(identifier, findBy);

      if (existing) {
        params.existingData = existing;
        strapi.log.info("Existing data fetched for delete:", {
          id: existing.id,
          documentId: existing.documentId,
        });
      }
    } catch (error) {
      strapi.log.error(
        "Failed to fetch existing product data for delete:",
        error
      );
    }
  },

  async afterDelete(event: any): Promise<void> {
    const { result, params } = event;

    // Use existing data if available, otherwise use result
    const deletedData = params.existingData || result;

    strapi.log.info("Product deleted - logging audit:", {
      id: deletedData.id,
      documentId: deletedData.documentId,
    });

    const previousValues = preparePreviousValues(deletedData);

    await createAuditLog(
      "delete",
      "product",
      deletedData.id,
      deletedData.documentId,
      {}, // No new changes for delete
      previousValues
    );
  },
};
