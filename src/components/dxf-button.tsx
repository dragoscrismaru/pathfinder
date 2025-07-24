import React, { useState } from "react";

const DXFDebugger = () => {
  const [dxfContent, setDxfContent] = useState("");
  const [uploadedContent, setUploadedContent] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [parserDebug, setParserDebug] = useState("");

  const generateWorkingFloorPlan = () => {
    const createLine = (x1, y1, x2, y2, layer = "WALLS") => {
      return `0
LINE
8
${layer}
10
${x1}
20
${y1}
11
${x2}
21
${y2}
`;
    };

    let dxfContent = `0
SECTION
2
HEADER
0
ENDSEC
0
SECTION
2
ENTITIES
`;

    // Generate random building dimensions
    const buildingWidth = 200 + Math.random() * 100;
    const buildingHeight = 150 + Math.random() * 100;

    // Outer walls
    dxfContent += createLine(0, 0, buildingWidth, 0, "WALLS");
    dxfContent += createLine(
      buildingWidth,
      0,
      buildingWidth,
      buildingHeight,
      "WALLS"
    );
    dxfContent += createLine(
      buildingWidth,
      buildingHeight,
      0,
      buildingHeight,
      "WALLS"
    );
    dxfContent += createLine(0, buildingHeight, 0, 0, "WALLS");

    // Generate random interior rooms
    const numRooms = 2 + Math.floor(Math.random() * 3);

    // Create vertical divisions
    for (let i = 1; i < numRooms; i++) {
      const x = (buildingWidth / numRooms) * i;
      dxfContent += createLine(x, 0, x, buildingHeight, "WALLS");
    }

    // Create horizontal division
    if (Math.random() > 0.5) {
      const y = buildingHeight / 2;
      dxfContent += createLine(0, y, buildingWidth, y, "WALLS");
    }

    // Add doors
    const numDoors = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numDoors; i++) {
      const doorWidth = 20;
      const x = 30 + Math.random() * (buildingWidth - 60);
      const y = 30 + Math.random() * (buildingHeight - 60);

      dxfContent += createLine(x, y, x + doorWidth, y, "DOORS");
    }

    dxfContent += `0
ENDSEC
0
EOF`;

    setDxfContent(dxfContent);
    return dxfContent;
  };

  // Simulate your exact parser logic for debugging
  const simulateYourParser = (content, scaleFactor = 0.1) => {
    let debugLog = "=== SIMULATING YOUR PARSER ===\n\n";

    const lines = content.split("\n");
    const blocks = [];
    let blockCounter = 1;

    let currentEntity = {};
    let currentCode = "";
    let inEntitiesSection = false;
    let lineNumber = 0;
    let expectingValue = false;

    debugLog += `Total lines to process: ${lines.length}\n\n`;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      lineNumber++;

      // Check for ENTITIES section
      if (line === "ENTITIES") {
        inEntitiesSection = true;
        debugLog += `Line ${lineNumber}: Found ENTITIES section\n`;
        continue;
      }

      if (line === "ENDSEC") {
        inEntitiesSection = false;
        debugLog += `Line ${lineNumber}: End of ENTITIES section\n`;
        continue;
      }

      if (!inEntitiesSection) continue;

      // DXF alternates between group codes (numbers) and values
      if (!expectingValue && !isNaN(parseInt(line))) {
        currentCode = line;
        expectingValue = true;
        debugLog += `Line ${lineNumber}: Group code: ${currentCode} (expecting value next)\n`;
        continue;
      }

      if (expectingValue) {
        expectingValue = false;
        debugLog += `Line ${lineNumber}: Value "${line}" for group code ${currentCode}\n`;

        // Process based on group code
        switch (currentCode) {
          case "0": // Entity type
            // Save previous entity if it was a line
            if (
              currentEntity.type === "LINE" &&
              currentEntity.x1 !== undefined &&
              currentEntity.y1 !== undefined &&
              currentEntity.x2 !== undefined &&
              currentEntity.y2 !== undefined
            ) {
              debugLog += `  → Saving complete LINE entity: (${
                currentEntity.x1
              },${currentEntity.y1}) to (${currentEntity.x2},${
                currentEntity.y2
              }) on layer ${currentEntity.layer || "default"}\n`;

              const width =
                Math.abs(currentEntity.x2 - currentEntity.x1) * scaleFactor;
              const height =
                Math.abs(currentEntity.y2 - currentEntity.y1) * scaleFactor;

              blocks.push({
                id: `imported-wall-${blockCounter++}`,
                x: Math.min(currentEntity.x1, currentEntity.x2) * scaleFactor,
                y: Math.min(currentEntity.y1, currentEntity.y2) * scaleFactor,
                width: Math.max(width, 0.1),
                height: Math.max(height, 0.1),
                type: "wall",
                name: `Wall ${blockCounter - 1}`,
                rotation: 0,
                color: "#8B4513",
              });
            } else if (currentEntity.type === "LINE") {
              debugLog += `  → Incomplete LINE entity discarded (missing coordinates): x1=${currentEntity.x1}, y1=${currentEntity.y1}, x2=${currentEntity.x2}, y2=${currentEntity.y2}\n`;
            }

            // Start new entity
            currentEntity = { type: line };
            debugLog += `  → Starting new entity: ${line}\n`;
            break;

          case "8": // Layer name
            currentEntity.layer = line;
            debugLog += `  → Layer: ${line}\n`;
            break;

          case "10": // Start X
            currentEntity.x1 = parseFloat(line);
            debugLog += `  → Start X: ${currentEntity.x1}\n`;
            break;

          case "20": // Start Y
            currentEntity.y1 = parseFloat(line);
            debugLog += `  → Start Y: ${currentEntity.y1}\n`;
            break;

          case "11": // End X
            currentEntity.x2 = parseFloat(line);
            debugLog += `  → End X: ${currentEntity.x2}\n`;
            break;

          case "21": // End Y
            currentEntity.y2 = parseFloat(line);
            debugLog += `  → End Y: ${currentEntity.y2}\n`;
            break;

          default:
            debugLog += `  → Ignoring group code ${currentCode}\n`;
            break;
        }
      }
    }

    // Process the last entity if exists
    if (
      currentEntity.type === "LINE" &&
      currentEntity.x1 !== undefined &&
      currentEntity.y1 !== undefined &&
      currentEntity.x2 !== undefined &&
      currentEntity.y2 !== undefined
    ) {
      debugLog += `\nProcessing final complete LINE entity: (${currentEntity.x1},${currentEntity.y1}) to (${currentEntity.x2},${currentEntity.y2})\n`;

      const width = Math.abs(currentEntity.x2 - currentEntity.x1) * scaleFactor;
      const height =
        Math.abs(currentEntity.y2 - currentEntity.y1) * scaleFactor;

      blocks.push({
        id: `imported-wall-${blockCounter++}`,
        x: Math.min(currentEntity.x1, currentEntity.x2) * scaleFactor,
        y: Math.min(currentEntity.y1, currentEntity.y2) * scaleFactor,
        width: Math.max(width, 0.1),
        height: Math.max(height, 0.1),
        type: "wall",
        name: `Wall ${blockCounter - 1}`,
        rotation: 0,
        color: "#8B4513",
      });
    } else if (currentEntity.type === "LINE") {
      debugLog += `\nFinal LINE entity incomplete: x1=${currentEntity.x1}, y1=${currentEntity.y1}, x2=${currentEntity.x2}, y2=${currentEntity.y2}\n`;
    }

    debugLog += `\n=== FINAL RESULTS ===\n`;
    debugLog += `Total blocks created: ${blocks.length}\n`;

    if (blocks.length === 0) {
      debugLog += `\n❌ NO BLOCKS CREATED!\n`;
      debugLog += `Most likely issues:\n`;
      debugLog += `- DXF format doesn't alternate properly between group codes and values\n`;
      debugLog += `- LINE entities missing required coordinates (10,20,11,21)\n`;
      debugLog += `- Parser state machine confused by unexpected format\n`;
      debugLog += `- Missing or malformed ENTITIES section\n`;
    } else {
      debugLog += `\n✅ SUCCESS! Created ${blocks.length} blocks:\n`;
      blocks.forEach((block, index) => {
        debugLog += `  ${index + 1}. ${block.name} at (${block.x.toFixed(
          2
        )}, ${block.y.toFixed(2)}) size ${block.width.toFixed(
          2
        )}×${block.height.toFixed(2)}\n`;
      });
    }

    return { blocks, debugLog };
  };

  const generateSimpleDXF = () => {
    // Very basic DXF with minimal required sections
    const simpleDXF = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1015
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LAYER
70
1
0
LAYER
2
0
70
0
62
7
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
0
10
0.0
20
0.0
30
0.0
11
100.0
21
0.0
31
0.0
0
LINE
8
0
10
100.0
20
0.0
30
0.0
11
100.0
21
100.0
31
0.0
0
LINE
8
0
10
100.0
20
100.0
30
0.0
11
0.0
21
100.0
31
0.0
0
LINE
8
0
10
0.0
20
100.0
30
0.0
11
0.0
21
0.0
31
0.0
0
ENDSEC
0
EOF`;

    setDxfContent(simpleDXF);
    return simpleDXF;
  };

  const generateLibraryCompatibleDXF = () => {
    // Ultra-minimal DXF that most libraries can handle
    let dxfContent = `0
SECTION
2
ENTITIES
`;

    const createSimpleLine = (x1, y1, x2, y2) => {
      return `0
LINE
8
0
10
${x1}
20
${y1}
11
${x2}
21
${y2}
`;
    };

    // Simple square room
    dxfContent += createSimpleLine(0, 0, 200, 0); // Bottom wall
    dxfContent += createSimpleLine(200, 0, 200, 150); // Right wall
    dxfContent += createSimpleLine(200, 150, 0, 150); // Top wall
    dxfContent += createSimpleLine(0, 150, 0, 0); // Left wall

    // Interior wall
    dxfContent += createSimpleLine(100, 0, 100, 75); // Vertical divider
    dxfContent += createSimpleLine(0, 75, 200, 75); // Horizontal divider

    dxfContent += `0
ENDSEC
0
EOF`;

    setDxfContent(dxfContent);
    return dxfContent;
  };

  const generateComplexFloorPlan = () => {
    const createLine = (x1, y1, x2, y2, layer = "0") => {
      return `0
LINE
8
${layer}
10
${x1.toFixed(2)}
20
${y1.toFixed(2)}
30
0.0
11
${x2.toFixed(2)}
21
${y2.toFixed(2)}
31
0.0
`;
    };

    let dxfContent = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1015
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LAYER
70
3
0
LAYER
2
0
70
0
62
7
6
CONTINUOUS
0
LAYER
2
WALLS
70
0
62
1
6
CONTINUOUS
0
LAYER
2
DOORS
70
0
62
3
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
`;

    // Generate random building dimensions
    const buildingWidth = 200 + Math.random() * 100; // Smaller for testing
    const buildingHeight = 150 + Math.random() * 100;

    // Outer walls on WALLS layer
    dxfContent += createLine(0, 0, buildingWidth, 0, "WALLS");
    dxfContent += createLine(
      buildingWidth,
      0,
      buildingWidth,
      buildingHeight,
      "WALLS"
    );
    dxfContent += createLine(
      buildingWidth,
      buildingHeight,
      0,
      buildingHeight,
      "WALLS"
    );
    dxfContent += createLine(0, buildingHeight, 0, 0, "WALLS");

    // Add a few interior walls
    dxfContent += createLine(
      buildingWidth / 2,
      0,
      buildingWidth / 2,
      buildingHeight / 2,
      "WALLS"
    );
    dxfContent += createLine(
      0,
      buildingHeight / 2,
      buildingWidth,
      buildingHeight / 2,
      "WALLS"
    );

    // Add doors
    const doorWidth = 20;
    dxfContent += createLine(
      50,
      buildingHeight / 2,
      50 + doorWidth,
      buildingHeight / 2,
      "DOORS"
    );

    dxfContent += `0
ENDSEC
0
EOF`;

    setDxfContent(dxfContent);
    return dxfContent;
  };

  const downloadDXF = (content, filename) => {
    const blob = new Blob([content], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const analyzeDXF = (content) => {
    const lines = content.split("\n");
    let analysis = `=== DXF FILE ANALYSIS ===\n\n`;
    analysis += `Total lines: ${lines.length}\n\n`;

    // Check for sections
    const sections = [];
    const entities = [];
    let currentSection = "";
    let lineCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === "2" && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (
          ["HEADER", "TABLES", "ENTITIES", "BLOCKS", "OBJECTS"].includes(
            nextLine
          )
        ) {
          sections.push(nextLine);
          currentSection = nextLine;
        }
      }

      if (line === "LINE") {
        lineCount++;
        entities.push(`LINE entity found at line ${i + 1}`);
      }
    }

    analysis += `SECTIONS FOUND:\n${sections.join(", ")}\n\n`;
    analysis += `LINE ENTITIES: ${lineCount} found\n\n`;

    if (entities.length > 0) {
      analysis += `ENTITY DETAILS:\n${entities.slice(0, 10).join("\n")}\n`;
      if (entities.length > 10)
        analysis += `... and ${entities.length - 10} more\n`;
    }

    // Check file structure
    analysis += `\nFILE STRUCTURE CHECK:\n`;
    analysis += `- Starts with '0': ${lines[0]?.trim() === "0" ? "✓" : "✗"}\n`;
    analysis += `- Contains SECTION: ${
      content.includes("SECTION") ? "✓" : "✗"
    }\n`;
    analysis += `- Contains ENTITIES: ${
      content.includes("ENTITIES") ? "✓" : "✗"
    }\n`;
    analysis += `- Contains LINE: ${content.includes("LINE") ? "✓" : "✗"}\n`;
    analysis += `- Ends with EOF: ${
      lines[lines.length - 1]?.trim() === "EOF" ? "✓" : "✗"
    }\n`;

    return analysis;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        setUploadedContent(content);
        setAnalysis(analyzeDXF(content));

        // Run your parser simulation
        const { blocks, debugLog } = simulateYourParser(content);
        setParserDebug(debugLog);
      };
      reader.readAsText(file);
    }
  };

  const testGeneratedFile = () => {
    const content = generateWorkingFloorPlan();
    setAnalysis(analyzeDXF(content));

    // Run your parser simulation on generated content
    const { blocks, debugLog } = simulateYourParser(content);
    setParserDebug(debugLog);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto font-mono text-sm">
      <h1 className="text-2xl font-bold mb-6">DXF File Debugger & Generator</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generator Section */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-bold mb-4">Generate & Test DXF Files</h2>

          <div className="space-y-3">
            <button
              onClick={() =>
                downloadDXF(
                  generateLibraryCompatibleDXF(),
                  "minimal_compatible.dxf"
                )
              }
              className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            >
              Download Minimal Compatible DXF
            </button>

            <button
              onClick={() =>
                downloadDXF(generateSimpleDXF(), "simple_test.dxf")
              }
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Download Simple DXF (4 lines square)
            </button>

            <button
              onClick={() =>
                downloadDXF(generateComplexFloorPlan(), "floor_plan_test.dxf")
              }
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Download Floor Plan DXF
            </button>
          </div>

          {dxfContent && (
            <div className="mt-4">
              <h3 className="font-bold mb-2">Generated DXF Preview:</h3>
              <textarea
                value={dxfContent.substring(0, 500) + "..."}
                readOnly
                className="w-full h-32 p-2 border rounded text-xs bg-gray-50"
              />
            </div>
          )}
        </div>

        {/* Upload & Analysis Section */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-bold mb-4">Upload & Analyze DXF</h2>

          <input
            type="file"
            accept=".dxf"
            onChange={handleFileUpload}
            className="w-full mb-4 p-2 border rounded"
          />

          {analysis && (
            <div className="mt-4">
              <h3 className="font-bold mb-2">Analysis Results:</h3>
              <textarea
                value={analysis}
                readOnly
                className="w-full h-64 p-2 border rounded text-xs bg-gray-50 whitespace-pre"
              />
            </div>
          )}
        </div>

        {/* Real-time Parser Debug */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-bold mb-4">🔧 Your Parser Debug</h2>
          <p className="text-sm text-gray-600 mb-4">
            This simulates your exact parser logic step by step
          </p>

          {parserDebug && (
            <div className="mt-4">
              <h3 className="font-bold mb-2">Parser Simulation:</h3>
              <textarea
                value={parserDebug}
                readOnly
                className="w-full h-64 p-2 border rounded text-xs bg-yellow-50 whitespace-pre font-mono"
              />
            </div>
          )}

          {!parserDebug && (
            <div className="bg-blue-50 p-4 rounded text-sm">
              <p>📝 Upload a DXF file or test a generated one to see:</p>
              <ul className="mt-2 space-y-1 text-blue-700">
                <li>• Line-by-line parser execution</li>
                <li>• Group codes and values found</li>
                <li>• Entity creation process</li>
                <li>• Why parsing fails/succeeds</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Debug Information */}
      <div className="mt-6 border rounded-lg p-4 bg-yellow-50">
        <h2 className="text-lg font-bold mb-4">🔍 Real-Time Debugging</h2>
        <div className="text-sm space-y-2">
          <p>
            <strong>1. Use "Working Floor Plan DXF":</strong> This matches your
            parser exactly
          </p>
          <p>
            <strong>2. Test with your parser:</strong> Click "Test Generated
            DXF" to see step-by-step execution
          </p>
          <p>
            <strong>3. Debug uploaded files:</strong> Upload any DXF to see why
            it fails
          </p>
          <p>
            <strong>4. Check the parser debug:</strong> See exactly which lines
            are processed and what entities are created
          </p>

          <div className="bg-white p-3 rounded border-l-4 border-green-500 mt-4">
            <p className="font-medium text-green-800">Expected parser flow:</p>
            <ol className="text-sm text-green-700 mt-1 space-y-1">
              <li>1. Find "ENTITIES" section</li>
              <li>2. Parse group codes (0, 8, 10, 20, 11, 21)</li>
              <li>3. Build LINE entities with coordinates</li>
              <li>4. Convert to StoreBlock objects</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DXFDebugger;
