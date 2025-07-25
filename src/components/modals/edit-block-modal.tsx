// components/modals/edit-block-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { useModal } from "@/hooks/use-modal-store";
import { useLayoutContext } from "@/hooks/use-layout-context";
import { api } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Grid3x3,
  Package,
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { GridCell, GridColumn, GridRow } from "@/types/block-editor";
import { generateId } from "@/lib/utils";

export const EditBlockModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const [gridRows, setGridRows] = useState(2);
  const [gridColumns, setGridColumns] = useState(2);
  const [columns, setColumns] = useState<GridColumn[]>([]);
  const [rows, setRows] = useState<GridRow[]>([]);
  const [cells, setCells] = useState<GridCell[]>([]);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isModalOpen = isOpen && type === "editBlock";
  const block = data?.block;
  const { storeId, layoutId } = useLayoutContext();

  // tRPC hooks
  const { data: existingGrid, isLoading: loadingGrid } =
    api.grid.getByBlockId.useQuery(
      { blockId: block?.id || "" },
      { enabled: !!block?.id && isModalOpen },
    );

  const saveGridMutation = api.grid.saveGrid.useMutation({
    onSuccess: (result) => {
      console.log(`✅ Grid saved successfully:`, result);
      setIsSaving(false);
      // Don't close automatically - let user decide
    },
    onError: (error) => {
      console.error("❌ Failed to save grid:", error);
      setIsSaving(false);
      alert(`Failed to save grid: ${error.message}`);
    },
  });

  // Initialize grid when modal opens or load existing grid
  useEffect(() => {
    if (isModalOpen && block) {
      if (existingGrid && !loadingGrid) {
        // Load existing grid configuration
        loadExistingGrid(existingGrid);
      } else if (!loadingGrid) {
        // Create new grid with default values
        initializeGrid(gridRows, gridColumns);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, block, existingGrid, loadingGrid]);

  const loadExistingGrid = (grid: any) => {
    console.log("📥 Loading existing grid configuration");

    setGridRows(grid.rows);
    setGridColumns(grid.columns);

    // Load columns
    const loadedColumns: GridColumn[] = grid.gridColumns.map((col: any) => ({
      id: col.id,
      index: col.index,
      width: col.width,
      name: col.name,
    }));

    // Load rows
    const loadedRows: GridRow[] = grid.gridRows.map((row: any) => ({
      id: row.id,
      index: row.index,
      height: row.height,
      name: row.name,
    }));

    // Load cells
    const loadedCells: GridCell[] = grid.gridCells.map((cell: any) => ({
      id: cell.id,
      row: cell.row,
      column: cell.column,
      width: cell.width,
      height: cell.height,
      products: cell.productName ? [cell.productName] : [],
      isEmpty: cell.isEmpty,
      name: cell.name || `Cell [${cell.row + 1}, ${cell.column + 1}]`,
    }));

    setColumns(loadedColumns);
    setRows(loadedRows);
    setCells(loadedCells);
    setSelectedCell(null);
    setProductName("");
  };

  const initializeGrid = (numRows: number, numCols: number) => {
    if (!block) return;

    // Equal column widths and row heights initially
    const defaultColWidth = block.width / numCols;
    const defaultRowHeight = block.height / numRows;

    // Create columns
    const newColumns: GridColumn[] = Array.from(
      { length: numCols },
      (_, i) => ({
        id: generateId(),
        index: i,
        width: defaultColWidth,
        name: `Col ${i + 1}`,
      }),
    );

    // Create rows
    const newRows: GridRow[] = Array.from({ length: numRows }, (_, i) => ({
      id: generateId(),
      index: i,
      height: defaultRowHeight,
      name: `Row ${i + 1}`,
    }));

    // Create cells
    const newCells: GridCell[] = [];
    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        newCells.push({
          id: generateId(),
          row,
          column: col,
          width: defaultColWidth,
          height: defaultRowHeight,
          products: [],
          isEmpty: true,
          name: `Cell [${row + 1}, ${col + 1}]`,
        });
      }
    }

    setColumns(newColumns);
    setRows(newRows);
    setCells(newCells);
    setSelectedCell(null);
    setProductName("");
  };

  const handleGridResize = () => {
    if (gridRows < 1 || gridColumns < 1 || !block) return;

    const maxRows = Math.floor(block.height / 0.1);
    const maxCols = Math.floor(block.width / 0.1);

    const clampedRows = Math.min(gridRows, maxRows);
    const clampedCols = Math.min(gridColumns, maxCols);

    setGridRows(clampedRows);
    setGridColumns(clampedCols);
    initializeGrid(clampedRows, clampedCols);
  };

  // Column resize handlers
  const resizeColumn = (
    columnIndex: number,
    direction: "increase" | "decrease",
  ) => {
    if (!block) return;

    const increment = 0.1;
    const currentWidth = columns[columnIndex]?.width || 0;
    const otherColumnsWidth = columns
      .filter((_, index) => index !== columnIndex)
      .reduce((sum, col) => sum + col.width, 0);

    const maxAllowedWidth = block.width - otherColumnsWidth;

    const newWidth =
      direction === "increase"
        ? Math.min(currentWidth + increment, maxAllowedWidth)
        : Math.max(currentWidth - increment, 0.1);

    setColumns(
      columns.map((col, index) =>
        index === columnIndex ? { ...col, width: newWidth } : col,
      ),
    );

    // Update cells in this column
    setCells(
      cells.map((cell) =>
        cell.column === columnIndex ? { ...cell, width: newWidth } : cell,
      ),
    );
  };

  // Row resize handlers
  const resizeRow = (rowIndex: number, direction: "increase" | "decrease") => {
    if (!block) return;

    const increment = 0.1;
    const currentHeight = rows[rowIndex]?.height || 0;
    const otherRowsHeight = rows
      .filter((_, index) => index !== rowIndex)
      .reduce((sum, row) => sum + row.height, 0);

    const maxAllowedHeight = block.height - otherRowsHeight;

    const newHeight =
      direction === "increase"
        ? Math.min(currentHeight + increment, maxAllowedHeight)
        : Math.max(currentHeight - increment, 0.1);

    setRows(
      rows.map((row, index) =>
        index === rowIndex ? { ...row, height: newHeight } : row,
      ),
    );

    // Update cells in this row
    setCells(
      cells.map((cell) =>
        cell.row === rowIndex ? { ...cell, height: newHeight } : cell,
      ),
    );
  };

  const handleCellClick = (cellId: string) => {
    const cell = cells.find((c) => c.id === cellId);
    if (!cell) return;

    setSelectedCell(cellId);
    // If cell has products, show the first one for editing
    if (cell.products && cell.products.length > 0) {
      setProductName(cell.products[0]);
    } else {
      setProductName("");
    }
  };

  const handleAssignProduct = () => {
    if (!selectedCell || !productName.trim()) return;

    setCells(
      cells.map((cell) => {
        if (cell.id === selectedCell) {
          return {
            ...cell,
            products: [productName.trim()], // For now, one product per cell
            isEmpty: false,
          };
        }
        return cell;
      }),
    );

    setProductName("");
  };

  const handleRemoveProduct = () => {
    if (!selectedCell) return;

    setCells(
      cells.map((cell) => {
        if (cell.id === selectedCell) {
          return {
            ...cell,
            products: [],
            isEmpty: true,
          };
        }
        return cell;
      }),
    );

    setProductName("");
  };

  const getSelectedCellInfo = () => {
    if (!selectedCell) return null;
    return cells.find((c) => c.id === selectedCell);
  };

  const getTotalUsedWidth = () =>
    columns.reduce((sum, col) => sum + col.width, 0);
  const getTotalUsedHeight = () =>
    rows.reduce((sum, row) => sum + row.height, 0);

  const handleSaveGrid = async () => {
    if (!block || isSaving) return;

    setIsSaving(true);

    try {
      await saveGridMutation.mutateAsync({
        blockId: block.id,
        layoutId,
        storeId,
        rows: gridRows,
        columns: gridColumns,
        totalWidth: getTotalUsedWidth(),
        totalHeight: getTotalUsedHeight(),
        gridColumns: columns.map((col) => ({
          index: col.index,
          width: col.width,
          name: col.name,
        })),
        gridRows: rows.map((row) => ({
          index: row.index,
          height: row.height,
          name: row.name,
        })),
        gridCells: cells.map((cell) => ({
          row: cell.row,
          column: cell.column,
          width: cell.width,
          height: cell.height,
          productName:
            cell.products && cell.products.length > 0
              ? cell.products[0]
              : undefined,
          isEmpty: cell.isEmpty,
          name: cell.name,
        })),
      });

      alert("Grid configuration saved successfully!");
    } catch (error) {
      // Error is handled by the mutation's onError
    }
  };

  const handleClose = () => {
    setColumns([]);
    setRows([]);
    setCells([]);
    setGridRows(2);
    setGridColumns(2);
    setSelectedCell(null);
    setProductName("");
    onClose();
  };

  if (!block) return null;

  const selectedCellInfo = getSelectedCellInfo();

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[95vh] w-full max-w-[90dvw]! overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3x3 className="h-5 w-5" />
            Edit {block.type.charAt(0).toUpperCase() +
              block.type.slice(1)}: {block.name}
          </DialogTitle>
          <DialogDescription>
            Configure the grid layout and assign products to cells. Block size:{" "}
            {block.width}m × {block.height}m
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Grid Size Controls */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="mb-2 text-lg font-medium">Grid Configuration</h3>
              <p className="text-sm text-gray-500">
                Current: {gridRows} rows × {gridColumns} columns | Use arrows to
                resize columns/rows
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="grid-rows">Rows:</Label>
                <Input
                  id="grid-rows"
                  type="number"
                  min="1"
                  max={block ? Math.floor(block.height / 0.1) : 10}
                  value={gridRows}
                  onChange={(e) => setGridRows(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="grid-cols">Columns:</Label>
                <Input
                  id="grid-cols"
                  type="number"
                  min="1"
                  max={block ? Math.floor(block.width / 0.1) : 10}
                  value={gridColumns}
                  onChange={(e) =>
                    setGridColumns(parseInt(e.target.value) || 1)
                  }
                  className="w-20"
                />
              </div>
              <Button onClick={handleGridResize} size="sm">
                Apply Grid
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Grid Visualization with Resize Controls */}
            <div className="lg:col-span-2">
              <div className="rounded-lg border bg-gray-50 p-4">
                <Label className="mb-4 block text-sm font-medium">
                  Interactive Grid Layout
                </Label>

                <div className="relative">
                  {/* Column Headers with Resize Controls */}
                  <div className="mb-2 flex">
                    <div className="flex h-10 w-16 items-center justify-center rounded-tl border bg-gray-200 text-xs font-medium">
                      Grid
                    </div>
                    {columns.map((column, index) => {
                      const otherColumnsWidth = columns
                        .filter((_, i) => i !== index)
                        .reduce((sum, col) => sum + col.width, 0);
                      const maxWidth = block.width - otherColumnsWidth;

                      return (
                        <div key={column.id} className="min-w-0 flex-1">
                          <div className="flex h-10 items-center justify-between border border-l-0 bg-blue-200 px-2">
                            <span className="truncate text-xs font-medium">
                              {column.name} ({column.width.toFixed(1)}m)
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => resizeColumn(index, "decrease")}
                                disabled={column.width <= 0.1}
                                className="flex h-5 w-5 items-center justify-center rounded bg-white text-xs hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Decrease width by 0.1m"
                              >
                                <ChevronLeft className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => resizeColumn(index, "increase")}
                                disabled={column.width >= maxWidth}
                                className="flex h-5 w-5 items-center justify-center rounded bg-white text-xs hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Increase width by 0.1m"
                              >
                                <ChevronRight className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Grid with Row Headers */}
                  <div className="flex">
                    {/* Row Headers with Resize Controls */}
                    <div className="w-16">
                      {rows.map((row, index) => {
                        const otherRowsHeight = rows
                          .filter((_, i) => i !== index)
                          .reduce((sum, r) => sum + r.height, 0);
                        const maxHeight = block.height - otherRowsHeight;

                        return (
                          <div
                            key={row.id}
                            className="flex flex-col items-center justify-center border border-t-0 bg-green-200 px-1"
                            style={{
                              height: `${(row.height / getTotalUsedHeight()) * 400}px`,
                              minHeight: "60px",
                            }}
                          >
                            <div className="writing-mode-vertical mb-1 text-center text-xs font-medium">
                              {row.name}
                            </div>
                            <div className="mb-2 text-center text-xs">
                              ({row.height.toFixed(1)}m)
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <button
                                onClick={() => resizeRow(index, "increase")}
                                disabled={row.height >= maxHeight}
                                className="flex h-4 w-5 items-center justify-center rounded bg-white text-xs hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Increase height by 0.1m"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => resizeRow(index, "decrease")}
                                disabled={row.height <= 0.1}
                                className="flex h-4 w-5 items-center justify-center rounded bg-white text-xs hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Decrease height by 0.1m"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Grid Cells */}
                    <div className="flex-1">
                      <div
                        className="grid gap-1 border bg-white"
                        style={{
                          gridTemplateColumns: columns
                            .map((col) => `${col.width}fr`)
                            .join(" "),
                          gridTemplateRows: rows
                            .map((row) => `${row.height}fr`)
                            .join(" "),
                          height: "400px",
                        }}
                      >
                        {cells.map((cell) => {
                          const isSelected = selectedCell === cell.id;
                          const hasProduct =
                            cell.products && cell.products.length > 0;

                          return (
                            <div
                              key={cell.id}
                              className={`relative flex cursor-pointer flex-col items-center justify-center border p-1 transition-all duration-200 ${
                                isSelected
                                  ? "border-2 border-blue-500 bg-blue-100"
                                  : hasProduct
                                    ? "border-green-300 bg-green-50 hover:bg-green-100"
                                    : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                              } `}
                              onClick={() => handleCellClick(cell.id)}
                            >
                              <div className="text-center">
                                <div className="mb-1 text-xs font-medium text-gray-600">
                                  [{cell.row + 1}, {cell.column + 1}]
                                </div>
                                <div className="mb-1 text-xs text-gray-500">
                                  {cell.width.toFixed(1)}×
                                  {cell.height.toFixed(1)}m
                                </div>

                                {hasProduct ? (
                                  <div className="flex flex-col items-center">
                                    <Package className="mb-1 h-3 w-3 text-green-600" />
                                    <div className="text-center text-xs leading-tight font-medium break-words text-green-800">
                                      {cell.products![0]}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400">
                                    Empty
                                  </div>
                                )}
                              </div>

                              {/* Selection indicator */}
                              {isSelected && (
                                <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-500"></div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Assignment Panel */}
            <div className="lg:col-span-1">
              <div className="sticky top-4 rounded-lg border bg-white p-4">
                <h4 className="mb-4 flex items-center gap-2 font-medium">
                  <Package className="h-4 w-4" />
                  Product Assignment
                </h4>

                {selectedCellInfo ? (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-blue-50 p-3">
                      <div className="text-sm font-medium text-blue-800">
                        Selected Cell: [{selectedCellInfo.row + 1},{" "}
                        {selectedCellInfo.column + 1}]
                      </div>
                      <div className="text-xs text-blue-600">
                        Size: {selectedCellInfo.width.toFixed(1)}m ×{" "}
                        {selectedCellInfo.height.toFixed(1)}m
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="product-name">Product Name</Label>
                      <Input
                        id="product-name"
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="Enter product name..."
                        className="mt-1"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleAssignProduct}
                        disabled={!productName.trim()}
                        size="sm"
                        className="flex-1"
                      >
                        Assign Product
                      </Button>
                      {selectedCellInfo.products &&
                        selectedCellInfo.products.length > 0 && (
                          <Button
                            onClick={handleRemoveProduct}
                            variant="outline"
                            size="sm"
                          >
                            Remove
                          </Button>
                        )}
                    </div>

                    {selectedCellInfo.products &&
                      selectedCellInfo.products.length > 0 && (
                        <div className="rounded-lg bg-green-50 p-3">
                          <div className="mb-1 text-sm font-medium text-green-800">
                            Current Product:
                          </div>
                          <div className="text-sm text-green-700">
                            {selectedCellInfo.products[0]}
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <Package className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                    <p className="text-sm">Select a cell to assign products</p>
                  </div>
                )}
              </div>

              {/* Grid Statistics */}
              <div className="mt-4 rounded-lg bg-gray-50 p-4">
                <h5 className="mb-2 font-medium">Grid Statistics</h5>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>Total cells: {gridRows * gridColumns}</div>
                  <div>
                    Cells with products:{" "}
                    {
                      cells.filter((c) => c.products && c.products.length > 0)
                        .length
                    }
                  </div>
                  <div>
                    Empty cells:{" "}
                    {
                      cells.filter(
                        (c) => !c.products || c.products.length === 0,
                      ).length
                    }
                  </div>
                  <div>
                    Used width: {getTotalUsedWidth().toFixed(2)}m /{" "}
                    {block.width}m
                  </div>
                  <div>
                    Used height: {getTotalUsedHeight().toFixed(2)}m /{" "}
                    {block.height}m
                  </div>
                </div>
              </div>

              {/* Resize Instructions */}
              <div className="mt-4 rounded-lg bg-blue-50 p-4">
                <h5 className="mb-2 font-medium text-blue-800">
                  How to Resize
                </h5>
                <div className="space-y-1 text-sm text-blue-700">
                  <div>• Use ← → arrows on column headers to adjust width</div>
                  <div>• Use ↑ ↓ arrows on row headers to adjust height</div>
                  <div>• Each click changes size by 0.1 meters</div>
                  <div>• Constraints prevent exceeding block dimensions</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Grid: {gridRows}×{gridColumns} | Products:{" "}
            {cells.filter((c) => c.products && c.products.length > 0).length}
            {existingGrid && (
              <span className="ml-2 text-green-600">
                • Loaded from database
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSaveGrid} disabled={isSaving || !block}>
              {isSaving ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
