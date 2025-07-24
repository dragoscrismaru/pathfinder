import { useState, useCallback, useEffect } from "react";
import { api } from "@/trpc/react";
import type { StoreBlock, PathPoint, StoreBlockType, Point } from "@/types";

// Helper functions
const getDefaultWidth = (type: StoreBlockType): number =>
  ({
    wall: 1,
    room: 4,
    shelf: 1,
    counter: 2,
    entrance: 2,
    checkout: 2,
    building: 20,
  })[type] || 1;

const getDefaultHeight = (type: StoreBlockType): number =>
  ({
    wall: 3,
    room: 4,
    shelf: 4,
    counter: 1,
    entrance: 0.2,
    checkout: 1.5,
    building: 20,
  })[type] || 1;

export const useLayoutEditor = (layoutId: string) => {
  // State
  const [blocks, setBlocks] = useState<StoreBlock[]>([]);
  const [pathPoints, setPathPoints] = useState<PathPoint[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);

  // tRPC
  const { data: layout, isLoading } = api.layout.getById.useQuery({
    // storeId: "", // Will be filled from layout data
    layoutId,
  });

  const updateLayoutMutation = api.store.updateLayout.useMutation({
    onSuccess: (data) => {
      console.log(
        `✅ Saved layout ${data.layoutId} with ${data.blocksCount} blocks`,
      );
      setHasUnsavedChanges(false);
      setLastSaveTime(new Date());
    },
    onError: (error) => {
      console.error("❌ Save failed:", error);
      alert(`Save failed: ${error.message}`);
    },
  });

  // Load layout data
  useEffect(() => {
    if (layout) {
      console.log(`📥 Loading layout: ${layout.name}`);
      setBlocks((layout.blocks as StoreBlock[]) || []);
      setPathPoints((layout.pathPoints as PathPoint[]) || []);
      setHasUnsavedChanges(false);
      setLastSaveTime(new Date(layout.updatedAt));
    }
  }, [layout]);

  // Save layout
  const saveLayout = useCallback(async () => {
    console.log(`💾 Saving layout ${layoutId}`);

    try {
      const result = await updateLayoutMutation.mutateAsync({
        layoutId,
        blocks,
        pathPoints,
      });

      console.log("✅ Save successful:", result);
      return { success: true };
    } catch (error) {
      console.error("❌ Save failed:", error);
      return { success: false, error };
    }
  }, [layoutId, blocks, pathPoints, updateLayoutMutation]);

  // Add block
  const addBlock = useCallback(
    (worldPos: Point, type: StoreBlockType) => {
      const newBlock: StoreBlock = {
        id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        x: worldPos.x,
        y: worldPos.y,
        width: getDefaultWidth(type),
        height: getDefaultHeight(type),
        type,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${blocks.length + 1}`,
      };

      setBlocks((prev) => [...prev, newBlock]);
      setHasUnsavedChanges(true);
    },
    [blocks.length],
  );

  // Add pathpoint
  const addPathPoint = useCallback((worldPos: Point, type: "start" | "end") => {
    setPathPoints((prev) => prev.filter((point) => point.type !== type));
    setPathPoints((prev) => [
      ...prev,
      {
        id: `${type}-${Date.now()}`,
        x: worldPos.x,
        y: worldPos.y,
        type,
      },
    ]);
    setHasUnsavedChanges(true);
  }, []);

  // Other methods (updateBlockPosition, rotateSelectedBlock, etc.)
  // ... implement similar to your existing useStoreLayout hook

  // Update block position
  const updateBlockPosition = useCallback(
    (blockId: string, x: number, y: number) => {
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === blockId ? { ...block, x, y } : block,
        ),
      );
      setHasUnsavedChanges(true);
    },
    [],
  );

  // Update block size
  const updateBlockSize = useCallback(
    (blockId: string, width: number, height: number) => {
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === blockId ? { ...block, width, height } : block,
        ),
      );
      setHasUnsavedChanges(true);
    },
    [],
  );

  // Rotate selected block (just swap dimensions)
  const rotateSelectedBlock = useCallback(() => {
    if (!selectedBlockId) return;

    setBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? { ...block, width: block.height, height: block.width }
          : block,
      ),
    );
    setHasUnsavedChanges(true);
  }, [selectedBlockId]);

  // Delete selected block
  const deleteSelected = useCallback(() => {
    if (!selectedBlockId) return;

    setBlocks((prev) => prev.filter((block) => block.id !== selectedBlockId));
    setSelectedBlockId(null);
    setHasUnsavedChanges(true);
  }, [selectedBlockId]);

  // Import blocks (for DXF import)
  const importBlocks = useCallback((importedBlocks: StoreBlock[]) => {
    setBlocks(importedBlocks);
    setHasUnsavedChanges(true);
    return { success: true, blocksImported: importedBlocks.length };
  }, []);

  // Clear layout
  const clearLayout = useCallback(() => {
    setBlocks([]);
    setPathPoints([]);
    setHasUnsavedChanges(true);
  }, []);

  // Pathfinding methods (simplified for now)
  const findPath = useCallback(() => {
    // Your existing pathfinding logic
    console.log("🗺️ Finding path between start and end points");
  }, []);

  const clearPathPoints = useCallback(() => {
    setPathPoints([]);
    setHasUnsavedChanges(true);
  }, []);

  const clearPath = useCallback(() => {
    // Clear current path visualization
    console.log("🗺️ Clearing path visualization");
  }, []);

  // Overlap mode (simplified for now)
  const [allowOverlap, setAllowOverlap] = useState(false);
  const [overlappingBlocks] = useState<Set<string>>(new Set());

  const toggleOverlapMode = useCallback(() => {
    setAllowOverlap((prev) => !prev);
  }, []);

  // Name editing (simplified for now)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");

  const startEditingName = useCallback(
    (blockId: string) => {
      const block = blocks.find((b) => b.id === blockId);
      if (block) {
        setEditingBlockId(blockId);
        setTempName(block.name);
      }
    },
    [blocks],
  );

  const finishEditingName = useCallback(() => {
    if (editingBlockId && tempName.trim()) {
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === editingBlockId
            ? { ...block, name: tempName.trim() }
            : block,
        ),
      );
      setHasUnsavedChanges(true);
    }
    setEditingBlockId(null);
    setTempName("");
  }, [editingBlockId, tempName]);

  return {
    // Data
    blocks,
    pathPoints,
    selectedBlockId,
    editingBlockId,
    tempName,
    allowOverlap,
    overlappingBlocks,
    currentPath: [], // TODO: implement pathfinding visualization
    pathfindingMessage: "", // TODO: implement pathfinding messages

    // Loading states
    loading: isLoading,
    saving: updateLayoutMutation.isLoading,
    hasUnsavedChanges,
    lastSaveTime,

    // Block operations
    addBlock,
    updateBlockPosition,
    updateBlockSize,
    rotateSelectedBlock,
    deleteSelected,
    setSelectedBlockId,

    // Name editing
    startEditingName,
    finishEditingName,
    setTempName,

    // Path operations
    addPathPoint,
    clearPathPoints,
    findPath,
    clearPath,

    // Layout operations
    saveLayout,
    importBlocks,
    clearLayout,
    toggleOverlapMode,
  };
};
