/**
 * components/PropertiesPanel.tsx
 *
 * Properties editing panel for selected blocks
 * Provides detailed controls for position, size, name, actions, and overlap information
 */

import React from "react";
import { type StoreBlock } from "../types";

// ===================================================================
// COMPONENT INTERFACE
// ===================================================================

interface PropertiesPanelProps {
  // Selection state
  selectedBlockId: string | null;
  blocks: StoreBlock[];

  // Editing state
  editingBlockId: string | null;
  tempName: string;

  // Overlap state
  allowOverlap: boolean;
  overlappingBlocks: Set<string>;

  // Actions
  onUpdatePosition: (blockId: string, x: number, y: number) => void;
  onUpdateSize: (blockId: string, width: number, height: number) => void;
  onStartEditingName: (blockId: string) => void;
  onFinishEditingName: () => void;
  onTempNameChange: (name: string) => void;
  onRotate: () => void;
  onDelete: () => void;
  onToggleOverlap: () => void;
}

// ===================================================================
// PROPERTIES PANEL COMPONENT
// ===================================================================

/**
 * Properties panel for editing selected block details
 *
 * Features:
 * - Block information display (type, name, overlap status)
 * - Position controls (X, Y coordinates)
 * - Size controls (width, height)
 * - Name editing with live preview
 * - Overlap mode toggle and status
 * - Quick action buttons (rotate, delete)
 * - Context-sensitive help and tips
 *
 * Layout:
 * - Fixed width sidebar on the right
 * - Organized sections with clear labels
 * - Responsive input controls
 * - Visual feedback for actions
 */
