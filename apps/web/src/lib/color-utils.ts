/**
 * Color utility functions for converting CSS template variables to hex/rgb values.
 * Used in area form and other components that need to send colors to the API.
 */

/**
 * Mapping of CSS template variable names to their hex color values.
 * These correspond to the --color-* definitions in globals.css
 */
const COLOR_TEMPLATE_MAP: Record<string, string> = {
  "var(--color-primary)": "#C32033",           // 353 72% 44% - MECCAYA Red
  "var(--color-secondary)": "#EEEBEA",         // Warm Light Gray
  "var(--color-destructive)": "#DC2626",       // Destructive Red
  "var(--color-accent)": "#FDF7ED",            // Warm Gold Tinted Neutral
  "var(--color-success)": "#16A34A",           // Green
  "var(--color-warning)": "#EAA438",           // 36 80% 55% - MECCAYA Amber/Gold Accent
  "var(--color-muted)": "#E4E0DE",             // Muted Warm Gray
  "var(--color-info)": "#0EA5E9",              // Cyan
  "var(--color-purple)": "#A855F7",            // Purple
  "var(--color-cyan)": "#06B6D4",              // Cyan
  "var(--color-rose)": "#C32033",              // Rose / Crimson Red
};

/**
 * Converts a CSS color (template variable or hex/rgb) to a normalized hex value.
 * If the color is a template variable, converts it to hex.
 * If already hex/rgb, returns as-is (trimmed).
 *
 * @param color - The CSS color value (e.g., "var(--color-primary)" or "#FF0000")
 * @returns Normalized color value (hex string)
 */
export function normalizeColorForAPI(color: string | null | undefined): string {
  if (!color) return "#C32033"; // Default to MECCAYA primary red

  const trimmed = color.trim();

  // Check if it's a template variable
  if (trimmed in COLOR_TEMPLATE_MAP) {
    return COLOR_TEMPLATE_MAP[trimmed];
  }

  // If it's already a valid color format (hex, rgb, etc.), return as-is
  if (isValidCSSColor(trimmed)) {
    return trimmed;
  }

  // Fallback to primary blue
  return "#3B82F6";
}

/**
 * Validates if a string is a valid CSS color format.
 */
function isValidCSSColor(color: string): boolean {
  // Hex color: #RGB, #RRGGBB, #RGBA, #RRGGBBAA
  if (/^#([0-9A-Fa-f]{3}){1,2}([0-9A-Fa-f]{2})?$/.test(color)) {
    return true;
  }

  // rgb/rgba: rgb(255, 0, 0) or rgba(255, 0, 0, 0.5)
  if (/^rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+(\s*,\s*[\d.]+)?\s*\)$/.test(color)) {
    return true;
  }

  // hsl/hsla: hsl(0, 100%, 50%) or hsla(0, 100%, 50%, 0.5)
  if (/^hsla?\s*\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%(\s*,\s*[\d.]+)?\s*\)$/.test(color)) {
    return true;
  }

  // CSS named colors (basic check)
  const namedColors = [
    "red", "green", "blue", "black", "white", "gray", "yellow", "orange",
    "purple", "pink", "cyan", "brown", "lime", "navy", "teal", "olive",
  ];
  if (namedColors.includes(color.toLowerCase())) {
    return true;
  }

  return false;
}

/**
 * Get all available template colors for display.
 */
export function getTemplateColors(): Array<{ template: string; hex: string }> {
  return Object.entries(COLOR_TEMPLATE_MAP).map(([template, hex]) => ({
    template,
    hex,
  }));
}
