import React, { useRef, useState, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Maximize } from "lucide-react";
import {
  type StoreBlock,
  type PathPoint,
  type Tool,
  type Point,
  type ViewportOffset,
  METER_SIZE,
} from "@/types";
import { worldToScreen, screenToWorld, getMousePosition } from "@/lib/geometry";
import { getBlockRenderProperties } from "@/lib/blockConfig";
import { getOverlapArea } from "@/lib/collision";
import { useModal } from "@/hooks/use-modal-store";

// ===================================================================
// ENHANCED CANVAS INTERFACE
// ===================================================================

interface EnhancedCanvasProps {
  // Data
  blocks: StoreBlock[];
  pathPoints: PathPoint[];

  // Editor state
  selectedTool: Tool;
  selectedBlockId: string | null;
  editingBlockId: string | null;
  tempName: string;

  // Overlap state
  allowOverlap: boolean;
  overlappingBlocks: Set<string>;

  // Path visualization state
  currentPath: Point[];
  pathfindingMessage: string;

  // Viewport
  panOffset: ViewportOffset;
  setPanOffset: (offset: ViewportOffset) => void;

  // Actions
  onSelectBlock: (blockId: string | null) => void;
  onBlockClick: (blockId: string, e: React.MouseEvent) => void;
  onCanvasClick: (worldPos: Point) => void;
  onBlockDrag: (blockId: string, newX: number, newY: number) => void;
  onFinishEditingName: () => void;
  onStartEditingName: (blockId: string) => void;
  onTempNameChange: (name: string) => void;
}

// ===================================================================
// ENHANCED CANVAS WITH ZOOM
// ===================================================================

