/**
 * utils/pathfinding.ts
 *
 * A* pathfinding algorithm for store layout navigation
 * Creates optimal paths avoiding obstacles with configurable clearance
 */

import { type StoreBlock, type PathPoint, type Point } from "../types";

// ===================================================================
// PATHFINDING CONFIGURATION
// ===================================================================

/**
 * Minimum clearance distance around obstacles (in meters)
 * This ensures the path maintains safe distance from blocks
 */
export const PATHFINDING_CLEARANCE = 0.1;

/**
 * Grid resolution for pathfinding (in meters)
 * Smaller values = more precise paths but slower computation
 */
export const PATHFINDING_GRID_SIZE = 0.4;

/**
 * Maximum search iterations to prevent infinite loops
 */
export const MAX_PATHFINDING_ITERATIONS = 20000;

// ===================================================================
// PATHFINDING TYPES
// ===================================================================

/**
 * Pathfinding node for A* algorithm
 */
interface PathNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic cost to end
  f: number; // Total cost (g + h)
  parent: PathNode | null;
}

/**
 * Result of pathfinding operation
 */
export interface PathfindingResult {
  success: boolean;
  path: Point[];
  distance: number;
  message: string;
}

// ===================================================================
// GRID AND COLLISION DETECTION
// ===================================================================

/**
 * Checks if a point is blocked by any obstacle
 * Includes clearance distance around blocks
 */
const isPointBlocked = (
  x: number,
  y: number,
  blocks: StoreBlock[],
  clearance: number = PATHFINDING_CLEARANCE
): boolean => {
  for (const block of blocks) {
    // Expand block bounds by clearance distance
    const minX = block.x - clearance;
    const maxX = block.x + block.width + clearance;
    const minY = block.y - clearance;
    const maxY = block.y + block.height + clearance;

    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      return true;
    }
  }
  return false;
};

/**
 * Gets valid neighboring nodes (only horizontal/vertical movement)
 */
const getNeighbors = (
  node: PathNode,
  blocks: StoreBlock[],
  gridSize: number = PATHFINDING_GRID_SIZE
): Point[] => {
  const neighbors: Point[] = [
    { x: node.x + gridSize, y: node.y }, // Right
    { x: node.x - gridSize, y: node.y }, // Left
    { x: node.x, y: node.y + gridSize }, // Down
    { x: node.x, y: node.y - gridSize }, // Up
  ];

  // Filter out blocked positions
  return neighbors.filter(
    (neighbor) => !isPointBlocked(neighbor.x, neighbor.y, blocks)
  );
};

// ===================================================================
// A* ALGORITHM IMPLEMENTATION
// ===================================================================

/**
 * Manhattan distance heuristic (no diagonals)
 */
const manhattanDistance = (a: Point, b: Point): number => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

/**
 * Converts point to string key for efficient lookup
 */
const pointToKey = (point: Point): string => {
  return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
};

/**
 * Reconstructs path from end node back to start
 */
const reconstructPath = (endNode: PathNode): Point[] => {
  const path: Point[] = [];
  let current: PathNode | null = endNode;

  while (current) {
    path.unshift({ x: current.x, y: current.y });
    current = current.parent;
  }

  return path;
};

/**
 * A* pathfinding algorithm
 * Finds optimal path from start to end avoiding obstacles
 */
