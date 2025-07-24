/**
 * components/Toolbar.tsx
 *
 * Main toolbar component for the Store Layout Editor with DXF import functionality
 * Provides tool selection, block actions, overlap controls, pathfinding controls, and DXF import
 */

import React, { useState } from "react";
import { type Tool, type StoreBlock } from "../types";
import SimpleDXFImport from "./simple-dxf-import";
import DXFFloorPlanGenerator from "./dxf-button";
import DXFDebugger from "./dxf-button";
// import SimpleDXFImport from "./SimpleDXFImport"; // Import the DXF component

// ===================================================================
// COMPONENT INTERFACE
// ===================================================================

interface ToolbarProps {
  // Tool state
  selectedTool: Tool;
  onSelectTool: (tool: Tool) => void;

  // Selection state
  selectedBlockId: string | null;
  blocks: StoreBlock[];

  // Overlap state
  allowOverlap: boolean;
  overlappingBlocks: Set<string>;
  onToggleOverlap: () => void;

  // Block actions
  onDelete: () => void;
  onRotate: () => void;

  // Pathfinding actions
  onFindPath: () => void;
  onClearPoints: () => void;
  onClearPath: () => void;

  // NEW: Import/Export actions
  onImportBlocks: (blocks: StoreBlock[]) => void;
  onClearLayout?: () => void; // Optional clear all functionality
}

// ===================================================================
// TOOLBAR COMPONENT
// ===================================================================

