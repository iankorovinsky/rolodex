import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function findBundledElectronInstallScript() {
  const bunStoreDir = join(process.cwd(), "node_modules", ".bun");

  if (!existsSync(bunStoreDir)) {
    return null;
  }

  const electronPackageDir = readdirSync(bunStoreDir)
    .filter((entry) => entry.startsWith("electron@"))
    .sort()
    .at(-1);

  if (!electronPackageDir) {
    return null;
  }

  const installScript = join(
    bunStoreDir,
    electronPackageDir,
    "node_modules",
    "electron",
    "install.js",
  );

  return existsSync(installScript) ? installScript : null;
}

let installScriptPath = null;

try {
  installScriptPath = require.resolve("electron/install.js", {
    paths: [process.cwd()],
  });
} catch {
  installScriptPath = findBundledElectronInstallScript();
}

if (!installScriptPath) {
  console.log("Electron package not installed yet; skipping binary install.");
  process.exit(0);
}

const electronDir = dirname(installScriptPath);
const distDir = join(electronDir, "dist");
const pathFile = join(electronDir, "path.txt");

if (existsSync(distDir) && existsSync(pathFile)) {
  console.log("Electron binary already installed.");
  process.exit(0);
}

console.log("Installing Electron binary...");

const result = spawnSync(process.execPath, [installScriptPath], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
