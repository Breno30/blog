// Local dev: build once, serve dist/, and rebuild on any content/template/
// static change. Edit a markdown file, then refresh the browser.
// No dependencies — uses node's built-in fs.watch.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "./build.js";
import { serve } from "./serve.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8000;

// Directories + files that should trigger a rebuild when they change.
const WATCH = ["content", "templates", "static", "site.config.js", "build.js"];

async function safeBuild(reason) {
  try {
    await build();
    if (reason) console.log(`  ↳ rebuilt (${reason})`);
  } catch (err) {
    console.error("build failed:\n", err.message);
  }
}

await safeBuild();
serve(PORT);

// Debounce bursts of fs events (editors often fire several per save).
let timer = null;
const schedule = (label) => {
  clearTimeout(timer);
  timer = setTimeout(() => safeBuild(label), 120);
};

for (const target of WATCH) {
  const full = path.join(ROOT, target);
  if (!fs.existsSync(full)) continue;
  const recursive = fs.statSync(full).isDirectory();
  try {
    fs.watch(full, { recursive }, (_event, file) =>
      schedule(`${target}${file ? "/" + file : ""}`)
    );
  } catch {
    // recursive watch is unsupported on some platforms; fall back to flat watch
    fs.watch(full, (_e, file) => schedule(`${target}/${file || ""}`));
  }
}

console.log(`watching ${WATCH.join(", ")} — Ctrl+C to stop`);
