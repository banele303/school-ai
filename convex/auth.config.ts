export default {
  providers: [
    {
      domain: process.env.JW_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
};
