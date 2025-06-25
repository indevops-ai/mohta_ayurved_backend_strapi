/**
 * audit-log router
 */

export default {
  routes: [
    {
      method: "GET" as const,
      path: "/audit-logs",
      handler: "audit-log.find",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "GET" as const,
      path: "/audit-logs/product/:id",
      handler: "audit-log.findByProduct",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
