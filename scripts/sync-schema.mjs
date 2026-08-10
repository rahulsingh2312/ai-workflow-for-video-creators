/* Regenerates lib/server/schema.ts from schema.sql. Run after editing the SQL. */
import { readFileSync, writeFileSync } from "node:fs";
const sql = readFileSync("lib/server/schema.sql", "utf8");
writeFileSync(
  "lib/server/schema.ts",
  `/*\n  The schema, as a bundled string.\n\n  It used to be read from schema.sql at runtime, which works on a real server\n  and fails in a serverless bundle where lib/ was never shipped. Kept in sync\n  with schema.sql by scripts/sync-schema.mjs.\n*/\n\nexport const SCHEMA = String.raw\`${sql.replace(/`/g, "\\`").replace(/\$\{/g, "$\\{")}\`;\n`,
);
console.log("schema.ts regenerated");
