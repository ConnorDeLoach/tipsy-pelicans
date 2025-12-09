/**
 * Centralized position configuration for consistent color coding across the app.
 */

// Map all known position values to their category
const POSITION_TO_CATEGORY: Record<string, PositionCategory> = {
  // Goalie
  G: "goalie",
  GOALIE: "goalie",

  // Forwards
  LW: "forward",
  RW: "forward",
  C: "forward",
  F: "forward",
  CENTER: "forward",
  "LEFT WING": "forward",
  "RIGHT WING": "forward",
  FORWARD: "forward",

  // Defense
  LD: "defense",
  RD: "defense",
  D: "defense",
  DEFENSE: "defense",
  "LEFT DEFENSE": "defense",
  "RIGHT DEFENSE": "defense",
};

export type PositionCategory = "goalie" | "forward" | "defense" | "unknown";

const CATEGORY_COLORS: Record<PositionCategory, string> = {
  goalie: "bg-amber-500",
  forward: "bg-rose-500",
  defense: "bg-indigo-500",
  unknown: "bg-muted-foreground/40",
};

/**
 * Normalize and categorize a position string.
 */
export function getPositionCategory(
  position: string | undefined | null
): PositionCategory {
  if (!position) return "unknown";
  const normalized = position.trim().toUpperCase();
  return POSITION_TO_CATEGORY[normalized] ?? "unknown";
}

/**
 * Get the Tailwind background color class for a position.
 */
export function getPositionColor(position: string | undefined | null): string {
  return CATEGORY_COLORS[getPositionCategory(position)];
}
