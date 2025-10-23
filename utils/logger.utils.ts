/**
 * Logger utility for structured logging across the application.
 * Provides consistent error, warning, and info logging with optional metadata.
 */

type LogMetadata = Record<string, unknown>;

export const logger = {
  /**
   * Log error messages with optional metadata
   */
  error: (message: string, metadata?: LogMetadata | Error | unknown) => {
    let meta: LogMetadata | undefined;
    if (metadata instanceof Error) {
      meta = { error: metadata.message, stack: metadata.stack };
    } else if (metadata && typeof metadata === "object") {
      meta = metadata as LogMetadata;
    } else if (metadata) {
      meta = { details: String(metadata) };
    }
    console.error(JSON.stringify({ level: "error", message, ...meta }, null, 2));
  },

  /**
   * Log warning messages with optional metadata
   */
  warn: (message: string, metadata?: LogMetadata | unknown) => {
    let meta: LogMetadata | undefined;
    if (metadata && typeof metadata === "object") {
      meta = metadata as LogMetadata;
    } else if (metadata) {
      meta = { details: String(metadata) };
    }
    console.warn(JSON.stringify({ level: "warn", message, ...meta }, null, 2));
  },

  /**
   * Log info messages with optional metadata
   */
  info: (message: string, metadata?: LogMetadata | unknown) => {
    let meta: LogMetadata | undefined;
    if (metadata && typeof metadata === "object") {
      meta = metadata as LogMetadata;
    } else if (metadata) {
      meta = { details: String(metadata) };
    }
    console.log(JSON.stringify({ level: "info", message, ...meta }, null, 2));
  },

  /**
   * Alias for console.log (info level)
   */
  log: (message: string, metadata?: LogMetadata | unknown) => {
    let meta: LogMetadata | undefined;
    if (metadata && typeof metadata === "object") {
      meta = metadata as LogMetadata;
    } else if (metadata) {
      meta = { details: String(metadata) };
    }
    console.log(JSON.stringify({ level: "info", message, ...meta }, null, 2));
  },

  /**
   * Log debug messages with optional metadata (only in non-production)
   */
  debug: (message: string, metadata?: LogMetadata | unknown) => {
    if (process.env.NODE_ENV !== "production") {
      let meta: LogMetadata | undefined;
      if (metadata && typeof metadata === "object") {
        meta = metadata as LogMetadata;
      } else if (metadata) {
        meta = { details: String(metadata) };
      }
      console.log(JSON.stringify({ level: "debug", message, ...meta }, null, 2));
    }
  },
};
