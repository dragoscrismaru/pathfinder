/**
 * utils/geometry.ts
 *
 * Coordinate system conversion and geometric utility functions
 * Handles transformations between world coordinates (meters) and screen coordinates (pixels)
 */

import { SCALE, GRID_SIZE, type Point, type ViewportOffset } from "../types";

// ===================================================================
// GRID SNAPPING
// ===================================================================

/**
 * Snaps a value to the nearest 0.1 meter grid point
 * Provides precise alignment for decimal measurements
 *
 * @param value - Value in meters to snap
 * @returns Snapped value aligned to 0.1m grid
 *
 * Example:
 * snapToGrid(1.07) -> 1.1
 * snapToGrid(2.94) -> 2.9
 */
export const snapToGrid = (value: number): number => {
  return Math.round(value / (GRID_SIZE * 0.1)) * (GRID_SIZE * 0.1);
};

// ===================================================================
// COORDINATE CONVERSION
// ===================================================================

/**
 * Converts world coordinates (meters) to screen coordinates (pixels)
 * Accounts for pan offset and scaling factor
 *
 * @param x - X coordinate in meters
 * @param y - Y coordinate in meters
 * @param panOffset - Current viewport pan offset
 * @returns Screen coordinates in pixels
 */
export const worldToScreen = (
  x: number,
  y: number,
  panOffset: ViewportOffset
): Point => ({
  x: x * SCALE + panOffset.x,
  y: y * SCALE + panOffset.y,
});

/**
 * Converts screen coordinates (pixels) to world coordinates (meters)
 * Inverse of worldToScreen, accounts for pan offset and scaling
 *
 * @param x - X coordinate in pixels
 * @param y - Y coordinate in pixels
 * @param panOffset - Current viewport pan offset
 * @returns World coordinates in meters
 */
export const screenToWorld = (
  x: number,
  y: number,
  panOffset: ViewportOffset
): Point => ({
  x: (x - panOffset.x) / SCALE,
  y: (y - panOffset.y) / SCALE,
});

// ===================================================================
// MOUSE INTERACTION
// ===================================================================

/**
 * Gets accurate mouse position relative to SVG element
 * Essential for proper click detection and dragging
 *
 * @param e - React mouse event
 * @param svgRef - Reference to the SVG canvas element
 * @returns Mouse position in screen coordinates
 */
export const getMousePosition = (
  e: React.MouseEvent,
  svgRef: React.RefObject<SVGSVGElement>
): Point => {
  const rect = svgRef.current?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };

  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
};

// ===================================================================
// GEOMETRIC CALCULATIONS
// ===================================================================

/**
 * Calculates squared distance between two points
 * Uses squared distance to avoid expensive sqrt operations
 *
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Squared distance between points
 */
export const distanceSquared = (p1: Point, p2: Point): number => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return dx * dx + dy * dy;
};

/**
 * Checks if a point is within a rectangular bounds
 * Useful for hit testing and selection
 *
 * @param point - Point to test
 * @param bounds - Rectangle bounds {x, y, width, height}
 * @returns True if point is inside bounds
 */
export const pointInBounds = (
  point: Point,
  bounds: { x: number; y: number; width: number; height: number }
): boolean => {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
};
