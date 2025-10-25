import fs from "fs";
import { config } from "dotenv";
// Prefer .env.local for local CLI runs; fallback to .env
config({ path: fs.existsSync(".env.local") ? ".env.local" : ".env" });

import { runCatalogIngestion } from "@/services/server/ingest.services";
import { ILogger } from "@/types/interview-streams.types";

function parseArgs() {
  const args = new URLSearchParams(process.argv.slice(2).join("&").replace(/^-+/, ""));
  const topic = args.get("topic") ?? undefined;
  const maxConcurrency = (() => {
    const v = args.get("concurrency") ?? args.get("maxConcurrency");
    return v ? Number(v) : undefined;
  })();
  return { topic, maxConcurrency };
}

const logger: ILogger = {
  info: (...a) => console.log(new Date().toISOString(), "INFO", ...a),
  warn: (...a) => console.warn(new Date().toISOString(), "WARN", ...a),
  error: (...a) => console.error(new Date().toISOString(), "ERROR", ...a),
  debug: (...a) => console.debug(new Date().toISOString(), "DEBUG", ...a),
};

async function main() {
  const { topic, maxConcurrency } = parseArgs();
  // Basic env presence log (no secrets)
  console.log("ENV:", {
    HAS_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
    HAS_SUPABASE_ANON: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY),
    HAS_SERVICE_ROLE: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
  logger.info("run-catalog:start", { topic, maxConcurrency });
  const res = await runCatalogIngestion({ topic, maxConcurrency, logger });
  logger.info("run-catalog:result", res);
}

main().catch((err) => {
  console.error(new Date().toISOString(), "FATAL", err);
  process.exit(1);
});