export const findPath = (
  start: Point,
  end: Point,
  blocks: StoreBlock[]
): PathfindingResult => {
  // Snap start and end to grid
  const gridSize = PATHFINDING_GRID_SIZE;
  const startSnapped = {
    x: Math.round(start.x / gridSize) * gridSize,
    y: Math.round(start.y / gridSize) * gridSize,
  };
  const endSnapped = {
    x: Math.round(end.x / gridSize) * gridSize,
    y: Math.round(end.y / gridSize) * gridSize,
  };

  // Check if start or end points are blocked
  if (isPointBlocked(startSnapped.x, startSnapped.y, blocks)) {
    return {
      success: false,
      path: [],
      distance: 0,
      message: "Start point is blocked or too close to obstacles",
    };
  }

  if (isPointBlocked(endSnapped.x, endSnapped.y, blocks)) {
    return {
      success: false,
      path: [],
      distance: 0,
      message: "End point is blocked or too close to obstacles",
    };
  }

  // Initialize A* algorithm
  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();
  const gScore = new Map<string, number>();

  const startNode: PathNode = {
    x: startSnapped.x,
    y: startSnapped.y,
    g: 0,
    h: manhattanDistance(startSnapped, endSnapped),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;

  openSet.push(startNode);
  gScore.set(pointToKey(startSnapped), 0);

  let iterations = 0;

  while (openSet.length > 0 && iterations < MAX_PATHFINDING_ITERATIONS) {
    iterations++;

    // Get node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const currentNode = openSet.shift()!;
    const currentKey = pointToKey(currentNode);

    // Check if we reached the goal
    if (
      Math.abs(currentNode.x - endSnapped.x) < gridSize / 2 &&
      Math.abs(currentNode.y - endSnapped.y) < gridSize / 2
    ) {
      const path = reconstructPath(currentNode);
      const distance = currentNode.g;

      return {
        success: true,
        path,
        distance,
        message: `Path found! Distance: ${distance.toFixed(
          1
        )}m (${iterations} iterations)`,
      };
    }

    closedSet.add(currentKey);

    // Explore neighbors
    const neighbors = getNeighbors(currentNode, blocks, gridSize);

    for (const neighbor of neighbors) {
      const neighborKey = pointToKey(neighbor);

      if (closedSet.has(neighborKey)) {
        continue;
      }

      const tentativeG = currentNode.g + gridSize;
      const currentG = gScore.get(neighborKey) ?? Infinity;

      if (tentativeG < currentG) {
        const neighborNode: PathNode = {
          x: neighbor.x,
          y: neighbor.y,
          g: tentativeG,
          h: manhattanDistance(neighbor, endSnapped),
          f: 0,
          parent: currentNode,
        };
        neighborNode.f = neighborNode.g + neighborNode.h;

        gScore.set(neighborKey, tentativeG);

        // Add to open set if not already there
        const existingIndex = openSet.findIndex(
          (node) => pointToKey(node) === neighborKey
        );
        if (existingIndex >= 0) {
          openSet[existingIndex] = neighborNode;
        } else {
          openSet.push(neighborNode);
        }
      }
    }
  }

  // No path found
  return {
    success: false,
    path: [],
    distance: 0,
    message:
      iterations >= MAX_PATHFINDING_ITERATIONS
        ? "Pathfinding timeout - layout may be too complex"
        : "No path found - destination may be unreachable",
  };
};

// ===================================================================
// PATH OPTIMIZATION
// ===================================================================

/**
 * Simplifies path by removing unnecessary waypoints
 * Reduces visual clutter while maintaining path accuracy
 */
export const optimizePath = (path: Point[]): Point[] => {
  if (path.length <= 2) return path;

  const optimized: Point[] = [path[0]]; // Always keep start point

  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const current = path[i];
    const next = path[i + 1];

    // Keep point if direction changes
    const dir1 = {
      x: current.x - prev.x,
      y: current.y - prev.y,
    };
    const dir2 = {
      x: next.x - current.x,
      y: next.y - current.y,
    };

    // If direction changes, keep this waypoint
    if (dir1.x !== dir2.x || dir1.y !== dir2.y) {
      optimized.push(current);
    }
  }

  optimized.push(path[path.length - 1]); // Always keep end point
  return optimized;
};

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Calculates total path distance
 */
export const calculatePathDistance = (path: Point[]): number => {
  let distance = 0;
  for (let i = 1; i < path.length; i++) {
    distance += manhattanDistance(path[i - 1], path[i]);
  }
  return distance;
};

/**
 * Validates if path points are reachable
 */
export const validatePathPoints = (
  pathPoints: PathPoint[],
  blocks: StoreBlock[]
): { valid: boolean; message: string } => {
  const start = pathPoints.find((p) => p.type === "start");
  const end = pathPoints.find((p) => p.type === "end");

  if (!start || !end) {
    return {
      valid: false,
      message: "Both start and end points are required",
    };
  }

  if (isPointBlocked(start.x, start.y, blocks)) {
    return {
      valid: false,
      message: "Start point is too close to obstacles",
    };
  }

  if (isPointBlocked(end.x, end.y, blocks)) {
    return {
      valid: false,
      message: "End point is too close to obstacles",
    };
  }

  return {
    valid: true,
    message: "Path points are valid",
  };
};
