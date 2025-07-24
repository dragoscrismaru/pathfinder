/**
 * types/index.ts
 *
 * Core type definitions for the Store Layout Editor
 * Defines all interfaces, types, and constants used throughout the application
 */

// ===================================================================
// CONFIGURATION CONSTANTS
// ===================================================================

/**
 * Visual scaling and grid configuration
 * - METER_SIZE: Pixels per meter for screen rendering
 * - GRID_SIZE: Grid spacing in meters
 * - SCALE: Combined scaling factor for coordinate conversion
 */
export const METER_SIZE = 50;
export const GRID_SIZE = 1;
export const SCALE = METER_SIZE;

// ===================================================================
// CORE TYPES
// ===================================================================

/**
 * Available block types for store layout design
 * Each represents a different physical element:
 * - wall: Interior/exterior walls
 * - room: Defined spaces/areas
 * - shelf: Product display shelving
 * - counter: Service/checkout counters
 * - entrance: Entry/exit points
 * - checkout: Cash register areas
 * - building: Overall building outline
 */
export type StoreBlockType =
  | "wall"
  | "room"
  | "shelf"
  | "counter"
  | "entrance"
  | "checkout"
  | "building";

/**
 * Core block interface representing any placeable element
 * All coordinates use meter-based world coordinates
 */
export interface StoreBlock {
  id: string; // Unique identifier
  x: number; // X position in meters (world coordinates)
  y: number; // Y position in meters (world coordinates)
  width: number; // Width in meters
  height: number; // Height in meters
  type: StoreBlockType; // Block type/category
  name: string; // Display name (user-editable)
  rotation: 0 | 90 | 180 | 270; // Rotation in degrees
  color?: string; // Optional color override
}

/**
 * Pathfinding markers for route planning
 * Used to mark start and end points for navigation
 */
export interface PathPoint {
  id: string;
  x: number; // X position in meters
  y: number; // Y position in meters
  type: "start" | "end"; // Point type for pathfinding
}

/**
 * Available tools in the editor toolbar
 * Controls what action happens on canvas clicks
 */
export type Tool =
  | "select" // Selection/manipulation mode
  | "add-wall" // Place wall blocks
  | "add-room" // Place room blocks
  | "add-shelf" // Place shelf blocks
  | "add-counter" // Place counter blocks
  | "add-entrance" // Place entrance blocks
  | "add-checkout" // Place checkout blocks
  | "add-building" // Place building blocks
  | "add-start" // Place start point for pathfinding
  | "add-end"; // Place end point for pathfinding

// ===================================================================
// UTILITY TYPES
// ===================================================================

/**
 * 2D coordinate interface for positions and vectors
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Pan/zoom offset for viewport transformation
 */
export interface ViewportOffset {
  x: number;
  y: number;
}

/**
 * Block configuration for default properties
 */
export interface BlockConfig {
  width: number;
  height: number;
  name: string;
  color: string;
}
