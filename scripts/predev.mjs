import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

function run(command) {
  try {
    execSync(command, { stdio: "ignore" });
  } catch {
    // Ignore failures when no process exists for the port.
  }
}

run("fuser -k -n tcp 3000");
run("fuser -k -n tcp 3001");

const lockPath = join(process.cwd(), ".next", "dev", "lock");
if (existsSync(lockPath)) {
  unlinkSync(lockPath);
}
