// src/app/stores/[storeId]/layouts/[layoutId]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/react";
import {
  type Tool,
  type Point,
  type ViewportOffset,
  type StoreBlockType,
} from "@/types";
// import { useLayoutEditor } from "@/hooks/useLayoutEditor";
import { snapToGrid } from "@/lib/geometry";
import { Toolbar } from "@/components/toolbar";
import { InfoPanel } from "@/components/InfoPanel";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import { Canvas } from "@/components/Canvas";
// import { useStoreLayout } from "@/hooks/useStoreLayout";
import { useLayoutEditor } from "@/hooks/useLayoutEditor";

export default function LayoutEditorPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;
  const layoutId = params.layoutId as string;

  // Get layout data
  const { data: layout, isLoading: layoutLoading } =
    api.layout.getById.useQuery({
      storeId,
      layoutId,
    });

  // Layout editing hook
  const {
    blocks,
    pathPoints,
    selectedBlockId,
    editingBlockId,
    tempName,
    allowOverlap,
    overlappingBlocks,
    currentPath,
    pathfindingMessage,
    loading,
    saving,
    hasUnsavedChanges,
    lastSaveTime,
    addBlock,
    updateBlockPosition,
    updateBlockSize,
    rotateSelectedBlock,
    deleteSelected,
    setSelectedBlockId,
    startEditingName,
    finishEditingName,
    setTempName,
    addPathPoint,
    clearPathPoints,
    findPath,
    clearPath,
    toggleOverlapMode,
    saveLayout,
    importBlocks,
    clearLayout,
  } = useLayoutEditor(layoutId);

  // UI state
  const [selectedTool, setSelectedTool] = useState<Tool>("select");
  const [panOffset, setPanOffset] = useState<ViewportOffset>({
    x: 400,
    y: 300,
  });

  // ===================================================================
  // EVENT HANDLERS
  // ===================================================================

  const handleSelectTool = useCallback(
    (tool: Tool) => {
      setSelectedTool(tool);
      if (tool !== "select") {
        setSelectedBlockId(null);
      }
    },
    [setSelectedBlockId],
  );

  const handleCanvasClick = useCallback(
    (worldPos: Point) => {
      const toolToBlockType: Partial<Record<Tool, StoreBlockType>> = {
        "add-wall": "wall",
        "add-room": "room",
        "add-shelf": "shelf",
        "add-counter": "counter",
        "add-entrance": "entrance",
        "add-checkout": "checkout",
        "add-building": "building",
      };

      const blockType = toolToBlockType[selectedTool];

      if (blockType) {
        addBlock(worldPos, blockType);
      } else if (selectedTool === "add-start") {
        addPathPoint(worldPos, "start");
      } else if (selectedTool === "add-end") {
        addPathPoint(worldPos, "end");
      }
    },
    [selectedTool, addBlock, addPathPoint],
  );

  const handleBlockClick = useCallback(
    (blockId: string, e: React.MouseEvent) => {
      setSelectedTool("select");
      setSelectedBlockId(blockId);
    },
    [setSelectedBlockId],
  );

  const handleBlockDrag = useCallback(
    (blockId: string, newX: number, newY: number) => {
      const snappedX = snapToGrid(newX);
      const snappedY = snapToGrid(newY);
      updateBlockPosition(blockId, snappedX, snappedY);
    },
    [updateBlockPosition],
  );

  const clearSelections = useCallback(() => {
    setSelectedBlockId(null);
    if (editingBlockId) {
      finishEditingName();
    }
  }, [setSelectedBlockId, editingBlockId, finishEditingName]);

  const handleDXFImport = useCallback(
    (importedBlocks: StoreBlock[]) => {
      try {
        console.log(`Attempting to import ${importedBlocks.length} blocks`);

        const result = importBlocks(importedBlocks);

        if (result.success) {
          console.log(`Successfully imported ${result.blocksImported} blocks`);
          setSelectedTool("select");
          clearSelections();
          setTimeout(() => {
            alert(
              `Successfully imported ${result.blocksImported} blocks from DXF file!`,
            );
          }, 100);
        } else {
          console.error("Import failed");
          alert("Import failed");
        }
      } catch (error) {
        console.error("DXF Import error:", error);
        alert(
          `Import error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },
    [importBlocks, clearSelections],
  );

  const handleClearLayout = useCallback(() => {
    try {
      clearLayout();
      setSelectedTool("select");
      console.log("Layout cleared successfully");
    } catch (error) {
      console.error("Clear layout error:", error);
      alert("Error clearing layout. Please try again.");
    }
  }, [clearLayout]);

  // ===================================================================
  // KEYBOARD SHORTCUTS
  // ===================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName.toLowerCase() === "input") {
        return;
      }

      switch (e.key) {
        case "1":
          handleSelectTool("select");
          break;
        case "2":
          handleSelectTool("add-wall");
          break;
        case "3":
          handleSelectTool("add-room");
          break;
        case "4":
          handleSelectTool("add-shelf");
          break;
        case "5":
          handleSelectTool("add-counter");
          break;
        case "6":
          handleSelectTool("add-entrance");
          break;
        case "7":
          handleSelectTool("add-checkout");
          break;
        case "8":
          handleSelectTool("add-building");
          break;
        case "9":
          handleSelectTool("add-start");
          break;
        case "0":
          handleSelectTool("add-end");
          break;
        case "Escape":
          handleSelectTool("select");
          clearSelections();
          break;
        case "Delete":
        case "Backspace":
          if (selectedBlockId && !editingBlockId) {
            deleteSelected();
          }
          break;
        case "r":
        case "R":
          if (selectedBlockId) {
            rotateSelectedBlock();
          }
          break;
        case "o":
        case "O":
          toggleOverlapMode();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedBlockId,
    editingBlockId,
    handleSelectTool,
    clearSelections,
    deleteSelected,
    rotateSelectedBlock,
    toggleOverlapMode,
  ]);

  // ===================================================================
  // LOADING AND ERROR STATES
  // ===================================================================

  if (layoutLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Loading layout editor...</p>
        </div>
      </div>
    );
  }

  if (!layout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Layout Not Found
          </h1>
          <p className="mb-6 text-gray-600">
            The layout you're looking for doesn't exist.
          </p>
          <Link
            href={`/stores/${storeId}`}
            className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
          >
            Back to Store
          </Link>
        </div>
      </div>
    );
  }

  // ===================================================================
  // MAIN RENDER
  // ===================================================================

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="absolute top-0 right-0 left-0 z-50 border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Left - Navigation */}
          <div className="flex items-center gap-3">
            <Link
              href={`/stores/${storeId}`}
              className="text-sm text-blue-500 hover:text-blue-700"
            >
              ← Back to {layout.store.name}
            </Link>
            <div className="h-4 w-px bg-gray-300" />
            <h1 className="font-semibold text-gray-900">{layout.name}</h1>
          </div>

          {/* Center - Save Status */}
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <span className="text-sm text-orange-600">● Unsaved changes</span>
            )}

            <button
              onClick={saveLayout}
              disabled={saving || !hasUnsavedChanges}
              className={`rounded px-4 py-2 font-medium transition-colors ${
                hasUnsavedChanges
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "cursor-not-allowed bg-gray-300 text-gray-500"
              }`}
            >
              {saving ? "💾 Saving..." : "💾 Save Layout"}
            </button>

            {lastSaveTime && !hasUnsavedChanges && (
              <span className="text-sm text-green-600">
                ✓ Saved {lastSaveTime.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Right - Stats */}
          <div className="text-sm text-gray-500">
            {blocks.length} blocks • {pathPoints.length} pathpoints
          </div>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex min-w-0 flex-1 flex-col pt-12">
        {/* Toolbar */}
        <Toolbar
          selectedTool={selectedTool}
          onSelectTool={handleSelectTool}
          selectedBlockId={selectedBlockId}
          blocks={blocks}
          allowOverlap={allowOverlap}
          overlappingBlocks={overlappingBlocks}
          onToggleOverlap={toggleOverlapMode}
          onDelete={deleteSelected}
          onRotate={rotateSelectedBlock}
          onFindPath={findPath}
          onClearPoints={clearPathPoints}
          onClearPath={clearPath}
          onImportBlocks={handleDXFImport}
          onClearLayout={handleClearLayout}
        />

        {/* Canvas */}
        <Canvas
          blocks={blocks}
          pathPoints={pathPoints}
          selectedTool={selectedTool}
          selectedBlockId={selectedBlockId}
          editingBlockId={editingBlockId}
          tempName={tempName}
          allowOverlap={allowOverlap}
          overlappingBlocks={overlappingBlocks}
          currentPath={currentPath}
          pathfindingMessage={pathfindingMessage}
          panOffset={panOffset}
          setPanOffset={setPanOffset}
          onSelectBlock={setSelectedBlockId}
          onBlockClick={handleBlockClick}
          onCanvasClick={handleCanvasClick}
          onBlockDrag={handleBlockDrag}
          onFinishEditingName={finishEditingName}
          onStartEditingName={startEditingName}
          onTempNameChange={setTempName}
        />

        {/* Info Panel */}
        <InfoPanel
          selectedTool={selectedTool}
          pathPoints={pathPoints}
          blockCount={blocks.length}
          allowOverlap={allowOverlap}
          overlappingCount={overlappingBlocks.size}
        />
      </div>

      {/* Properties Panel */}
      <PropertiesPanel
        selectedBlockId={selectedBlockId}
        blocks={blocks}
        editingBlockId={editingBlockId}
        tempName={tempName}
        allowOverlap={allowOverlap}
        overlappingBlocks={overlappingBlocks}
        onUpdatePosition={updateBlockPosition}
        onUpdateSize={updateBlockSize}
        onStartEditingName={startEditingName}
        onFinishEditingName={finishEditingName}
        onTempNameChange={setTempName}
        onRotate={rotateSelectedBlock}
        onDelete={deleteSelected}
        onToggleOverlap={toggleOverlapMode}
      />
    </div>
  );
}
