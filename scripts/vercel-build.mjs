import { spawnSync } from "node:child_process";

const hasDeployKey = Boolean(process.env.CONVEX_DEPLOY_KEY);
const command = hasDeployKey
  ? ["npx", ["convex", "deploy", "--cmd", "npm run build"]]
  : ["npm", ["run", "build"]];

if (!hasDeployKey) {
  console.warn(
    "CONVEX_DEPLOY_KEY is not set; building frontend without deploying Convex functions."
  );
}

const result = spawnSync(command[0], command[1], {
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
