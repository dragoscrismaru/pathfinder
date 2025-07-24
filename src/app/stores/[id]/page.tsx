// src/app/stores/[id]/page.tsx - FIXED VERSION
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  type Tool,
  type Point,
  type ViewportOffset,
  type StoreBlockType,
} from "@/types";
import { useStoreLayout } from "@/hooks/useStoreLayout";
import { snapToGrid } from "@/lib/geometry";
import { Toolbar } from "@/components/toolbar";
import { InfoPanel } from "@/components/InfoPanel";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import { Canvas } from "@/components/Canvas";
import { api } from "@/trpc/react";

export default function StoreEditorPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  // ===================================================================
  // ALL HOOKS MUST BE CALLED AT THE TOP LEVEL - BEFORE ANY CONDITIONS
  // ===================================================================

  // Get store info for header
  const { data: store, isLoading: storeLoading } = api.store.getById.useQuery({
    id: storeId,
  });

  // Layout state from custom hook - MUST be called unconditionally
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
    importBlocks,
    clearLayout,
    loading,
    saving,
  } = useStoreLayout(storeId);

  // UI state hooks - MUST also be at top level
  const [selectedTool, setSelectedTool] = useState<Tool>("select");
  const [panOffset, setPanOffset] = useState<ViewportOffset>({
    x: 400,
    y: 300,
  });

  // ===================================================================
  // ALL CALLBACK HOOKS - MUST BE BEFORE CONDITIONS
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

        const result = importBlocks(importedBlocks, {
          replaceExisting: true,
          offsetX: 0,
          offsetY: 0,
        });

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
          console.error("Import failed:", result.message);
          alert(`Import failed: ${result.message}`);
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
  // EFFECT HOOKS - MUST BE BEFORE CONDITIONS
  // ===================================================================

  // Keyboard shortcuts effect
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
  // NOW WE CAN SAFELY DO CONDITIONAL RENDERING
  // ===================================================================

  // Show loading state
  if (storeLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Loading store editor...</p>
        </div>
      </div>
    );
  }

  // Handle store not found
  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Store Not Found
          </h1>
          <p className="mb-6 text-gray-600">
            The store you're looking for doesn't exist.
          </p>
          <Link
            href="/stores"
            className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
          >
            Back to Stores
          </Link>
        </div>
      </div>
    );
  }

  // ===================================================================
  // MAIN RENDER - AFTER ALL HOOKS AND CONDITIONS
  // ===================================================================

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Header Bar */}
      <div className="absolute top-0 right-0 left-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <Link
            href="/stores"
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            ← Back to Stores
          </Link>
          <div className="h-4 w-px bg-gray-300" />
          <h1 className="font-semibold text-gray-900">{store.name}</h1>
          {saving && <span className="text-xs text-blue-500">Saving...</span>}
        </div>
        <div className="text-sm text-gray-500">
          {blocks.length} blocks • {pathPoints.length} path points
        </div>
      </div>

      {/* Main Editor Area */}
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

        {/* Main Canvas */}
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

        {/* Info Panel Overlay */}
        <InfoPanel
          selectedTool={selectedTool}
          pathPoints={pathPoints}
          blockCount={blocks.length}
          allowOverlap={allowOverlap}
          overlappingCount={overlappingBlocks.size}
        />
      </div>

      {/* Properties Panel Sidebar */}
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
