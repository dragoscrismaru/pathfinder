import React, { useState, useCallback } from "react";
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  Settings,
  Filter,
  AlertTriangle,
} from "lucide-react";

// Types for our DXF parser (inline for compatibility)
interface StoreBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type:
    | "wall"
    | "room"
    | "shelf"
    | "counter"
    | "entrance"
    | "checkout"
    | "building";
  name: string;
  rotation: 0 | 90 | 180 | 270;
  color?: string;
}

interface DXFParseResult {
  success: boolean;
  blocks: StoreBlock[];
  message: string;
  statistics: {
    totalEntities: number;
    convertedBlocks: number;
    skippedEntities: number;
    layers: string[];
    bounds: {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
      width: number;
      height: number;
    };
  };
}

interface ParseOptions {
  minLineLength: number;
  allowedLayers: string[];
  maxBlocks: number;
  mergeConnectedLines: boolean;
  scaleFactor: number;
}

// ENHANCED DXF parser with intelligent filtering for complex drawings
const parseComplexDXF = async (
  file: File,
  options: ParseOptions
): Promise<DXFParseResult> => {
  try {
    const content = await file.text();
    const lines = content.split("\n").map((line) => line.trim());

    let rawLines: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      layer: string;
      length: number;
    }> = [];

    let allLayers = new Set<string>();
    let totalEntitiesFound = 0;

    // Parse all LINE entities first
    let currentEntity: any = {};
    let inEntitiesSection = false;
    let expectingValue = false;
    let currentGroupCode = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line === "ENTITIES") {
        inEntitiesSection = true;
        continue;
      }
      if (line === "ENDSEC") {
        inEntitiesSection = false;
        continue;
      }
      if (!inEntitiesSection) continue;

      if (!expectingValue) {
        if (!isNaN(parseInt(line))) {
          currentGroupCode = line;
          expectingValue = true;
        }
        continue;
      }

      expectingValue = false;

      switch (currentGroupCode) {
        case "0":
          // Process previous LINE if complete
          if (
            currentEntity.type === "LINE" &&
            currentEntity.x1 !== undefined &&
            currentEntity.y1 !== undefined &&
            currentEntity.x2 !== undefined &&
            currentEntity.y2 !== undefined
          ) {
            const length = Math.sqrt(
              Math.pow(currentEntity.x2 - currentEntity.x1, 2) +
                Math.pow(currentEntity.y2 - currentEntity.y1, 2)
            );

            const layer = currentEntity.layer || "0";
            allLayers.add(layer);

            rawLines.push({
              x1: currentEntity.x1,
              y1: currentEntity.y1,
              x2: currentEntity.x2,
              y2: currentEntity.y2,
              layer: layer,
              length: length * options.scaleFactor,
            });
            totalEntitiesFound++;
          }
          currentEntity = { type: line };
          break;
        case "8":
          currentEntity.layer = line;
          break;
        case "10":
          currentEntity.x1 = parseFloat(line);
          break;
        case "20":
          currentEntity.y1 = parseFloat(line);
          break;
        case "11":
          currentEntity.x2 = parseFloat(line);
          break;
        case "21":
          currentEntity.y2 = parseFloat(line);
          break;
      }
    }

    // Process the last entity
    if (
      currentEntity.type === "LINE" &&
      currentEntity.x1 !== undefined &&
      currentEntity.y1 !== undefined &&
      currentEntity.x2 !== undefined &&
      currentEntity.y2 !== undefined
    ) {
      const length = Math.sqrt(
        Math.pow(currentEntity.x2 - currentEntity.x1, 2) +
          Math.pow(currentEntity.y2 - currentEntity.y1, 2)
      );

      const layer = currentEntity.layer || "0";
      allLayers.add(layer);

      rawLines.push({
        x1: currentEntity.x1,
        y1: currentEntity.y1,
        x2: currentEntity.x2,
        y2: currentEntity.y2,
        layer: layer,
        length: length * options.scaleFactor,
      });
      totalEntitiesFound++;
    }

    console.log(`🔍 Total LINE entities found: ${rawLines.length}`);
    console.log(`📋 Layers found:`, Array.from(allLayers));

    // FILTER 1: Only keep lines from allowed layers
    const layerFilteredLines = rawLines.filter((line) =>
      options.allowedLayers.some(
        (allowedLayer) =>
          line.layer.toUpperCase().includes(allowedLayer.toUpperCase()) ||
          allowedLayer.toUpperCase().includes(line.layer.toUpperCase())
      )
    );
    console.log(
      `🎯 After layer filtering: ${layerFilteredLines.length} (removed ${
        rawLines.length - layerFilteredLines.length
      })`
    );

    // FILTER 2: Only keep lines above minimum length (removes detail/dimension lines)
    const lengthFilteredLines = layerFilteredLines.filter(
      (line) => line.length >= options.minLineLength
    );
    console.log(
      `📏 After length filtering (≥${options.minLineLength}m): ${
        lengthFilteredLines.length
      } (removed ${layerFilteredLines.length - lengthFilteredLines.length})`
    );

    // FILTER 3: Merge connected lines (optional)
    let finalLines = lengthFilteredLines;
    if (options.mergeConnectedLines && lengthFilteredLines.length > 0) {
      finalLines = mergeConnectedLines(lengthFilteredLines);
      console.log(
        `🔗 After merging connected lines: ${finalLines.length} (merged ${
          lengthFilteredLines.length - finalLines.length
        })`
      );
    }

    // FILTER 4: Limit total number of blocks (keep longest lines)
    if (finalLines.length > options.maxBlocks) {
      finalLines = finalLines
        .sort((a, b) => b.length - a.length)
        .slice(0, options.maxBlocks);
      console.log(`⚡ Limited to ${options.maxBlocks} longest lines`);
    }

    // Convert filtered lines to blocks
    const blocks = finalLines.map((line, index) => {
      const width = Math.abs(line.x2 - line.x1) * options.scaleFactor;
      const height = Math.abs(line.y2 - line.y1) * options.scaleFactor;

      return {
        id: `imported-wall-${index + 1}`,
        x: Math.min(line.x1, line.x2) * options.scaleFactor,
        y: Math.min(line.y1, line.y2) * options.scaleFactor,
        width: Math.max(width, 0.1),
        height: Math.max(height, 0.1),
        type: "wall" as const,
        name: `Wall ${index + 1}`,
        rotation: 0 as const,
        color: "#8B4513",
      };
    });

    // Calculate bounds
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

    if (blocks.length === 0) {
      return {
        success: false,
        blocks: [],
        message: `No suitable lines found. Found ${totalEntitiesFound} total lines but none matched your filters. Try adjusting layer names or minimum length.`,
        statistics: {
          totalEntities: totalEntitiesFound,
          convertedBlocks: 0,
          skippedEntities: totalEntitiesFound,
          layers: Array.from(allLayers),
          bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 },
        },
      };
    }

    return {
      success: true,
      blocks,
      message: `Successfully imported ${blocks.length} structural walls (filtered from ${totalEntitiesFound} total lines)`,
      statistics: {
        totalEntities: totalEntitiesFound,
        convertedBlocks: blocks.length,
        skippedEntities: totalEntitiesFound - blocks.length,
        layers: Array.from(allLayers),
        bounds: {
          minX: minX === Infinity ? 0 : minX,
          maxX: maxX === -Infinity ? 0 : maxX,
          minY: minY === Infinity ? 0 : minY,
          maxY: maxY === -Infinity ? 0 : maxY,
          width: maxX === -Infinity ? 0 : maxX - minX,
          height: maxY === -Infinity ? 0 : maxY - minY,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      blocks: [],
      message: `Parse error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      statistics: {
        totalEntities: 0,
        convertedBlocks: 0,
        skippedEntities: 0,
        layers: [],
        bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 },
      },
    };
  }
};

// Helper function to merge connected lines
function mergeConnectedLines(
  lines: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    layer: string;
    length: number;
  }>
) {
  const tolerance = 0.5; // 50cm tolerance for connection
  const merged: typeof lines = [];
  const used = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;

    let currentLine = { ...lines[i] };
    used.add(i);

    // Try to find connecting lines (simplified merging)
    let foundConnection = true;
    while (foundConnection) {
      foundConnection = false;

      for (let j = 0; j < lines.length; j++) {
        if (used.has(j)) continue;

        const otherLine = lines[j];

        // Check if lines connect end-to-start and are on same layer
        const connects =
          Math.abs(currentLine.x2 - otherLine.x1) < tolerance &&
          Math.abs(currentLine.y2 - otherLine.y1) < tolerance &&
          currentLine.layer === otherLine.layer;

        if (connects) {
          // Extend current line
          currentLine.x2 = otherLine.x2;
          currentLine.y2 = otherLine.y2;
          currentLine.length = Math.sqrt(
            Math.pow(currentLine.x2 - currentLine.x1, 2) +
              Math.pow(currentLine.y2 - currentLine.y1, 2)
          );
          used.add(j);
          foundConnection = true;
          break;
        }
      }
    }

    merged.push(currentLine);
  }

  return merged;
}

interface EnhancedDXFImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (blocks: StoreBlock[]) => void;
}

const EnhancedDXFImport: React.FC<EnhancedDXFImportProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [step, setStep] = useState<"select" | "parsing" | "preview">("select");
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<DXFParseResult | null>(null);
  const [error, setError] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Parsing options with smart defaults for complex drawings
  const [scaleFactor, setScaleFactor] = useState(0.1);
  const [minLineLength, setMinLineLength] = useState(1.0);
  const [maxBlocks, setMaxBlocks] = useState(500);
  const [mergeLines, setMergeLines] = useState(true);
  const [selectedLayers, setSelectedLayers] = useState([
    "WALLS",
    "WALL",
    "A-WALL",
    "ARCHITECTURE",
    "STRUCTURAL",
    "0",
  ]);
  const [customLayer, setCustomLayer] = useState("");

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setStep("select");
      setFile(null);
      setParseResult(null);
      setError("");
    }
  }, [isOpen]);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) return;

      // Validate file
      if (!selectedFile.name.toLowerCase().endsWith(".dxf")) {
        setError("Please select a DXF file");
        return;
      }

      setFile(selectedFile);
      setError("");

      // Auto-detect if this might be a complex drawing
      if (selectedFile.size > 5 * 1024 * 1024) {
        // > 5MB
        setShowAdvanced(true);
        // Set more restrictive defaults for large files
        setMinLineLength(2.0);
        setMaxBlocks(300);
      }

      handleParseDXF(selectedFile);
    },
    [scaleFactor, minLineLength, selectedLayers, maxBlocks, mergeLines]
  );

  const handleParseDXF = useCallback(
    async (fileToParse: File) => {
      setStep("parsing");
      setError("");

      try {
        const options: ParseOptions = {
          scaleFactor,
          minLineLength,
          allowedLayers: selectedLayers,
          maxBlocks,
          mergeConnectedLines: mergeLines,
        };

        const result = await parseComplexDXF(fileToParse, options);
        setParseResult(result);

        if (result.success) {
          setStep("preview");
        } else {
          setError(result.message);
          setStep("select");
        }
      } catch (err) {
        setError(
          `Failed to parse DXF: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
        setStep("select");
      }
    },
    [scaleFactor, minLineLength, selectedLayers, maxBlocks, mergeLines]
  );

  const handleConfirmImport = useCallback(() => {
    if (parseResult?.success && parseResult.blocks.length > 0) {
      onImport(parseResult.blocks);
      onClose();
    }
  }, [parseResult, onImport, onClose]);

  const handleRetry = useCallback(() => {
    if (file) {
      handleParseDXF(file);
    }
  }, [file, handleParseDXF]);

  const addCustomLayer = () => {
    if (customLayer && !selectedLayers.includes(customLayer.toUpperCase())) {
      setSelectedLayers([...selectedLayers, customLayer.toUpperCase()]);
      setCustomLayer("");
    }
  };

  const removeLayer = (layer: string) => {
    setSelectedLayers(selectedLayers.filter((l) => l !== layer));
  };

  const applyPreset = (preset: "minimal" | "recommended" | "detailed") => {
    if (preset === "minimal") {
      setMinLineLength(3.0);
      setMaxBlocks(150);
      setSelectedLayers(["WALLS", "WALL", "A-WALL"]);
      setMergeLines(true);
    } else if (preset === "recommended") {
      setMinLineLength(1.5);
      setMaxBlocks(400);
      setSelectedLayers(["WALLS", "WALL", "A-WALL", "ARCHITECTURE", "0"]);
      setMergeLines(true);
    } else {
      // detailed
      setMinLineLength(0.8);
      setMaxBlocks(800);
      setSelectedLayers([
        "WALLS",
        "WALL",
        "A-WALL",
        "ARCHITECTURE",
        "STRUCTURAL",
        "0",
        "BUILDING",
      ]);
      setMergeLines(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Import DXF Drawing</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Step 1: File Selection */}
        {step === "select" && (
          <div className="space-y-4">
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Select DXF File</h3>
              <p className="text-gray-600 mb-4">
                Import architectural drawings with intelligent filtering
              </p>
            </div>

            {/* Complex Drawing Warning */}
            {file && file.size > 5 * 1024 * 1024 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 mb-1">
                      Large File Detected (
                      {(file.size / 1024 / 1024).toFixed(1)}MB)
                    </h4>
                    <p className="text-sm text-amber-700">
                      This appears to be a complex architectural drawing. We've
                      enabled filtering options to import only the main
                      structural elements.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Presets */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => applyPreset("minimal")}
                className="p-3 text-sm border rounded-lg hover:bg-gray-50 text-center"
              >
                <div className="font-medium">Minimal</div>
                <div className="text-xs text-gray-600">
                  Main walls only (~150 blocks)
                </div>
              </button>
              <button
                onClick={() => applyPreset("recommended")}
                className="p-3 text-sm border rounded-lg hover:bg-gray-50 text-center bg-blue-50 border-blue-200"
              >
                <div className="font-medium">Recommended</div>
                <div className="text-xs text-gray-600">
                  Balanced import (~400 blocks)
                </div>
              </button>
              <button
                onClick={() => applyPreset("detailed")}
                className="p-3 text-sm border rounded-lg hover:bg-gray-50 text-center"
              >
                <div className="font-medium">Detailed</div>
                <div className="text-xs text-gray-600">
                  More elements (~800 blocks)
                </div>
              </button>
            </div>

            {/* Advanced Options Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
            >
              <Settings className="w-4 h-4" />
              <span>{showAdvanced ? "Hide" : "Show"} Advanced Options</span>
            </button>

            {showAdvanced && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                {/* Scale Factor */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scale Factor
                    </label>
                    <input
                      type="number"
                      value={scaleFactor}
                      onChange={(e) =>
                        setScaleFactor(parseFloat(e.target.value) || 0.1)
                      }
                      step="0.01"
                      min="0.001"
                      max="10"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      1 CAD unit = {scaleFactor} meters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Line Length (m)
                    </label>
                    <input
                      type="number"
                      value={minLineLength}
                      onChange={(e) =>
                        setMinLineLength(parseFloat(e.target.value) || 0)
                      }
                      step="0.1"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Ignores shorter lines (dimensions, details)
                    </p>
                  </div>
                </div>

                {/* Max Blocks */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Blocks ({maxBlocks})
                  </label>
                  <input
                    type="range"
                    value={maxBlocks}
                    onChange={(e) => setMaxBlocks(parseInt(e.target.value))}
                    min="50"
                    max="1000"
                    step="50"
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>50 (minimal)</span>
                    <span>1000 (detailed)</span>
                  </div>
                </div>

                {/* Layer Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Import From These Layers
                  </label>

                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedLayers.map((layer) => (
                      <span
                        key={layer}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm flex items-center space-x-1"
                      >
                        <span>{layer}</span>
                        <button
                          onClick={() => removeLayer(layer)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={customLayer}
                      onChange={(e) => setCustomLayer(e.target.value)}
                      placeholder="Add layer name..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <button
                      onClick={addCustomLayer}
                      className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Merge Lines Toggle */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="merge-lines"
                    checked={mergeLines}
                    onChange={(e) => setMergeLines(e.target.checked)}
                    className="rounded"
                  />
                  <label
                    htmlFor="merge-lines"
                    className="text-sm text-gray-700"
                  >
                    Merge connected lines into longer walls
                  </label>
                </div>
              </div>
            )}

            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <input
                type="file"
                accept=".dxf"
                onChange={handleFileSelect}
                className="hidden"
                id="dxf-file-input"
              />
              <label
                htmlFor="dxf-file-input"
                className="flex flex-col items-center cursor-pointer"
              >
                <Upload className="w-12 h-12 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  Click to select DXF file
                </span>
              </label>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {/* Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">
                🎯 Smart Filtering for Complex Drawings:
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• ✅ Filters out dimension lines, text, and details</li>
                <li>• ✅ Imports only from structural layers</li>
                <li>• ✅ Merges connected line segments</li>
                <li>• ✅ Limits output to prevent overload</li>
                <li>• 📋 Perfect for complex architectural drawings</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: Parsing */}
        {step === "parsing" && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Parsing and filtering DXF file...</p>
            {file && (
              <p className="text-sm text-gray-500 mt-2">
                Processing: {file.name}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Applying smart filters to extract main structural elements
            </p>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && parseResult && (
          <div className="space-y-4">
            <div
              className={`p-3 rounded-lg flex items-center ${
                parseResult.success ? "bg-green-50" : "bg-red-50"
              }`}
            >
              {parseResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              )}
              <span
                className={`text-sm ${
                  parseResult.success ? "text-green-700" : "text-red-700"
                }`}
              >
                {parseResult.message}
              </span>
            </div>

            {/* Filtering Results */}
            {parseResult.success && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">
                  Filtering Results:
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
                  <div>
                    Total entities found:{" "}
                    <strong>{parseResult.statistics.totalEntities}</strong>
                  </div>
                  <div>
                    Blocks imported:{" "}
                    <strong>{parseResult.statistics.convertedBlocks}</strong>
                  </div>
                  <div>
                    Entities filtered out:{" "}
                    <strong>{parseResult.statistics.skippedEntities}</strong>
                  </div>
                  <div>
                    Efficiency:{" "}
                    <strong>
                      {(
                        (parseResult.statistics.convertedBlocks /
                          parseResult.statistics.totalEntities) *
                        100
                      ).toFixed(1)}
                      %
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Import Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Import Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Blocks Created:</span>
                  <span className="ml-2 font-medium">
                    {parseResult.blocks.length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">File:</span>
                  <span className="ml-2 font-medium">{file?.name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Layout Size:</span>
                  <span className="ml-2 font-medium">
                    {parseResult.statistics.bounds.width.toFixed(1)}m ×{" "}
                    {parseResult.statistics.bounds.height.toFixed(1)}m
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Scale Factor:</span>
                  <span className="ml-2 font-medium">{scaleFactor}</span>
                </div>
              </div>

              {/* Available Layers Display */}
              <div className="mt-3">
                <span className="text-gray-600 text-sm">Layers found:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {parseResult.statistics.layers.slice(0, 10).map((layer) => (
                    <span
                      key={layer}
                      className={`px-2 py-1 text-xs rounded ${
                        selectedLayers.some(
                          (selected) =>
                            selected
                              .toUpperCase()
                              .includes(layer.toUpperCase()) ||
                            layer.toUpperCase().includes(selected.toUpperCase())
                        )
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {layer}
                    </span>
                  ))}
                  {parseResult.statistics.layers.length > 10 && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      +{parseResult.statistics.layers.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Block Preview */}
            {parseResult.blocks.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Sample Imported Blocks:</h4>
                <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                  {parseResult.blocks.slice(0, 8).map((block, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{block.name}</span>
                      <span className="text-gray-500">
                        {block.width.toFixed(1)}m × {block.height.toFixed(1)}m
                      </span>
                    </div>
                  ))}
                  {parseResult.blocks.length > 8 && (
                    <div className="text-gray-500 text-xs">
                      ... and {parseResult.blocks.length - 8} more blocks
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Filter Adjustment Suggestions */}
            {parseResult.success && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">
                  💡 Need to adjust?
                </h4>
                <div className="text-sm text-yellow-700 space-y-1">
                  {parseResult.blocks.length > 800 && (
                    <p>
                      • Too many blocks? Try increasing minimum line length or
                      reducing max blocks
                    </p>
                  )}
                  {parseResult.blocks.length < 50 && (
                    <p>
                      • Too few blocks? Try decreasing minimum line length or
                      adding more layers
                    </p>
                  )}
                  {parseResult.statistics.skippedEntities >
                    parseResult.statistics.convertedBlocks * 10 && (
                    <p>
                      • Many entities filtered out - this is normal for complex
                      drawings
                    </p>
                  )}
                  <p>
                    • Green layer tags above show which layers were imported
                  </p>
                </div>
              </div>
            )}

            {/* No Results Help */}
            {!parseResult.success &&
              parseResult.statistics.layers.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-amber-800 mb-2">
                    Found layers but no matches:
                  </h4>
                  <div className="text-sm text-amber-700 mb-3">
                    <p>
                      Available layers:{" "}
                      {parseResult.statistics.layers.join(", ")}
                    </p>
                    <p>Your filter layers: {selectedLayers.join(", ")}</p>
                  </div>
                  <button
                    onClick={() => {
                      // Auto-add some of the found layers
                      const commonWallLayers =
                        parseResult.statistics.layers.filter(
                          (layer) =>
                            layer.toUpperCase().includes("WALL") ||
                            layer.toUpperCase().includes("ARCH") ||
                            layer.toUpperCase().includes("STRUCT") ||
                            layer === "0"
                        );
                      if (commonWallLayers.length > 0) {
                        setSelectedLayers([
                          ...selectedLayers,
                          ...commonWallLayers.slice(0, 3),
                        ]);
                      }
                      setStep("select");
                    }}
                    className="px-3 py-2 bg-amber-500 text-white rounded text-sm hover:bg-amber-600"
                  >
                    Auto-add detected layers and retry
                  </button>
                </div>
              )}

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep("select")}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Adjust Filters
              </button>
              <div className="space-x-2">
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
                >
                  Re-parse with Current Settings
                </button>
                {parseResult.success && parseResult.blocks.length > 0 && (
                  <button
                    onClick={handleConfirmImport}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    <div className="flex items-center space-x-1">
                      <Filter className="w-4 h-4" />
                      <span>Import {parseResult.blocks.length} Blocks</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedDXFImport;
