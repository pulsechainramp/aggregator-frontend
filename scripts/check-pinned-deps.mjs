import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

const disallowed = ["^", "~", "x", "*", "latest"];

function assertPinned(section) {
  const deps = pkg[section] || {};
  for (const [name, version] of Object.entries(deps)) {
    if (disallowed.some((token) => version.includes(token))) {
      console.error(
        `[check-pinned-deps] ${section} -> ${name} has non-pinned version: "${version}"`,
      );
      process.exit(1);
    }
  }
}

assertPinned("dependencies");
assertPinned("devDependencies");

console.log("[check-pinned-deps] All dependency versions are pinned.");
