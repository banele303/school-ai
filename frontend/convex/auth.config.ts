export default {
  providers: [
    {
      // @ts-ignore - CONVEX_SITE_URL is a built-in Convex env var available at runtime
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
