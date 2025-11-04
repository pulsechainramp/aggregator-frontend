const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const sourceViemDir = path.join(rootDir, "node_modules", "viem");

if (!fs.existsSync(sourceViemDir)) {
  console.warn(
    "[postinstall-fixes] Skipping viem patch because node_modules/viem is missing.",
  );
  process.exit(0);
}

const sourcePkgPath = path.join(sourceViemDir, "package.json");
const sourcePkg = JSON.parse(fs.readFileSync(sourcePkgPath, "utf8"));

const dependencyNames = Object.keys(sourcePkg.dependencies || {});

const targets = [
  path.join(rootDir, "node_modules", "@web3-onboard", "core", "node_modules", "viem"),
  path.join(rootDir, "node_modules", "@web3-onboard", "common", "node_modules", "viem"),
];

const lockFilePath = path.join(rootDir, "package-lock.json");

for (const target of targets) {
  const parentDir = path.dirname(target);
  if (!fs.existsSync(parentDir)) {
    continue;
  }

  try {
    fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(parentDir, { recursive: true });
    fs.cpSync(sourceViemDir, target, { recursive: true });

    for (const dep of dependencyNames) {
      const segments = dep.startsWith("@") ? dep.split("/") : [dep];
      const depDir = path.join(parentDir, ...segments);
      fs.rmSync(depDir, { recursive: true, force: true });
    }

    const targetPkgPath = path.join(target, "package.json");
    const targetPkg = JSON.parse(fs.readFileSync(targetPkgPath, "utf8"));

    targetPkg.version = sourcePkg.version;
    targetPkg.dependencies = sourcePkg.dependencies;

    fs.writeFileSync(targetPkgPath, `${JSON.stringify(targetPkg, null, 2)}\n`);
    console.log(
      `[postinstall-fixes] Replaced ${path.relative(rootDir, target)} with viem ${sourcePkg.version}.`,
    );
  } catch (error) {
    console.warn(
      `[postinstall-fixes] Failed to replace ${path.relative(rootDir, target)}:`,
      error,
    );
  }
}

const coreLockPath = path.join(
  rootDir,
  "node_modules",
  "@web3-onboard",
  "core",
  "package-lock.json",
);

if (fs.existsSync(coreLockPath)) {
  try {
    fs.rmSync(coreLockPath);
    console.log(
      `[postinstall-fixes] Removed ${path.relative(rootDir, coreLockPath)} to avoid stale dependency pins.`,
    );
  } catch (error) {
    console.warn(
      `[postinstall-fixes] Failed to remove ${path.relative(
        rootDir,
        coreLockPath,
      )}:`,
      error,
    );
  }
}

if (fs.existsSync(lockFilePath)) {
  try {
    const lockFile = JSON.parse(fs.readFileSync(lockFilePath, "utf8"));
    const viemPaths = [
      "node_modules/@web3-onboard/core/node_modules/viem",
      "node_modules/@web3-onboard/common/node_modules/viem",
    ];

    const wsPaths = [
      "node_modules/@web3-onboard/core/node_modules/ws",
      "node_modules/@web3-onboard/common/node_modules/ws",
    ];

    const viemDependencies = {
      "@noble/curves": "1.9.1",
      "@noble/hashes": "1.8.0",
      "@scure/bip32": "1.7.0",
      "@scure/bip39": "1.6.0",
      abitype: "1.1.0",
      isows: "1.0.7",
      ox: "0.9.6",
      ws: "8.18.3",
    };

    for (const pkgPath of viemPaths) {
      if (lockFile.packages?.[pkgPath]) {
        lockFile.packages[pkgPath].version = sourcePkg.version;
        lockFile.packages[pkgPath].resolved =
          "https://registry.npmjs.org/viem/-/viem-2.38.6.tgz";
        lockFile.packages[pkgPath].integrity =
          "sha512-aqO6P52LPXRjdnP6rl5Buab65sYa4cZ6Cpn+k4OLOzVJhGIK8onTVoKMFMT04YjDfyDICa/DZyV9HmvLDgcjkw==";
        lockFile.packages[pkgPath].dependencies = { ...viemDependencies };
      }
    }

    for (const pkgPath of wsPaths) {
      if (lockFile.packages?.[pkgPath]) {
        lockFile.packages[pkgPath].version = "8.18.3";
        lockFile.packages[pkgPath].resolved =
          "https://registry.npmjs.org/ws/-/ws-8.18.3.tgz";
        lockFile.packages[pkgPath].integrity =
          "sha512-PEIGCY5tSlUt50cqyMXfCzX+oOPqN0vuGqWzbcJ2xvnkzkq46oOpz7dQaTDBdfICb4N14+GARUDw2XV2N4tvzg==";
      }
    }

    fs.writeFileSync(lockFilePath, `${JSON.stringify(lockFile, null, 2)}\n`);
    console.log("[postinstall-fixes] Updated package-lock.json entries for viem and ws.");
  } catch (error) {
    console.warn("[postinstall-fixes] Failed to update package-lock.json:", error);
  }
}