/**
 * Main toolbar component providing all editor tools and actions
 *
 * Features:
 * - Tool selection buttons with keyboard shortcuts
 * - Overlap mode toggle with visual indicator
 * - Context-sensitive action buttons (delete, rotate)
 * - Pathfinding controls
 * - DXF import functionality
 * - Layout management (clear all)
 * - Visual feedback for active tools
 *
 * Keyboard shortcuts:
 * - 1: Select tool
 * - 2-8: Block placement tools
 * - 9: Start point tool
 * - 0: End point tool
 * - R: Rotate selected block
 * - Del: Delete selected block
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  selectedTool,
  onSelectTool,
  selectedBlockId,
  blocks,
  allowOverlap,
  overlappingBlocks,
  onToggleOverlap,
  onDelete,
  onRotate,
  onFindPath,
  onClearPoints,
  onClearPath,
  onImportBlocks,
  onClearLayout,
}) => {
  // ===================================================================
  // LOCAL STATE
  // ===================================================================

  const [showDXFImport, setShowDXFImport] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // ===================================================================
  // HELPER FUNCTIONS
  // ===================================================================

  /**
   * Gets the currently selected block object
   */
  const selectedBlock = selectedBlockId
    ? blocks.find((b) => b.id === selectedBlockId)
    : null;

  /**
   * Determines if rotate button should be enabled
   * Only certain block types can be rotated
   */
  const canRotate =
    selectedBlock &&
    (selectedBlock.type === "wall" ||
      selectedBlock.type === "shelf" ||
      selectedBlock.type === "counter" ||
      selectedBlock.type === "entrance" ||
      selectedBlock.type === "checkout");

  /**
   * Creates a tool button with consistent styling
   */
  const ToolButton: React.FC<{
    tool: Tool;
    shortcut: string;
    children: React.ReactNode;
    variant?: "default" | "start" | "end";
  }> = ({ tool, shortcut, children, variant = "default" }) => {
    const isActive = selectedTool === tool;

    const baseClasses = "px-3 py-2 rounded font-medium transition-colors";
    const variantClasses = {
      default: isActive
        ? "bg-blue-500 text-white"
        : "bg-gray-200 hover:bg-gray-300",
      start: isActive
        ? "bg-green-500 text-white"
        : "bg-green-200 hover:bg-green-300",
      end: isActive ? "bg-red-500 text-white" : "bg-red-200 hover:bg-red-300",
    };

    return (
      <button
        className={`${baseClasses} ${variantClasses[variant]}`}
        onClick={() => onSelectTool(tool)}
        title={`${children} (${shortcut})`}
      >
        {children} ({shortcut})
      </button>
    );
  };

  /**
   * Handles DXF import completion
   */
  const handleDXFImport = (importedBlocks: StoreBlock[]) => {
    onImportBlocks(importedBlocks);
    setShowDXFImport(false);
  };

  /**
   * Handles clear layout with confirmation
   */
  const handleClearLayout = () => {
    if (blocks.length === 0) {
      return; // Nothing to clear
    }
    setShowClearConfirm(true);
  };

  const confirmClearLayout = () => {
    if (onClearLayout) {
      onClearLayout();
    }
    setShowClearConfirm(false);
  };

  // ===================================================================
  // RENDER
  // ===================================================================

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b bg-white p-3 shadow-sm">
        {/* SELECTION AND BLOCK TOOLS */}
        <div className="flex items-center gap-2">
          <ToolButton tool="select" shortcut="1">
            Select
          </ToolButton>

          <ToolButton tool="add-wall" shortcut="2">
            Wall
          </ToolButton>

          <ToolButton tool="add-room" shortcut="3">
            Room
          </ToolButton>

          <ToolButton tool="add-shelf" shortcut="4">
            Shelf
          </ToolButton>

          <ToolButton tool="add-counter" shortcut="5">
            Counter
          </ToolButton>

          <ToolButton tool="add-entrance" shortcut="6">
            Entrance
          </ToolButton>

          <ToolButton tool="add-checkout" shortcut="7">
            Checkout
          </ToolButton>

          <ToolButton tool="add-building" shortcut="8">
            Building
          </ToolButton>
        </div>

        {/* SEPARATOR */}
        <div className="mx-2 h-6 w-px bg-gray-300" />

        {/* OVERLAP CONTROLS */}
        <div className="flex items-center gap-2">
          <button
            className={`flex items-center gap-2 rounded px-3 py-2 font-medium transition-colors ${
              allowOverlap
                ? "bg-orange-500 text-white hover:bg-orange-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={onToggleOverlap}
            title={`${
              allowOverlap ? "Disable" : "Enable"
            } overlap mode - allows blocks to overlap with visual feedback`}
          >
            <span className="text-sm">🔀</span>
            {allowOverlap ? "Overlap: ON" : "Overlap: OFF"}
          </button>

          {/* Overlap indicator */}
          {allowOverlap && overlappingBlocks.size > 0 && (
            <div className="rounded border border-red-200 bg-red-100 px-2 py-1 text-sm text-red-700">
              <span className="font-medium">{overlappingBlocks.size}</span>{" "}
              overlapping
            </div>
          )}
        </div>

        {/* SEPARATOR */}
        <div className="mx-2 h-6 w-px bg-gray-300" />

        {/* PATHFINDING TOOLS */}
        <div className="flex items-center gap-2">
          <ToolButton tool="add-start" shortcut="9" variant="start">
            📍 Start
          </ToolButton>

          <ToolButton tool="add-end" shortcut="0" variant="end">
            🎯 End
          </ToolButton>

          <button
            className="rounded bg-purple-500 px-3 py-2 font-medium text-white transition-colors hover:bg-purple-600"
            onClick={onFindPath}
            title="Find shortest path between start and end points"
          >
            🗺️ Find Path
          </button>

          <button
            className="rounded bg-gray-500 px-3 py-2 font-medium text-white transition-colors hover:bg-gray-600"
            onClick={onClearPath}
            title="Clear current path visualization"
          >
            Clear Path
          </button>

          <button
            className="rounded bg-gray-500 px-3 py-2 font-medium text-white transition-colors hover:bg-gray-600"
            onClick={onClearPoints}
            title="Clear all pathfinding points"
          >
            Clear Points
          </button>
        </div>

        {/* SEPARATOR */}
        <div className="mx-2 h-6 w-px bg-gray-300" />

        {/* IMPORT/EXPORT TOOLS */}
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 rounded bg-indigo-500 px-3 py-2 font-medium text-white transition-colors hover:bg-indigo-600"
            onClick={() => setShowDXFImport(true)}
            title="Import AutoCAD DXF file to create layout from architectural drawings"
          >
            <span className="text-sm">📁</span>
            Import DXF
          </button>

          {onClearLayout && (
            <button
              className="flex items-center gap-2 rounded bg-red-500 px-3 py-2 font-medium text-white transition-colors hover:bg-red-600"
              onClick={handleClearLayout}
              title="Clear entire layout and start fresh"
              disabled={blocks.length === 0}
            >
              <span className="text-sm">🗑️</span>
              Clear All
            </button>
          )}
        </div>

        {/* SEPARATOR */}
        <div className="mx-2 h-6 w-px bg-gray-300" />

        {/* CONTEXT-SENSITIVE ACTIONS */}
        <div className="flex items-center gap-2">
          {selectedBlockId && (
            <>
              <button
                className="rounded bg-red-500 px-3 py-2 font-medium text-white transition-colors hover:bg-red-600"
                onClick={onDelete}
                title="Delete selected block (Del/Backspace)"
              >
                🗑️ Delete
              </button>

              {canRotate && (
                <button
                  className="rounded bg-green-500 px-3 py-2 font-medium text-white transition-colors hover:bg-green-600"
                  onClick={onRotate}
                  title="Rotate selected block 90 degrees (R)"
                >
                  🔄 Rotate
                </button>
              )}
            </>
          )}
        </div>

        {/* HELP TEXT */}
        <div className="flex-1" />
        <div className="hidden text-sm text-gray-600 lg:block">
          {selectedBlockId
            ? `Selected: ${selectedBlock?.name || "Unknown"} ${
                allowOverlap && overlappingBlocks.has(selectedBlockId)
                  ? "(Overlapping)"
                  : ""
              }`
            : allowOverlap
              ? "Overlap mode: Blocks can overlap with visual feedback"
              : blocks.length === 0
                ? "Start by importing a DXF file or placing blocks manually"
                : "Select or place blocks to design your store layout"}
        </div>
      </div>

      {/* <DXFFloorPlanGenerator /> */}
      {/* <DXFDebugger /> */}
      {/* DXF IMPORT DIALOG */}
      <SimpleDXFImport
        isOpen={showDXFImport}
        onClose={() => setShowDXFImport(false)}
        onImport={handleDXFImport}
      />

      {/* CLEAR CONFIRMATION DIALOG */}
      {showClearConfirm && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-lg font-bold">Clear Entire Layout?</h3>
            <p className="mb-6 text-gray-600">
              This will delete all {blocks.length} blocks, path points, and
              reset the entire layout. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="rounded border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearLayout}
                className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
