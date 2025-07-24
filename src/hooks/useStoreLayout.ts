/**
 * hooks/useStoreLayout.ts
 *
 * Main state management hook for the Store Layout Editor with DXF import functionality
 * Centralizes all business logic for block management, pathfinding, editor state, and imports
 */

import { useState, useCallback } from "react";
import {
  type StoreBlock,
  type PathPoint,
  type StoreBlockType,
  type Point,
} from "../types";
import {
  checkCollisionOptimized,
  findOverlappingBlocks,
} from "@/lib/collision";
import { getDefaultBlockConfig } from "@/lib/blockConfig";
import { snapToGrid } from "@/lib/geometry";

// ===================================================================
// IMPORT TYPES
// ===================================================================

interface ImportOptions {
  replaceExisting?: boolean;
  offsetX?: number;
  offsetY?: number;
  scaleFactor?: number;
}

interface DXFImportResult {
  success: boolean;
  blocksImported: number;
  message: string;
  bounds?: {
    width: number;
    height: number;
  };
}

// ===================================================================
// ID GENERATION
// ===================================================================

/**
 * Simple ID generator to replace external UUID library
 * Creates unique IDs using random strings and timestamps
 */
const generateId = (): string => {
  return (
    "id-" +
    Math.random().toString(36).substr(2, 9) +
    "-" +
    Date.now().toString(36)
  );
};

// ===================================================================
// MAIN HOOK
// ===================================================================

/**
 * Main state management hook for store layout functionality
 *
 * Features:
 * - Block management (create, update, delete, rotate)
 * - Pathfinding points (start/end markers)
 * - Name editing system
 * - Selection management
 * - Counter tracking for auto-naming
 * - Overlap detection and management
 * - DXF file import functionality
 *
 * @returns Object containing state and actions
 */
