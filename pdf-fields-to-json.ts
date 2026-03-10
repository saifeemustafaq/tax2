#!/usr/bin/env -S npx tsx
/**
 * Launcher so `npx tsx pdf-fields-to-json.ts` works from project root.
 * Delegates to scripts/pdf-fields-to-json.ts with the same args.
 */
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const script = resolve(__dirname, "scripts", "pdf-fields-to-json.ts");
const child = spawn("npx", ["tsx", script, ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: __dirname,
});
child.on("exit", (code) => {
  process.exit(typeof code === "number" ? code : 0);
});
