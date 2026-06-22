import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";

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
const envFile = path.join(tmpDir, `convex_dev_env_${Date.now()}.env`);

function envLine(name, value) {
  return `${name}=${JSON.stringify(value)}\n`;
}

// Keep actual newlines for standard PKCS#8 parser support
const pkCorrect = privateKey.replace(/\r\n/g, "\n");

fs.writeFileSync(
  envFile,
  envLine("JWT_PRIVATE_KEY", pkCorrect) +
    envLine("JWKS", jwks) +
    envLine("AUTH_SECRET", authSecret),
  "utf-8"
);

// Read .env.local to get CONVEX_DEPLOYMENT
let convexDeployment = "";
const envLocalPath = ".env.local";
if (fs.existsSync(envLocalPath)) {
  const envLocal = fs.readFileSync(envLocalPath, "utf-8");
  const match = envLocal.match(/^CONVEX_DEPLOYMENT=(.+)$/m);
  if (match) {
    convexDeployment = match[1].split("#")[0].trim();
    console.log(`Loaded CONVEX_DEPLOYMENT from .env.local: "${convexDeployment}"`);
  }
}

if (!convexDeployment) {
  console.warn("⚠️ CONVEX_DEPLOYMENT not found in .env.local, setting will use current active deployment.");
}

console.log(`\n=== Setting environment variables on local/dev deployment ===\n`);

try {
  const cliPath = path.join(process.cwd(), "node_modules", "convex", "dist", "cli.bundle.cjs").replace(/\\/g, "\\\\");
  const deploymentName = convexDeployment ? convexDeployment.replace("dev:", "") : "trustworthy-viper-361";
  
  // Use monkey-patched runner to bypass Windows user context session issues for config resolution
  const cmd = `node -e "const os = require('os'); os.homedir = () => 'C:\\\\Users\\\\Mr Ness'; require(process.argv[1]);" "${cliPath}" env set --deployment ${deploymentName} --from-file "${envFile.replace(/\\/g, "\\\\")}" --force`;
  
  execSync(cmd, { stdio: "inherit", shell: true });
  console.log("\n✅ Environment variables set successfully on local/dev Convex!");
} catch (error) {
  console.error("\n❌ Failed to set environment variables on local/dev Convex:", error.message);
  try { fs.unlinkSync(envFile); } catch {}
  process.exit(1);
}

// Cleanup
try { fs.unlinkSync(envFile); } catch {}

console.log("\n✅ Done!");
