#!/usr/bin/env node

const path = require("path");
const { readdir, readFile, writeFile } = require("fs/promises");

const IGNORED_FOLDERS = new Set([
  "node_modules",
  "dist",
  "build",
  ".next",
  ".git",
  ".turbo",
  "coverage",
  ".output",
  ".cache",
]);

const FILE_EXTENSIONS = new Set([".tsx", ".jsx"]);

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    componentsArg: "",
    dryRun: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const current = args[i];
    if (current === "--components" && typeof args[i + 1] === "string") {
      parsed.componentsArg = args[i + 1];
      i += 1;
      continue;
    }
    if (current === "--dry-run") {
      parsed.dryRun = true;
    }
  }

  return parsed;
}

function resolveComponents(componentsArg) {
  const fallback = ["header", "footer", "nav", "main"];
  const list = componentsArg
    ? componentsArg.split(",").map((token) => token.trim()).filter(Boolean)
    : fallback;

  return new Set(list.map((name) => name.replace(/^motion\./i, "").toLowerCase()));
}

async function collectFiles(dir) {
  const files = [];
  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (IGNORED_FOLDERS.has(entry.name)) {
          continue;
        }
        await walk(path.join(currentDir, entry.name));
      } else {
        const ext = path.extname(entry.name);
        if (FILE_EXTENSIONS.has(ext)) {
          files.push(path.join(currentDir, entry.name));
        }
      }
    }
  }

  await walk(dir);
  return files;
}

function rewriteContent(source, components) {
  let updated = source;
  let changed = false;

  components.forEach((component) => {
    const pattern = new RegExp(
      `(\\<motion\\.${component}\\b[^>]*?)initial=\\{\\{[\\s\\S]*?\\}\\}`,
      "g"
    );
    updated = updated.replace(pattern, (_match, prefix) => {
      changed = true;
      return `${prefix}initial={false}`;
    });
  });

  return { changed, updated };
}

async function run() {
  const { componentsArg, dryRun } = parseArgs();
  const components = resolveComponents(componentsArg);
  const searchRoot = path.join(process.cwd(), "src");
  const files = await collectFiles(searchRoot);
  const touched = [];

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    const { changed, updated } = rewriteContent(source, components);
    if (!changed) {
      continue;
    }

    touched.push(filePath);
    if (!dryRun) {
      await writeFile(filePath, updated, "utf8");
    }
  }

  if (!touched.length) {
    console.log("No matching motion components required changes.");
    return;
  }

  const action = dryRun ? "Would update" : "Updated";
  console.log(`${action} ${touched.length} file(s):`);
  touched.forEach((file) => {
    console.log(` - ${path.relative(process.cwd(), file)}`);
  });

  if (!dryRun) {
    console.log(
      "Done. Re-run with --dry-run to preview or adjust the --components list if needed."
    );
  }
}

run().catch((error) => {
  console.error("Codemod failed:", error);
  process.exitCode = 1;
});
