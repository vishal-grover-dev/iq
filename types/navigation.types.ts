/**
 * Navigation-related types and enums
 *
 * Contains enums and types for navigation labels, routes, and related functionality.
 */

/**
 * Navigation menu labels
 */
export enum ENavigationLabels {
  UPLOAD = "Upload",
  GENERATE = "Generate",
  EVALUATE = "Evaluate",
}

/**
 * Navigation routes
 */
export enum ENavigationRoutes {
  HOME = "/",
  UPLOAD = "/upload",
  GENERATE = "/generate/mcq",
  EVALUATE = "/evaluate",
}

/**
 * Navigation link states
 */
export enum ENavigationStates {
  ACTIVE = "active",
  INACTIVE = "inactive",
}
