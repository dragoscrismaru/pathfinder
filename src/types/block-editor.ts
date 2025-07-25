// types/block-editor.ts
export interface GridCell {
  id: string;
  row: number;
  column: number;
  width: number; // in meters
  height: number; // in meters
  products?: string[]; // product IDs that will be placed here
  name?: string;
  isEmpty?: boolean;
  // Merging properties
  rowSpan?: number; // How many rows this cell spans
  colSpan?: number; // How many columns this cell spans
  isMerged?: boolean; // Is this cell part of a merged cell
  mergedWith?: string; // ID of the parent cell if this is merged
  isMainCell?: boolean; // Is this the main cell in a merged group
}

export interface GridColumn {
  id: string;
  index: number;
  width: number; // in meters
  name?: string;
  resizable?: boolean;
}

export interface GridRow {
  id: string;
  index: number;
  height: number; // in meters
  name?: string;
  resizable?: boolean;
}

export interface BlockGrid {
  blockId: string;
  columns: GridColumn[];
  rows: GridRow[];
  cells: GridCell[];
  totalWidth: number;
  totalHeight: number;
}

export interface GridDimensions {
  rows: number;
  columns: number;
  maxWidth: number;
  maxHeight: number;
}

export interface MergeOperation {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}