export const useStoreLayout = () => {
  // ===================================================================
  // CORE STATE
  // ===================================================================

  const [blocks, setBlocks] = useState<StoreBlock[]>([]);
  const [pathPoints, setPathPoints] = useState<PathPoint[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // ===================================================================
  // OVERLAP MANAGEMENT
  // ===================================================================

  const [allowOverlap, setAllowOverlap] = useState(false);
  const [overlappingBlocks, setOverlappingBlocks] = useState<Set<string>>(
    new Set()
  );

  // ===================================================================
  // EDITING STATE
  // ===================================================================

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");

  // ===================================================================
  // COUNTERS FOR AUTO-NAMING
  // ===================================================================

  const [counters, setCounters] = useState({
    wall: 1,
    room: 1,
    shelf: 1,
    counter: 1,
    entrance: 1,
    checkout: 1,
    building: 1,
  });

  // ===================================================================
  // OVERLAP UTILITIES
  // ===================================================================

  /**
   * Updates the set of overlapping blocks
   * Called whenever blocks change and overlap is allowed
   */
  const updateOverlappingBlocks = useCallback(
    (currentBlocks: StoreBlock[]) => {
      if (!allowOverlap) {
        setOverlappingBlocks(new Set());
        return;
      }

      const overlapping = findOverlappingBlocks(currentBlocks);
      setOverlappingBlocks(overlapping);
    },
    [allowOverlap]
  );

  /**
   * Toggles overlap mode and updates overlapping blocks
   */
  const toggleOverlapMode = useCallback(() => {
    const newAllowOverlap = !allowOverlap;
    setAllowOverlap(newAllowOverlap);

    if (newAllowOverlap) {
      updateOverlappingBlocks(blocks);
    } else {
      setOverlappingBlocks(new Set());
    }
  }, [allowOverlap, blocks, updateOverlappingBlocks]);

  // ===================================================================
  // DXF IMPORT FUNCTIONALITY
  // ===================================================================

  /**
   * Imports blocks from DXF file or other sources
   * Can either replace all blocks or merge with existing ones
   *
   * @param importedBlocks - Array of blocks to import
   * @param options - Import configuration options
   */
  const importBlocks = useCallback(
    (
      importedBlocks: StoreBlock[],
      options: ImportOptions = {}
    ): DXFImportResult => {
      const { replaceExisting = true, offsetX = 0, offsetY = 0 } = options;

      try {
        // Apply offset if needed and ensure unique IDs
        const adjustedBlocks = importedBlocks.map((block) => ({
          ...block,
          x: block.x + offsetX,
          y: block.y + offsetY,
          // Ensure unique IDs to avoid conflicts with existing blocks
          id: `${block.id}-imported-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
        }));

        if (replaceExisting) {
          // Replace all existing blocks
          setBlocks(adjustedBlocks);

          // Reset selection since old blocks are gone
          setSelectedBlockId(null);
          if (editingBlockId) {
            finishEditingName();
          }

          // Clear path points as layout has changed completely
          setPathPoints([]);
          setCurrentPath([]);
          setPathfindingMessage("");
        } else {
          // Merge with existing blocks
          setBlocks((prevBlocks) => [...prevBlocks, ...adjustedBlocks]);
        }

        // Update counters based on imported blocks
        const newCounters = { ...counters };
        adjustedBlocks.forEach((block) => {
          const typeCount = adjustedBlocks.filter(
            (b) => b.type === block.type
          ).length;
          newCounters[block.type] = Math.max(
            newCounters[block.type],
            typeCount + 1
          );
        });
        setCounters(newCounters);

        // Update overlapping blocks if overlap mode is enabled
        if (allowOverlap) {
          const allBlocks = replaceExisting
            ? adjustedBlocks
            : [...blocks, ...adjustedBlocks];
          updateOverlappingBlocks(allBlocks);
        }

        // Calculate bounds for the result
        let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity;
        adjustedBlocks.forEach((block) => {
          minX = Math.min(minX, block.x);
          maxX = Math.max(maxX, block.x + block.width);
          minY = Math.min(minY, block.y);
          maxY = Math.max(maxY, block.y + block.height);
        });

        console.log(
          `Successfully imported ${adjustedBlocks.length} blocks from external source`
        );

        return {
          success: true,
          blocksImported: adjustedBlocks.length,
          message: `Successfully imported ${adjustedBlocks.length} blocks`,
          bounds:
            adjustedBlocks.length > 0
              ? {
                  width: maxX - minX,
                  height: maxY - minY,
                }
              : undefined,
        };
      } catch (error) {
        console.error("Import error:", error);
        return {
          success: false,
          blocksImported: 0,
          message: `Import failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    },
    [blocks, counters, allowOverlap, editingBlockId, updateOverlappingBlocks]
  );

  /**
   * Clears all blocks and resets the layout
   */
  const clearLayout = useCallback(() => {
    setBlocks([]);
    setSelectedBlockId(null);
    if (editingBlockId) {
      finishEditingName();
    }
    setPathPoints([]);
    setCurrentPath([]);
    setPathfindingMessage("");
    setOverlappingBlocks(new Set());

    // Reset counters
    setCounters({
      wall: 1,
      room: 1,
      shelf: 1,
      counter: 1,
      entrance: 1,
      checkout: 1,
      building: 1,
    });
  }, [editingBlockId]);

  // ===================================================================
  // BLOCK MANAGEMENT
  // ===================================================================

  /**
   * Adds a new block to the layout
   * Handles collision detection, grid snapping, and counter increment
   *
   * @param worldPos - Position in world coordinates (meters)
   * @param type - Type of block to create
   */
  const addBlock = useCallback(
    (worldPos: Point, type: StoreBlockType) => {
      const counter = counters[type];
      const config = getDefaultBlockConfig(type, counter);

      const snappedX = snapToGrid(worldPos.x);
      const snappedY = snapToGrid(worldPos.y);

      const newBlock: StoreBlock = {
        id: `${type}-${generateId()}`,
        x: snappedX,
        y: snappedY,
        width: config.width,
        height: config.height,
        type,
        name: config.name,
        rotation: 0,
        color: config.color,
      };

      // Check for collisions before placing (if overlap not allowed)
      if (!allowOverlap) {
        const hasCollision = checkCollisionOptimized(newBlock, blocks);
        if (hasCollision) {
          alert(
            "Cannot place block here - it would overlap with another block!"
          );
          return;
        }
      }

      // Add block and increment counter
      const newBlocks = [...blocks, newBlock];
      setBlocks(newBlocks);
      setCounters((prev) => ({
        ...prev,
        [type]: prev[type] + 1,
      }));

      // Update overlapping blocks if overlap is allowed
      if (allowOverlap) {
        updateOverlappingBlocks(newBlocks);
      }
    },
    [blocks, counters, allowOverlap, updateOverlappingBlocks]
  );

  /**
   * Updates position of an existing block
   * Includes collision validation when overlap is disabled
   *
   * @param blockId - ID of block to move
   * @param newX - New X position in meters
   * @param newY - New Y position in meters
   */
  const updateBlockPosition = useCallback(
    (blockId: string, newX: number, newY: number) => {
      setBlocks((prevBlocks) => {
        const newBlocks = prevBlocks.map((block) => {
          if (block.id === blockId) {
            const updatedBlock = { ...block, x: newX, y: newY };

            // Validate new position if overlap not allowed
            if (!allowOverlap) {
              const hasCollision = checkCollisionOptimized(
                updatedBlock,
                prevBlocks,
                blockId
              );
              if (hasCollision) {
                return block; // Keep original position if collision
              }
            }

            return updatedBlock;
          }
          return block;
        });

        // Update overlapping blocks if overlap is allowed
        if (allowOverlap) {
          updateOverlappingBlocks(newBlocks);
        }

        return newBlocks;
      });
    },
    [allowOverlap, updateOverlappingBlocks]
  );

  /**
   * Updates size of an existing block
   * Includes collision validation when overlap is disabled
   *
   * @param blockId - ID of block to resize
   * @param newWidth - New width in meters
   * @param newHeight - New height in meters
   */
  const updateBlockSize = useCallback(
    (blockId: string, newWidth: number, newHeight: number) => {
      setBlocks((prevBlocks) => {
        const newBlocks = prevBlocks.map((block) => {
          if (block.id === blockId) {
            const updatedBlock = {
              ...block,
              width: newWidth,
              height: newHeight,
            };

            // Validate new size if overlap not allowed
            if (!allowOverlap) {
              const hasCollision = checkCollisionOptimized(
                updatedBlock,
                prevBlocks,
                blockId
              );
              if (hasCollision) {
                return block; // Keep original size if collision
              }
            }

            return updatedBlock;
          }
          return block;
        });

        // Update overlapping blocks if overlap is allowed
        if (allowOverlap) {
          updateOverlappingBlocks(newBlocks);
        }

        return newBlocks;
      });
    },
    [allowOverlap, updateOverlappingBlocks]
  );

  /**
   * Rotates the currently selected block by 90 degrees
   * Swaps width/height and validates new orientation
   */
  const rotateSelectedBlock = useCallback(() => {
    if (!selectedBlockId) return;

    setBlocks((prevBlocks) => {
      const newBlocks = prevBlocks.map((block) => {
        if (block.id === selectedBlockId) {
          const newRotation = ((block.rotation + 90) % 360) as
            | 0
            | 90
            | 180
            | 270;

          // Swap dimensions for 90/270 degree rotations
          let newWidth = block.width;
          let newHeight = block.height;
          if (newRotation === 90 || newRotation === 270) {
            newWidth = block.height;
            newHeight = block.width;
          }

          const updatedBlock = {
            ...block,
            rotation: newRotation,
            width: newWidth,
            height: newHeight,
          };

          // Validate rotation doesn't cause collision if overlap not allowed
          if (!allowOverlap) {
            const hasCollision = checkCollisionOptimized(
              updatedBlock,
              prevBlocks,
              selectedBlockId
            );
            if (hasCollision) {
              return block; // Keep original if rotation causes collision
            }
          }

          return updatedBlock;
        }
        return block;
      });

      // Update overlapping blocks if overlap is allowed
      if (allowOverlap) {
        updateOverlappingBlocks(newBlocks);
      }

      return newBlocks;
    });
  }, [selectedBlockId, allowOverlap, updateOverlappingBlocks]);

  /**
   * Deletes the currently selected block
   */
  const deleteSelected = useCallback(() => {
    if (selectedBlockId) {
      setBlocks((prev) => {
        const newBlocks = prev.filter((block) => block.id !== selectedBlockId);

        // Update overlapping blocks if overlap is allowed
        if (allowOverlap) {
          updateOverlappingBlocks(newBlocks);
        }

        return newBlocks;
      });
      setSelectedBlockId(null);
    }
  }, [selectedBlockId, allowOverlap, updateOverlappingBlocks]);

  // ===================================================================
  // NAME EDITING SYSTEM
  // ===================================================================

  /**
   * Starts editing a block's name
   * @param blockId - ID of block to edit
   */
  const startEditingName = useCallback(
    (blockId: string) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;

      setEditingBlockId(blockId);
      setTempName(block.name);
      setSelectedBlockId(blockId);
    },
    [blocks]
  );

  /**
   * Finishes editing and saves the new name
   */
  const finishEditingName = useCallback(() => {
    if (editingBlockId) {
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === editingBlockId ? { ...b, name: tempName || b.name } : b
        )
      );
    }
    setEditingBlockId(null);
    setTempName("");
  }, [editingBlockId, tempName]);

  // ===================================================================
  // PATHFINDING SYSTEM
  // ===================================================================

  /**
   * Adds a pathfinding point (start or end)
   * Replaces existing point of same type
   *
   * @param worldPos - Position in world coordinates
   * @param type - "start" or "end"
   */
  const addPathPoint = useCallback((worldPos: Point, type: "start" | "end") => {
    const snappedX = snapToGrid(worldPos.x);
    const snappedY = snapToGrid(worldPos.y);

    // Remove existing point of same type
    setPathPoints((prev) => prev.filter((point) => point.type !== type));

    // Add new point
    const newPoint: PathPoint = {
      id: `${type}-${generateId()}`,
      x: snappedX,
      y: snappedY,
      type,
    };

    setPathPoints((prev) => [...prev, newPoint]);
  }, []);

  /**
   * Clears all pathfinding points and path
   */
  const clearPathPoints = useCallback(() => {
    setPathPoints([]);
    setCurrentPath([]);
    setPathfindingMessage("");
  }, []);

  // ===================================================================
  // PATH VISUALIZATION
  // ===================================================================

  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [pathfindingMessage, setPathfindingMessage] = useState<string>("");

  /**
   * Executes pathfinding algorithm and displays result
   */
  const findPath = useCallback(() => {
    const startPoint = pathPoints.find((p) => p.type === "start");
    const endPoint = pathPoints.find((p) => p.type === "end");

    if (!startPoint || !endPoint) {
      setPathfindingMessage("Please place both start and end points!");
      setCurrentPath([]);
      return;
    }

    // Dynamic import to avoid bundling issues
    import("@/lib/pathfinding")
      .then(({ findPath: pathfindingAlgorithm, optimizePath }) => {
        const result = pathfindingAlgorithm(
          { x: startPoint.x, y: startPoint.y },
          { x: endPoint.x, y: endPoint.y },
          blocks
        );

        if (result.success) {
          const optimizedPath = optimizePath(result.path);
          setCurrentPath(optimizedPath);
          setPathfindingMessage(result.message);
        } else {
          setCurrentPath([]);
          setPathfindingMessage(result.message);
        }
      })
      .catch(() => {
        setPathfindingMessage("Error loading pathfinding algorithm");
        setCurrentPath([]);
      });
  }, [pathPoints, blocks]);

  /**
   * Clears the current path visualization
   */
  const clearPath = useCallback(() => {
    setCurrentPath([]);
    setPathfindingMessage("");
  }, []);

  // ===================================================================
  // RETURN INTERFACE
  // ===================================================================

  return {
    // State
    blocks,
    pathPoints,
    selectedBlockId,
    editingBlockId,
    tempName,

    // Overlap state
    allowOverlap,
    overlappingBlocks,

    // Path visualization state
    currentPath,
    pathfindingMessage,

    // Block actions
    addBlock,
    updateBlockPosition,
    updateBlockSize,
    rotateSelectedBlock,
    deleteSelected,

    // Selection actions
    setSelectedBlockId,

    // Name editing actions
    startEditingName,
    finishEditingName,
    setTempName,

    // Pathfinding actions
    addPathPoint,
    clearPathPoints,
    findPath,
    clearPath,

    // Overlap actions
    toggleOverlapMode,

    // Import/Export actions
    importBlocks,
    clearLayout,
  };
};
