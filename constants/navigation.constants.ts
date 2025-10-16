/**
 * Navigation-related constants
 *
 * Contains simple constants for navigation functionality that don't require enums.
 */

/**
 * CSS class names for navigation styling
 */
export const NAVIGATION_STYLES = {
  BASE_CLASSES: "text-sm font-medium transition-colors",
  ACTIVE_CLASSES: "text-blue-600 dark:text-blue-400",
  INACTIVE_CLASSES: "text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300",
} as const;

/**
 * Navigation configuration
 */
export const NAVIGATION_CONFIG = {
  LOGO_SIZE: 45,
  MAX_NAV_ITEMS: 10,
} as const;
