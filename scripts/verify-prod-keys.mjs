import crypto from "crypto";
import { execSync } from "child_process";
import path from "path";

async function main() {
  const cliPath = path.join(process.cwd(), "node_modules", "convex", "dist", "cli.bundle.cjs").replace(/\\/g, "\\\\");
  const cmd = `node -e "const os = require('os'); os.homedir = () => 'C:\\\\Users\\\\Mr Ness'; require(process.argv[1]);" "${cliPath}" env list --deployment fine-caiman-328`;
  
  let output = "";
  try {
    output = execSync(cmd, { encoding: "utf8" });
  } catch (error) {
    console.error("Failed to fetch environment variables:", error.message);
    process.exit(1);
  }

  const lines = output.split("\n");
  let jwksStr = "";
  let privateKeyStr = "";

  for (const line of lines) {
    if (line.startsWith("JWKS=")) {
      jwksStr = line.substring(5).trim();
      // Strip any quotes wrapping it
      if (jwksStr.startsWith("'") && jwksStr.endsWith("'")) {
        jwksStr = jwksStr.slice(1, -1);
      }
      jwksStr = jwksStr.replace(/\\"/g, '"');
    }
  }

  // Find private key (which is multi-line starting with JWT_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----)
  const pkStartIndex = output.indexOf("JWT_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----");
  if (pkStartIndex !== -1) {
    const pkEndIndex = output.indexOf("-----END PRIVATE KEY-----'", pkStartIndex);
    if (pkEndIndex !== -1) {
      privateKeyStr = output.substring(pkStartIndex + 17, pkEndIndex + 25);
    }
  }

  if (!jwksStr || !privateKeyStr) {
    console.error("JWKS or JWT_PRIVATE_KEY not found in environment output!");
    process.exit(1);
  }

  console.log("JWKS:", jwksStr);
  console.log("Private Key:\n", privateKeyStr);

  try {
    const jwks = JSON.parse(jwksStr);
    const key = crypto.createPrivateKey(privateKeyStr);
    const pub = crypto.createPublicKey(key);
    const derivedN = pub.export({ format: "jwk" }).n;
    const match = derivedN === jwks.keys[0].n;
    console.log("\n==============================");
    console.log("Verification Result:");
    console.log("Does Private Key match JWKS?", match ? "✅ YES!" : "❌ NO!");
    console.log("==============================");
  } catch (error) {
    console.error("Error during cryptographic verification:", error);
  }
}

main().catch(console.error);