export const Canvas: React.FC<EnhancedCanvasProps> = ({
  blocks,
  pathPoints,
  selectedTool,
  selectedBlockId,
  editingBlockId,
  tempName,
  allowOverlap,
  overlappingBlocks,
  currentPath,
  pathfindingMessage,
  panOffset,
  setPanOffset,
  onSelectBlock,
  onBlockClick,
  onCanvasClick,
  onBlockDrag,
  onFinishEditingName,
  onStartEditingName,
  onTempNameChange,
}) => {
  // ===================================================================
  // ZOOM AND VIEWPORT STATE
  // ===================================================================

  const svgRef = useRef<SVGSVGElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isPanning, setIsPanning] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const dragOffset = useRef<Point>({ x: 0, y: 0 });
  const lastPanPosition = useRef<Point>({ x: 0, y: 0 });

  // Zoom constraints
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 5.0;
  const ZOOM_STEP = 0.2;

  // ===================================================================
  // ZOOM FUNCTIONS
  // ===================================================================

  /**
   * Handles zoom in/out with mouse wheel
   */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      if (editingBlockId) return; // Don't zoom while editing

      const mousePos = getMousePosition(e, svgRef);
      const worldPosBeforeZoom = screenToWorld(
        mousePos.x,
        mousePos.y,
        panOffset,
      );

      // Calculate new zoom level
      const zoomDelta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const newZoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, zoomLevel + zoomDelta),
      );

      if (newZoom === zoomLevel) return; // No change

      setZoomLevel(newZoom);

      // Adjust pan offset to zoom towards mouse cursor
      const worldPosAfterZoom = screenToWorld(
        mousePos.x,
        mousePos.y,
        panOffset,
      );
      const deltaX =
        (worldPosAfterZoom.x - worldPosBeforeZoom.x) * METER_SIZE * newZoom;
      const deltaY =
        (worldPosAfterZoom.y - worldPosBeforeZoom.y) * METER_SIZE * newZoom;

      setPanOffset({
        x: panOffset.x + deltaX,
        y: panOffset.y + deltaY,
      });
    },
    [zoomLevel, panOffset, setPanOffset, editingBlockId],
  );

  /**
   * Programmatic zoom controls
   */
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(MAX_ZOOM, zoomLevel + ZOOM_STEP);
    setZoomLevel(newZoom);
  }, [zoomLevel]);

  const zoomOut = useCallback(() => {
    const newZoom = Math.max(MIN_ZOOM, zoomLevel - ZOOM_STEP);
    setZoomLevel(newZoom);
  }, [zoomLevel]);

  /**
   * Zoom to fit all blocks in view
   */
  const zoomToFit = useCallback(() => {
    if (blocks.length === 0) {
      setZoomLevel(1.0);
      setPanOffset({ x: 400, y: 300 });
      return;
    }

    // Calculate bounds of all blocks
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    blocks.forEach((block) => {
      minX = Math.min(minX, block.x);
      maxX = Math.max(maxX, block.x + block.width);
      minY = Math.min(minY, block.y);
      maxY = Math.max(maxY, block.y + block.height);
    });

    // Add some padding
    const padding = 2; // 2 meters padding
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const layoutWidth = maxX - minX;
    const layoutHeight = maxY - minY;

    // Get canvas dimensions
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const rect = svgElement.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;

    // Calculate zoom to fit
    const zoomX = canvasWidth / (layoutWidth * METER_SIZE);
    const zoomY = canvasHeight / (layoutHeight * METER_SIZE);
    const newZoom = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, Math.min(zoomX, zoomY) * 0.9),
    );

    setZoomLevel(newZoom);

    // Center the layout
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setPanOffset({
      x: canvasWidth / 2 - centerX * METER_SIZE * newZoom,
      y: canvasHeight / 2 - centerY * METER_SIZE * newZoom,
    });
  }, [blocks, setPanOffset]);

  /**
   * Reset zoom and pan to default
   */
  const resetView = useCallback(() => {
    setZoomLevel(1.0);
    setPanOffset({ x: 400, y: 300 });
  }, [setPanOffset]);

  // ===================================================================
  // ENHANCED COORDINATE CONVERSION WITH ZOOM
  // ===================================================================

  const worldToScreenWithZoom = useCallback(
    (x: number, y: number): Point => ({
      x: x * METER_SIZE * zoomLevel + panOffset.x,
      y: y * METER_SIZE * zoomLevel + panOffset.y,
    }),
    [zoomLevel, panOffset],
  );

  const screenToWorldWithZoom = useCallback(
    (x: number, y: number): Point => ({
      x: (x - panOffset.x) / (METER_SIZE * zoomLevel),
      y: (y - panOffset.y) / (METER_SIZE * zoomLevel),
    }),
    [zoomLevel, panOffset],
  );

  // ===================================================================
  // INTERACTION HANDLERS (Updated for Zoom)
  // ===================================================================
  const { onOpen } = useModal();
  // Update the handleBlockMouseDown function:
  const handleBlockMouseDown = useCallback(
    (e: React.MouseEvent, blockId: string) => {
      e.stopPropagation();

      if (editingBlockId) return;

      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;

      // Double-click to open edit modal for shelves and walls
      if (
        e.detail === 2 &&
        (block.type === "shelf" ||
          block.type === "wall" ||
          block.type === "counter")
      ) {
        onOpen("editBlock", { block });
        return;
      }

      onBlockClick(blockId, e);

      setDraggedBlockId(blockId);
      const mousePos = getMousePosition(e, svgRef);
      lastPanPosition.current = mousePos;

      const worldPos = screenToWorldWithZoom(mousePos.x, mousePos.y);
      dragOffset.current = {
        x: worldPos.x - block.x,
        y: worldPos.y - block.y,
      };
    },
    [blocks, editingBlockId, onBlockClick, screenToWorldWithZoom, onOpen],
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const mousePos = getMousePosition(e, svgRef);
      lastPanPosition.current = mousePos;

      if (editingBlockId) return;

      // Pan on middle click or shift+click
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        setIsPanning(true);
        e.preventDefault();
        return;
      }

      if (e.button !== 0) return;

      // Pan if in select mode on empty space
      if (selectedTool === "select") {
        setIsPanning(true);
        onSelectBlock(null);
        return;
      }

      // Place block based on current tool
      const worldPos = screenToWorldWithZoom(mousePos.x, mousePos.y);
      onCanvasClick(worldPos);
    },
    [
      selectedTool,
      editingBlockId,
      onSelectBlock,
      onCanvasClick,
      screenToWorldWithZoom,
    ],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const mousePos = getMousePosition(e, svgRef);

      // Handle viewport panning
      if (isPanning) {
        const dx = mousePos.x - lastPanPosition.current.x;
        const dy = mousePos.y - lastPanPosition.current.y;
        setPanOffset({
          x: panOffset.x + dx,
          y: panOffset.y + dy,
        });
        lastPanPosition.current = mousePos;
        return;
      }

      // Handle block dragging
      if (draggedBlockId) {
        const worldPos = screenToWorldWithZoom(mousePos.x, mousePos.y);
        const newX = worldPos.x - dragOffset.current.x;
        const newY = worldPos.y - dragOffset.current.y;

        onBlockDrag(draggedBlockId, newX, newY);
        lastPanPosition.current = mousePos;
        return;
      }

      lastPanPosition.current = mousePos;
    },
    [
      isPanning,
      draggedBlockId,
      panOffset,
      setPanOffset,
      onBlockDrag,
      screenToWorldWithZoom,
    ],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggedBlockId(null);
  }, []);

  // ===================================================================
  // KEYBOARD SHORTCUTS FOR ZOOM
  // ===================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName.toLowerCase() === "input") return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "=": // Ctrl/Cmd + =
          case "+": // Ctrl/Cmd + +
            e.preventDefault();
            zoomIn();
            break;
          case "-": // Ctrl/Cmd + -
            e.preventDefault();
            zoomOut();
            break;
          case "0": // Ctrl/Cmd + 0 (reset zoom)
            e.preventDefault();
            resetView();
            break;
          case "f": // Ctrl/Cmd + F (fit to screen)
            e.preventDefault();
            zoomToFit();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomIn, zoomOut, resetView, zoomToFit]);

  // ===================================================================
  // RENDERING HELPERS (Updated for Zoom)
  // ===================================================================

  const renderOverlapAreas = useCallback(() => {
    if (!allowOverlap) return null;

    const overlapAreas: JSX.Element[] = [];

    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const block1 = blocks[i];
        const block2 = blocks[j];

        const overlapArea = getOverlapArea(block1, block2);
        if (overlapArea) {
          const screenPos = worldToScreenWithZoom(overlapArea.x, overlapArea.y);

          overlapAreas.push(
            <rect
              key={`overlap-${block1.id}-${block2.id}`}
              x={screenPos.x}
              y={screenPos.y}
              width={overlapArea.width * METER_SIZE * zoomLevel}
              height={overlapArea.height * METER_SIZE * zoomLevel}
              fill="rgba(239, 68, 68, 0.4)"
              stroke="rgba(239, 68, 68, 0.8)"
              strokeWidth="2"
              className="pointer-events-none"
            />,
          );
        }
      }
    }

    return <g className="overlap-areas">{overlapAreas}</g>;
  }, [allowOverlap, blocks, worldToScreenWithZoom, zoomLevel]);

  const renderBlock = (block: StoreBlock) => {
    const screenPos = worldToScreenWithZoom(block.x, block.y);
    const isSelected = block.id === selectedBlockId;
    const isOverlapping = overlappingBlocks.has(block.id);
    const renderProps = getBlockRenderProperties(block.type);

    let blockFill = renderProps.isBorderOnly ? "none" : block.color || "#DDD";
    let blockStroke = block.color || "#6b7280";
    let strokeWidth = renderProps.isBorderOnly
      ? METER_SIZE * zoomLevel
      : Math.max(1, zoomLevel);

    if (isSelected) {
      blockStroke = "#3b82f6";
      strokeWidth = Math.max(3, 3 * zoomLevel);
    }

    if (allowOverlap && isOverlapping && !renderProps.isBorderOnly) {
      blockFill = `url(#overlap-pattern-${block.id})`;
    }

    const blockWidth = block.width * METER_SIZE * zoomLevel;
    const blockHeight = block.height * METER_SIZE * zoomLevel;

    return (
      <g
        key={block.id}
        onMouseDown={(e) => handleBlockMouseDown(e, block.id)}
        className="cursor-move"
      >
        {/* Pattern definition for overlapping blocks */}
        {allowOverlap && isOverlapping && !renderProps.isBorderOnly && (
          <defs>
            <pattern
              id={`overlap-pattern-${block.id}`}
              patternUnits="userSpaceOnUse"
              width="8"
              height="8"
            >
              <rect width="8" height="8" fill={block.color || "#DDD"} />
              <rect width="4" height="4" fill="rgba(239, 68, 68, 0.3)" />
              <rect
                x="4"
                y="4"
                width="4"
                height="4"
                fill="rgba(239, 68, 68, 0.3)"
              />
            </pattern>
          </defs>
        )}

        {/* Block shape */}
        <rect
          x={screenPos.x}
          y={screenPos.y}
          width={blockWidth}
          height={blockHeight}
          fill={blockFill}
          stroke={blockStroke}
          strokeWidth={strokeWidth}
          opacity={renderProps.opacity}
        />

        {/* Overlap border for overlapping blocks */}
        {allowOverlap && isOverlapping && (
          <rect
            x={screenPos.x}
            y={screenPos.y}
            width={blockWidth}
            height={blockHeight}
            fill="none"
            stroke="rgba(239, 68, 68, 0.8)"
            strokeWidth={Math.max(2, 2 * zoomLevel)}
            strokeDasharray="5,5"
            className="pointer-events-none"
          />
        )}

        {/* Block label - only show if zoom level is reasonable */}
        {zoomLevel > 0.3 && (
          <>
            {editingBlockId === block.id ? (
              <foreignObject
                x={screenPos.x + blockWidth / 2 - 40 * zoomLevel}
                y={screenPos.y + blockHeight / 2 - 10 * zoomLevel}
                width={80 * zoomLevel}
                height={20 * zoomLevel}
              >
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => onTempNameChange(e.target.value)}
                  onBlur={onFinishEditingName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape") {
                      onFinishEditingName();
                    }
                  }}
                  className="h-full w-full rounded border border-orange-500 bg-white p-0.5 text-center text-xs"
                  style={{ fontSize: `${Math.max(10, 12 * zoomLevel)}px` }}
                  autoFocus
                />
              </foreignObject>
            ) : (
              <text
                x={screenPos.x + blockWidth / 2}
                y={screenPos.y + blockHeight / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={Math.max(8, 12 * zoomLevel)}
                fill={allowOverlap && isOverlapping ? "#DC2626" : "#374151"}
                fontWeight={allowOverlap && isOverlapping ? "bold" : "normal"}
                className="pointer-events-none select-none"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onStartEditingName(block.id);
                }}
              >
                {/* {block.name} */}
              </text>
            )}

            {/* Dimensions display for selected block */}
            {isSelected && zoomLevel > 0.5 && (
              <text
                x={screenPos.x + blockWidth / 2}
                y={screenPos.y - 5 * zoomLevel}
                textAnchor="middle"
                fontSize={Math.max(8, 10 * zoomLevel)}
                fill="#3b82f6"
                className="pointer-events-none select-none"
              >
                {block.width}m × {block.height}m
              </text>
            )}
          </>
        )}

        {/* Overlap indicator for overlapping blocks */}
        {allowOverlap && isOverlapping && zoomLevel > 0.4 && (
          <text
            x={screenPos.x + 5 * zoomLevel}
            y={screenPos.y + 15 * zoomLevel}
            fontSize={Math.max(8, 10 * zoomLevel)}
            fill="#DC2626"
            fontWeight="bold"
            className="pointer-events-none select-none"
          >
            ⚠️
          </text>
        )}
      </g>
    );
  };

  const renderPath = useCallback(() => {
    if (currentPath.length < 2) return null;

    const pathSegments: JSX.Element[] = [];

    for (let i = 0; i < currentPath.length - 1; i++) {
      const start = worldToScreenWithZoom(currentPath[i].x, currentPath[i].y);
      const end = worldToScreenWithZoom(
        currentPath[i + 1].x,
        currentPath[i + 1].y,
      );

      pathSegments.push(
        <line
          key={`path-segment-${i}`}
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke="#2563EB"
          strokeWidth={Math.max(2, 4 * zoomLevel)}
          strokeLinecap="round"
          className="drop-shadow-sm"
        />,
      );
    }

    const waypoints = currentPath.slice(1, -1).map((point, index) => {
      const screenPos = worldToScreenWithZoom(point.x, point.y);
      return (
        <circle
          key={`waypoint-${index}`}
          cx={screenPos.x}
          cy={screenPos.y}
          r={Math.max(2, 3 * zoomLevel)}
          fill="#2563EB"
          stroke="white"
          strokeWidth={Math.max(1, zoomLevel)}
        />
      );
    });

    return (
      <g className="pathfinding-visualization">
        {pathSegments}
        {waypoints}
      </g>
    );
  }, [currentPath, worldToScreenWithZoom, zoomLevel]);

  const renderPathPoint = (point: PathPoint) => {
    const screenPos = worldToScreenWithZoom(point.x, point.y);
    const isStart = point.type === "start";
    const radius = Math.max(10, 15 * zoomLevel);

    return (
      <g key={point.id}>
        <circle
          cx={screenPos.x}
          cy={screenPos.y}
          r={radius}
          fill={isStart ? "#10B981" : "#EF4444"}
          stroke="#FFFFFF"
          strokeWidth={Math.max(2, 3 * zoomLevel)}
          className="cursor-pointer"
        />
        {zoomLevel > 0.4 && (
          <text
            x={screenPos.x}
            y={screenPos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={Math.max(12, 16 * zoomLevel)}
            fill="white"
            className="pointer-events-none select-none"
          >
            {isStart ? "📍" : "🎯"}
          </text>
        )}
      </g>
    );
  };

  // ===================================================================
  // RENDER
  // ===================================================================

  return (
    <div className="relative flex flex-1 flex-col">
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <div className="flex flex-col space-y-1">
            <button
              onClick={zoomIn}
              disabled={zoomLevel >= MAX_ZOOM}
              className="rounded p-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              title="Zoom In (Ctrl/Cmd + +)"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            <div className="min-w-16 px-2 py-1 text-center text-xs text-gray-600">
              {Math.round(zoomLevel * 100)}%
            </div>

            <button
              onClick={zoomOut}
              disabled={zoomLevel <= MIN_ZOOM}
              className="rounded p-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              title="Zoom Out (Ctrl/Cmd + -)"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <div className="flex flex-col space-y-1">
            <button
              onClick={zoomToFit}
              className="rounded p-2 hover:bg-gray-100"
              title="Fit to Screen (Ctrl/Cmd + F)"
            >
              <Maximize className="h-4 w-4" />
            </button>

            <button
              onClick={resetView}
              className="rounded p-2 hover:bg-gray-100"
              title="Reset View (Ctrl/Cmd + 0)"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <svg
        ref={svgRef}
        className={`flex-1 bg-gray-100 ${
          isPanning
            ? "cursor-grabbing"
            : selectedTool === "select"
              ? "cursor-grab"
              : "cursor-crosshair"
        }`}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Grid background - scales with zoom */}
        <defs>
          <pattern
            id="grid"
            width={METER_SIZE * zoomLevel}
            height={METER_SIZE * zoomLevel}
            patternUnits="userSpaceOnUse"
            x={panOffset.x % (METER_SIZE * zoomLevel)}
            y={panOffset.y % (METER_SIZE * zoomLevel)}
          >
            <circle
              cx="0.5"
              cy="0.5"
              r={Math.max(0.5, zoomLevel)}
              fill="#d1d5db"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Render all blocks */}
        {blocks.map(renderBlock)}

        {/* Render overlap areas */}
        {renderOverlapAreas()}

        {/* Render pathfinding visualization */}
        {renderPath()}

        {/* Render pathfinding points */}
        {pathPoints.map(renderPathPoint)}

        {/* Pathfinding message overlay */}
        {pathfindingMessage && (
          <foreignObject x="10" y="10" width="300" height="60">
            <div className="rounded border border-blue-300 bg-blue-100 p-2 text-sm text-blue-800">
              {pathfindingMessage}
            </div>
          </foreignObject>
        )}

        {/* Path distance display */}
        {currentPath.length > 0 && (
          <foreignObject x="10" y="80" width="200" height="50">
            <div className="rounded border border-green-300 bg-green-100 p-2 text-sm">
              <div className="font-medium text-green-800">Path Distance:</div>
              <div className="text-lg font-bold text-green-700">
                {(() => {
                  let distance = 0;
                  for (let i = 1; i < currentPath.length; i++) {
                    const prev = currentPath[i - 1];
                    const curr = currentPath[i];
                    distance +=
                      Math.abs(curr.x - prev.x) + Math.abs(curr.y - prev.y);
                  }
                  return `${distance.toFixed(1)}m`;
                })()}
              </div>
            </div>
          </foreignObject>
        )}
      </svg>

      {/* Zoom Instructions */}
      <div className="absolute bottom-4 left-4 rounded-lg border border-gray-200 bg-white/90 p-3 shadow-lg backdrop-blur-sm">
        <div className="space-y-1 text-xs text-gray-600">
          <div>
            <strong>Zoom:</strong> Mouse wheel or buttons
          </div>
          <div>
            <strong>Pan:</strong> Drag or Shift+Click
          </div>
          <div>
            <strong>Shortcuts:</strong> Ctrl/Cmd + (+/-/0/F)
          </div>
          <div>
            <strong>Current:</strong> {Math.round(zoomLevel * 100)}% zoom
          </div>
        </div>
      </div>
    </div>
  );
};

export default Canvas;
