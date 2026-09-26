import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const publicDir = path.join(rootDir, "public");

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

execSync(`${npmCommand} run build`, { cwd: rootDir, stdio: "inherit" });

if (existsSync(publicDir)) {
  rmSync(publicDir, { recursive: true, force: true });
}

mkdirSync(publicDir, { recursive: true });
cpSync(distDir, publicDir, { recursive: true });
