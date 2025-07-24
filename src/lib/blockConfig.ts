/**
 * utils/blockConfig.ts
 *
 * Block configuration system defining default properties for each block type
 * Centralizes sizing, colors, and naming conventions
 */

import { type StoreBlockType, type BlockConfig } from "../types";

// ===================================================================
// BLOCK CONFIGURATIONS
// ===================================================================

/**
 * Default configurations for each block type
 * Defines realistic sizes and appropriate colors for store elements
 */
const BLOCK_CONFIGS: Record<StoreBlockType, Omit<BlockConfig, "name">> = {
  // Structural elements
  wall: {
    width: 1, // 1m wide (standard wall thickness)
    height: 3, // 3m tall (standard ceiling height)
    color: "#8B4513", // Brown (brick/wood color)
  },

  room: {
    width: 4, // 4m x 4m (medium room size)
    height: 4,
    color: "#E6F3FF", // Light blue (semi-transparent)
  },

  building: {
    width: 20, // 20m x 20m (large building outline)
    height: 20,
    color: "#2D4A3E", // Dark green (structural)
  },

  // Store fixtures
  shelf: {
    width: 1, // 1m wide (standard shelf depth)
    height: 4, // 4m long (aisle-length shelving)
    color: "#DDD", // Light gray (metal shelving)
  },

  counter: {
    width: 2, // 2m wide (service counter)
    height: 1, // 1m deep (comfortable reach)
    color: "#8B4513", // Brown (wood counter)
  },

  checkout: {
    width: 2, // 2m wide (checkout station)
    height: 1.5, // 1.5m deep (space for equipment)
    color: "#FFD700", // Gold (premium checkout area)
  },

  // Access points
  entrance: {
    width: 2, // 2m wide (double door width)
    height: 0.2, // 0.2m deep (door thickness)
    color: "#90EE90", // Light green (entry/exit)
  },
};

// ===================================================================
// CONFIGURATION FUNCTIONS
// ===================================================================

/**
 * Gets default configuration for a specific block type
 * Includes auto-generated name with counter
 *
 * @param type - Block type to get config for
 * @param counter - Current counter for this block type (for naming)
 * @returns Complete block configuration
 *
 * Example:
 * getDefaultBlockConfig('wall', 3) -> {
 *   width: 1, height: 3, color: "#8B4513", name: "Wall 3"
 * }
 */
export const getDefaultBlockConfig = (
  type: StoreBlockType,
  counter: number
): BlockConfig => {
  const config = BLOCK_CONFIGS[type];
  const name = generateBlockName(type, counter);

  return {
    ...config,
    name,
  };
};

/**
 * Generates appropriate name for a block based on type and counter
 * Uses standard naming conventions for each block type
 *
 * @param type - Block type
 * @param counter - Current counter value
 * @returns Generated name string
 */
const generateBlockName = (type: StoreBlockType, counter: number): string => {
  const nameMap: Record<StoreBlockType, string> = {
    wall: `Wall ${counter}`,
    room: `Room ${counter}`,
    shelf: `Shelf ${counter}`,
    counter: `Counter ${counter}`,
    entrance: `Entrance ${counter}`,
    checkout: `Checkout ${counter}`,
    building: `Building ${counter}`,
  };

  return nameMap[type];
};

// ===================================================================
// BLOCK TYPE UTILITIES
// ===================================================================

/**
 * Gets all available block types
 * Useful for UI generation and validation
 */
export const getAllBlockTypes = (): StoreBlockType[] => {
  return Object.keys(BLOCK_CONFIGS) as StoreBlockType[];
};

/**
 * Checks if a block type exists
 * @param type - Type to validate
 * @returns True if type is valid
 */
export const isValidBlockType = (type: string): type is StoreBlockType => {
  return type in BLOCK_CONFIGS;
};

/**
 * Gets color for a specific block type
 * @param type - Block type
 * @returns Hex color string
 */
export const getBlockColor = (type: StoreBlockType): string => {
  return BLOCK_CONFIGS[type].color;
};

// ===================================================================
// SPECIAL RENDERING PROPERTIES
// ===================================================================

/**
 * Determines if a block should be rendered with special properties
 * Some blocks have unique rendering requirements
 */
export const getBlockRenderProperties = (type: StoreBlockType) => {
  return {
    // Buildings render as border-only (no fill)
    isBorderOnly: type === "building",

    // Rooms render semi-transparent
    opacity: type === "room" ? 0.3 : 0.8,

    // Can be rotated (buildings and rooms typically cannot)
    canRotate:
      type === "wall" ||
      type === "shelf" ||
      type === "counter" ||
      type === "entrance" ||
      type === "checkout",
  };
};
