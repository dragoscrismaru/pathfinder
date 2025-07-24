import React from "react";
import { type Tool, type PathPoint } from "../types";

interface InfoPanelProps {
  selectedTool: Tool;
  pathPoints: PathPoint[];
  blockCount: number;
  allowOverlap: boolean;
  overlappingCount: number;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({
  selectedTool,
  pathPoints,
  blockCount,
  allowOverlap,
  overlappingCount,
}) => {
  const getToolDisplayName = (tool: Tool): string => {
    const toolNames: Record<Tool, string> = {
      select: "Select",
      "add-wall": "Place Wall",
      "add-room": "Place Room",
      "add-shelf": "Place Shelf",
      "add-counter": "Place Counter",
      "add-entrance": "Place Entrance",
      "add-checkout": "Place Checkout",
      "add-building": "Place Building",
      "add-start": "Place Start Point",
      "add-end": "Place End Point",
    };

    return toolNames[tool] || "Unknown Tool";
  };

  const getPathfindingStatus = (): string => {
    if (pathPoints.length === 0) return "No points";

    const hasStart = pathPoints.some((p) => p.type === "start");
    const hasEnd = pathPoints.some((p) => p.type === "end");

    if (hasStart && hasEnd) return "Ready to find path";
    if (hasStart) return "Start point placed";
    if (hasEnd) return "End point placed";

    return "Points placed";
  };

  const getPathfindingStatusColor = (): string => {
    if (pathPoints.length === 0) return "text-gray-500";

    const hasStart = pathPoints.some((p) => p.type === "start");
    const hasEnd = pathPoints.some((p) => p.type === "end");

    if (hasStart && hasEnd) return "text-green-600";
    if (hasStart || hasEnd) return "text-yellow-600";

    return "text-gray-500";
  };

  const getOverlapStatus = (): { text: string; color: string } => {
    if (!allowOverlap) {
      return { text: "Disabled", color: "text-gray-500" };
    }

    if (overlappingCount === 0) {
      return { text: "Enabled - No overlaps", color: "text-green-600" };
    }

    return {
      text: `Enabled - ${overlappingCount} overlapping`,
      color: "text-red-600",
    };
  };

  return (
    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200 min-w-[200px]">
      <div className="text-sm space-y-1">
        <div className="text-gray-600">
          <span className="font-medium">Grid:</span> 1 meter squares
        </div>

        <div className="text-gray-600">
          <span className="font-medium">Tool:</span>
          <span className="ml-1 text-blue-600 font-medium">
            {getToolDisplayName(selectedTool)}
          </span>
        </div>

        <div className="text-gray-600">
          <span className="font-medium">Blocks:</span>
          <span className="ml-1 text-gray-800 font-medium">{blockCount}</span>
        </div>

        <div className="text-gray-600">
          <span className="font-medium">Overlap:</span>
          <span className={`ml-1 font-medium ${getOverlapStatus().color}`}>
            {getOverlapStatus().text}
          </span>
        </div>

        <div className="text-gray-600">
          <span className="font-medium">Path:</span>
          <span className={`ml-1 font-medium ${getPathfindingStatusColor()}`}>
            {getPathfindingStatus()}
          </span>
        </div>

        <div className="pt-2 border-t border-gray-200 text-xs text-gray-500">
          <div>
            <strong>Tips:</strong>
          </div>
          <div>• Shift+Click to pan • Double-click to edit names</div>
          <div>• Press O to toggle overlap mode</div>
          {allowOverlap && overlappingCount > 0 && (
            <div className="text-red-600 font-medium">
              • Red areas show overlaps
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
