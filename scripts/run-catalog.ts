import "dotenv/config";
import { runCatalogIngestion } from "@/utils/interview-streams.utils";
import { ILogger } from "@/types/interview-streams.types";

function parseArgs() {
  const args = new URLSearchParams(process.argv.slice(2).join("&").replace(/^-+/, ""));
  const topic = args.get("topic") ?? undefined;
  const maxConcurrency = args.get("concurrency") ? Number(args.get("concurrency")) : undefined;
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
  logger.info("run-catalog:start", { topic, maxConcurrency });
  const res = await runCatalogIngestion({ topic, maxConcurrency, logger });
  logger.info("run-catalog:result", res);
}

main().catch((err) => {
  console.error(new Date().toISOString(), "FATAL", err);
  process.exit(1);
});
