#!/usr/bin/env node
/**
 * Normalize TanStack Start / Nitro static output for GitHub Pages:
 * copy into `.output/public`, add `.nojekyll`, and duplicate the SPA shell as
 * `404.html` so client routes like /hoorspel/shelf resolve.
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TARGET = ".output/public";
const CANDIDATES = ["dist/client", "dist", TARGET];

function hasAssets(dir) {
  return (
    existsSync(join(dir, "index.html")) ||
    existsSync(join(dir, "_shell.html")) ||
    existsSync(join(dir, "assets")) ||
    existsSync(join(dir, "sw.js"))
  );
}

const source = CANDIDATES.find((dir) => existsSync(dir) && hasAssets(dir));
if (!source) {
  console.error("pages-postbuild: no static output found");
  process.exit(1);
}

if (source !== TARGET) {
  rmSync(TARGET, { recursive: true, force: true });
  mkdirSync(TARGET, { recursive: true });
  cpSync(source, TARGET, { recursive: true });
}

writeFileSync(join(TARGET, ".nojekyll"), "");

const shellName = ["index.html", "_shell.html"].find((name) => existsSync(join(TARGET, name)));
if (!shellName) {
  console.error("pages-postbuild: no HTML shell in", TARGET);
  process.exit(1);
}
const shell = join(TARGET, shellName);
if (shellName !== "index.html") copyFileSync(shell, join(TARGET, "index.html"));
copyFileSync(join(TARGET, "index.html"), join(TARGET, "404.html"));

console.log(`pages-postbuild: ${TARGET} ready (from ${source})`);
