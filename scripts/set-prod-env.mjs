import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";

const DEPLOYMENT = "fine-caiman-328";

// Read private key
const pkPath = "private_key.pem";
if (!fs.existsSync(pkPath)) {
  console.error("private_key.pem not found in root directory!");
  process.exit(1);
}

const privateKey = fs.readFileSync(pkPath, "utf-8").trim();

// Dynamically generate JWKS from private key
console.log("Generating JWKS from private_key.pem...");
const privateKeyObj = crypto.createPrivateKey(privateKey);
const publicKeyObj = crypto.createPublicKey(privateKeyObj);
const jwk = publicKeyObj.export({ format: "jwk" });
const jwksObj = {
  keys: [
    {
      use: "sig",
      alg: "RS256",
      ...jwk
    }
  ]
};
const jwks = JSON.stringify(jwksObj);

// Generate random AUTH_SECRET
console.log("Generating random AUTH_SECRET...");
const authSecret = crypto.randomBytes(32).toString("base64url");

// Write to a temporary .env file
const tmpDir = fs.realpathSync(os.tmpdir());
const envFile = path.join(tmpDir, `convex_prod_env_${Date.now()}.env`);

function envLine(name, value) {
  return `${name}=${JSON.stringify(value)}\n`;
}

// Convert multiline PEM to single line with spaces for absolute safety in env parser
const pkSingleLine = privateKey.replace(/\r?\n/g, " ");

fs.writeFileSync(
  envFile,
  envLine("JWT_PRIVATE_KEY", pkSingleLine) +
    envLine("JWKS", jwks) +
    envLine("AUTH_SECRET", authSecret),
  "utf-8"
);

console.log(`\n=== Setting environment variables on production deployment: ${DEPLOYMENT} ===\n`);

try {
  const cmd = `npx convex env set --deployment ${DEPLOYMENT} --from-file "${envFile}" --force`;
  execSync(cmd, { stdio: "inherit", shell: true });
  console.log("\n✅ Environment variables set successfully on Convex!");
} catch (error) {
  console.error("\n❌ Failed to set environment variables on Convex:", error.message);
  try { fs.unlinkSync(envFile); } catch {}
  process.exit(1);
}

// Cleanup
try { fs.unlinkSync(envFile); } catch {}

console.log("\n=== Verifying environment variables ===");
try {
  execSync(`npx convex env list --deployment ${DEPLOYMENT}`, {
    stdio: "inherit",
    shell: true,
  });
} catch (error) {
  console.warn("\n⚠️ Verification listed failed, but environment setting was completed. (Check auth manually)");
}

console.log("\n✅ Done!");
