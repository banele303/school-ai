import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/test-fetch",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const response = await fetch("https://fine-caiman-328.convex.site/.well-known/openid-configuration");
      const text = await response.text();
      return new Response(JSON.stringify({ ok: response.ok, status: response.status, text }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
