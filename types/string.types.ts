/**
 * String-related types and enums
 *
 * Contains types and enums for string manipulation, validation, and formatting.
 */

/**
 * String formatting types
 */
export type TStringFormat = "lowercase" | "uppercase" | "capitalize" | "title-case";

/**
 * String validation types
 */
export type TStringValidation = "email" | "url" | "phone" | "uuid" | "slug";

/**
 * Text truncation options
 */
export interface ITextTruncateOptions {
  maxLength: number;
  suffix?: string;
  preserveWords?: boolean;
  preserveHtml?: boolean;
}

/**
 * String search and replace options
 */
export interface IStringReplaceOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  preserveCase?: boolean;
  replaceAll?: boolean;
}

/**
 * Text encoding types
 */
export type TTextEncoding = "utf-8" | "ascii" | "base64" | "hex";

/**
 * String comparison types
 */
export type TStringComparison = "exact" | "contains" | "startsWith" | "endsWith" | "regex";

/**
 * Text processing result
 */
export interface ITextProcessingResult {
  original: string;
  processed: string;
  changes: string[];
  metadata: Record<string, unknown>;
}
