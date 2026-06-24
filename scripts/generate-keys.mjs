import crypto from "node:crypto";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { writeFileSync } from "node:fs";

async function main() {
  const keys = await generateKeyPair("RS256", { extractable: true });
  const privateKey = (await exportPKCS8(keys.privateKey)).trimEnd();
  const publicKey = await exportJWK(keys.publicKey);
  const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });
  const authSecret = crypto.randomBytes(32).toString("base64url");

  const content = `
=== JWT_PRIVATE_KEY ===
${privateKey}

=== JWKS ===
${jwks}

=== AUTH_SECRET ===
${authSecret}
`;

  writeFileSync("convex_keys_to_copy.txt", content.trim(), "utf8");
  console.log("Keys written to convex_keys_to_copy.txt");
}

main().catch(console.error);
