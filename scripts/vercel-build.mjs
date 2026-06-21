import { spawnSync } from "node:child_process";

// Force production Convex URL for Vercel builds
process.env.VITE_CONVEX_URL = "https://fine-caiman-328.convex.cloud";
process.env.VITE_CONVEX_SITE_URL = "https://fine-caiman-328.convex.site";

const hasDeployKey = Boolean(process.env.CONVEX_DEPLOY_KEY);
if (hasDeployKey) {
  const repair = spawnSync(
    "node",
    ["scripts/repair-convex-auth-env.mjs"],
    {
      stdio: "inherit",
      shell: true,
    }
  );

  if (repair.status !== 0) {
    process.exit(repair.status ?? 1);
  }
}

const command = hasDeployKey
  ? 'npx convex deploy --cmd "npm run build"'
  : 'npm run build';

if (!hasDeployKey) {
  console.warn(
    "CONVEX_DEPLOY_KEY is not set; building frontend without deploying Convex functions."
  );
}

console.log("Building with VITE_CONVEX_URL:", process.env.VITE_CONVEX_URL);

const result = spawnSync(command, {
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
