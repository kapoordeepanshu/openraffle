import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

// Fresh SQLite database for the integration tests.
export default function setup() {
  rmSync("prisma/test.db", { force: true });
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "ignore",
  });
  return () => rmSync("prisma/test.db", { force: true });
}