export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedBlockId,
  blocks,
  editingBlockId,
  tempName,
  allowOverlap,
  overlappingBlocks,
  onUpdatePosition,
  onUpdateSize,
  onStartEditingName,
  onFinishEditingName,
  onTempNameChange,
  onRotate,
  onDelete,
  onToggleOverlap,
}) => {
  // ===================================================================
  // HELPER FUNCTIONS
  // ===================================================================

  /**
   * Gets the currently selected block
   */
  const selectedBlock = selectedBlockId
    ? blocks.find((b) => b.id === selectedBlockId)
    : null;

  /**
   * Determines if the selected block can be rotated
   */
  const canRotate =
    selectedBlock &&
    (selectedBlock.type === "wall" ||
      selectedBlock.type === "shelf" ||
      selectedBlock.type === "counter" ||
      selectedBlock.type === "entrance" ||
      selectedBlock.type === "checkout");

  /**
   * Checks if the selected block is overlapping
   */
  const isSelectedBlockOverlapping = selectedBlockId
    ? overlappingBlocks.has(selectedBlockId)
    : false;

  // ===================================================================
  // INPUT COMPONENTS
  // ===================================================================

  /**
   * Reusable number input component with consistent styling
   */
  const NumberInput: React.FC<{
    label: string;
    value: number;
    onChange: (value: number) => void;
    step?: number;
    min?: number;
    unit?: string;
  }> = ({ label, value, onChange, step = 0.1, min, unit = "m" }) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">
        {label} ({unit})
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        step={step}
        min={min}
      />
    </div>
  );

  /**
   * Action button component with consistent styling
   */
  const ActionButton: React.FC<{
    onClick: () => void;
    color: "green" | "red" | "orange" | "blue";
    children: React.ReactNode;
    disabled?: boolean;
  }> = ({ onClick, color, children, disabled = false }) => {
    const colorClasses = {
      green: "bg-green-500 hover:bg-green-600 disabled:bg-green-300",
      red: "bg-red-500 hover:bg-red-600 disabled:bg-red-300",
      orange: "bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300",
      blue: "bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300",
    };

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`px-3 py-2 text-white rounded text-sm font-medium transition-colors ${colorClasses[color]}`}
      >
        {children}
      </button>
    );
  };

  // ===================================================================
  // RENDER
  // ===================================================================

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Properties</h3>

      {/* OVERLAP MODE CONTROL */}
      <div className="mb-4 bg-gray-50 p-3 rounded-lg">
        <div className="text-sm font-medium text-gray-700 mb-2">
          Overlap Mode
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Allow blocks to overlap</span>
          <button
            onClick={onToggleOverlap}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              allowOverlap ? "bg-orange-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                allowOverlap ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Press 'O' to toggle •{" "}
          {allowOverlap
            ? "Red areas show overlaps"
            : "Collision detection enabled"}
        </div>
        {allowOverlap && overlappingBlocks.size > 0 && (
          <div className="text-xs text-red-600 font-medium mt-1">
            {overlappingBlocks.size} blocks are overlapping
          </div>
        )}
      </div>

      {selectedBlock ? (
        <div className="space-y-4">
          {/* BLOCK INFORMATION */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Block Information
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                Type:{" "}
                <span className="capitalize font-medium text-gray-800">
                  {selectedBlock.type}
                </span>
              </div>
              <div>
                Name:{" "}
                <span className="font-medium text-gray-800">
                  {selectedBlock.name}
                </span>
              </div>
              <div>
                Rotation:{" "}
                <span className="font-medium text-gray-800">
                  {selectedBlock.rotation}°
                </span>
              </div>
              {/* Overlap status for selected block */}
              {allowOverlap && (
                <div>
                  Status:{" "}
                  <span
                    className={`font-medium ${
                      isSelectedBlockOverlapping
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {isSelectedBlockOverlapping ? "⚠️ Overlapping" : "✅ Clear"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* POSITION CONTROLS */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position
            </label>
            <div className="grid grid-cols-2 gap-2">
              <NumberInput
                label="X"
                value={selectedBlock.x}
                onChange={(newX) =>
                  onUpdatePosition(selectedBlockId!, newX, selectedBlock.y)
                }
              />
              <NumberInput
                label="Y"
                value={selectedBlock.y}
                onChange={(newY) =>
                  onUpdatePosition(selectedBlockId!, selectedBlock.x, newY)
                }
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Position is measured from the top-left corner
            </div>
          </div>

          {/* SIZE CONTROLS */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dimensions
            </label>
            <div className="grid grid-cols-2 gap-2">
              <NumberInput
                label="Width"
                value={selectedBlock.width}
                onChange={(newWidth) =>
                  onUpdateSize(
                    selectedBlockId!,
                    Math.max(0.1, newWidth),
                    selectedBlock.height
                  )
                }
                min={0.1}
              />
              <NumberInput
                label="Height"
                value={selectedBlock.height}
                onChange={(newHeight) =>
                  onUpdateSize(
                    selectedBlockId!,
                    selectedBlock.width,
                    Math.max(0.1, newHeight)
                  )
                }
                min={0.1}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Minimum size is 0.1m × 0.1m
            </div>
          </div>

          {/* NAME EDITING */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <input
              type="text"
              value={
                editingBlockId === selectedBlockId
                  ? tempName
                  : selectedBlock.name
              }
              onChange={(e) => {
                if (editingBlockId === selectedBlockId) {
                  onTempNameChange(e.target.value);
                } else {
                  onStartEditingName(selectedBlockId!);
                  onTempNameChange(e.target.value);
                }
              }}
              onBlur={() => {
                if (editingBlockId === selectedBlockId) {
                  onFinishEditingName();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && editingBlockId === selectedBlockId) {
                  onFinishEditingName();
                }
              }}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter block name"
            />
            <div className="text-xs text-gray-500 mt-1">
              Double-click blocks on canvas to edit names quickly
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Actions
            </label>
            <div className="grid grid-cols-2 gap-2">
              <ActionButton
                onClick={onRotate}
                color="green"
                disabled={!canRotate}
              >
                🔄 Rotate
              </ActionButton>
              <ActionButton onClick={onDelete} color="red">
                🗑️ Delete
              </ActionButton>
            </div>
            {!canRotate && (
              <div className="text-xs text-gray-500 mt-2">
                Only walls, shelves, counters, entrances, and checkouts can be
                rotated
              </div>
            )}
          </div>

          {/* OVERLAP WARNING */}
          {allowOverlap && isSelectedBlockOverlapping && (
            <div className="pt-4 border-t border-red-200 bg-red-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-red-700 mb-2">
                ⚠️ Overlap Detected
              </div>
              <div className="text-sm text-red-600">
                This block is overlapping with other blocks. Check the canvas
                for red highlighting showing overlap areas.
              </div>
            </div>
          )}

          {/* ADDITIONAL INFO */}
          <div className="pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 space-y-1">
              <div>
                <strong>Tips:</strong>
              </div>
              <div>• Drag blocks on canvas to move them</div>
              <div>• Use keyboard shortcuts for quick tool switching</div>
              <div>• Press R to rotate, Del to delete, O for overlap</div>
              <div>• All measurements are in meters</div>
              {allowOverlap && (
                <div>• Red patterns and borders indicate overlaps</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* NO SELECTION STATE */
        <div className="text-gray-500">
          <p className="mb-4">Select a block to edit its properties.</p>

          <div className="space-y-3 text-sm">
            <div>
              <strong>Getting Started:</strong>
            </div>
            <div>• Use the toolbar to select tools</div>
            <div>• Click on the canvas to place blocks</div>
            <div>• Click on blocks to select and edit them</div>
            <div>• Drag blocks to move them around</div>

            <div className="pt-3 border-t border-gray-200">
              <div>
                <strong>Keyboard Shortcuts:</strong>
              </div>
              <div>• 1-8: Select placement tools</div>
              <div>• 9: Place start point, 0: Place end point</div>
              <div>• O: Toggle overlap mode</div>
              <div>• R: Rotate selected block</div>
              <div>• Del/Backspace: Delete selected block</div>
              <div>• Esc: Switch to select tool</div>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <div>
                <strong>Overlap Mode:</strong>
              </div>
              <div>• Toggle to allow blocks to overlap</div>
              <div>• Red areas and patterns show overlapping regions</div>
              <div>• Useful for complex layouts and design flexibility</div>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <div>
                <strong>Block Types:</strong>
              </div>
              <div>
                • <span className="text-amber-600">Wall:</span> 1m × 3m
                structural elements
              </div>
              <div>
                • <span className="text-blue-600">Room:</span> 4m × 4m area
                definitions
              </div>
              <div>
                • <span className="text-gray-600">Shelf:</span> 1m × 4m product
                displays
              </div>
              <div>
                • <span className="text-amber-700">Counter:</span> 2m × 1m
                service areas
              </div>
              <div>
                • <span className="text-green-600">Entrance:</span> 2m × 0.2m
                entry points
              </div>
              <div>
                • <span className="text-yellow-600">Checkout:</span> 2m × 1.5m
                register areas
              </div>
              <div>
                • <span className="text-green-800">Building:</span> 20m × 20m
                outlines
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
