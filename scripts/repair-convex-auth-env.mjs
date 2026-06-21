import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import crypto from "node:crypto";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const siteUrl =
  process.env.VITE_CONVEX_SITE_URL || "https://fine-caiman-328.convex.site";
const deployKey =
  process.env.CONVEX_DEPLOY_KEY || process.env.CONVEX_DEPLOYMENT_TOKEN;

async function hasValidJwks() {
  try {
    const response = await fetch(`${siteUrl}/.well-known/jwks.json?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) return false;
    const body = await response.text();
    const jwks = JSON.parse(body);
    return Array.isArray(jwks.keys) && jwks.keys.length > 0;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForValidJwks() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (await hasValidJwks()) return true;
    await sleep(5000);
  }
  return false;
}

function envLine(name, value) {
  return `${name}=${JSON.stringify(value)}\n`;
}

async function main() {
  if (await hasValidJwks()) {
    console.log("Convex Auth JWKS is valid; skipping auth env repair.");
    return;
  }

  if (!deployKey) {
    console.warn(
      "Convex Auth JWKS is invalid, but CONVEX_DEPLOY_KEY is not available; skipping auth env repair."
    );
    return;
  }

  console.warn("Convex Auth JWKS is invalid; repairing auth environment.");

  const keys = await generateKeyPair("RS256");
  const privateKey = (await exportPKCS8(keys.privateKey))
    .trimEnd();
  const publicKey = await exportJWK(keys.publicKey);
  const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });
  const authSecret = crypto.randomBytes(32).toString("base64url");

  const dir = mkdtempSync(join(tmpdir(), "convex-auth-env-"));
  const envFile = join(dir, "auth.env");

  try {
    writeFileSync(
      envFile,
      envLine("JWT_PRIVATE_KEY", privateKey) +
        envLine("JWKS", jwks) +
        envLine("AUTH_SECRET", authSecret),
      "utf8"
    );

    const npx = process.platform === "win32" ? "npx.cmd" : "npx";
    const result = spawnSync(
      npx,
      ["convex", "env", "set", "--prod", "--from-file", envFile, "--force"],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          CONVEX_DEPLOY_KEY: deployKey,
          CONVEX_DEPLOYMENT_TOKEN: deployKey,
        },
      }
    );

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }

    if (!(await waitForValidJwks())) {
      console.error("Convex Auth JWKS repair completed, but JWKS is still invalid.");
      process.exit(1);
    }

    console.log("Convex Auth environment repaired.");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
