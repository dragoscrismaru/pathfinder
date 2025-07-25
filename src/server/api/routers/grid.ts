// server/api/routers/grid.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Validation schemas
const GridColumnSchema = z.object({
  index: z.number(),
  width: z.number().min(0.1),
  name: z.string(),
});

const GridRowSchema = z.object({
  index: z.number(),
  height: z.number().min(0.1),
  name: z.string(),
});

const GridCellSchema = z.object({
  row: z.number(),
  column: z.number(),
  width: z.number().min(0.1),
  height: z.number().min(0.1),
  productName: z.string().optional(),
  isEmpty: z.boolean(),
  name: z.string().optional(),
});

export const gridRouter = createTRPCRouter({
  // Get grid configuration for a specific block
  getByBlockId: publicProcedure
    .input(z.object({ blockId: z.string() }))
    .query(async ({ ctx, input }) => {
      const grid = await ctx.db.blockGrid.findUnique({
        where: { blockId: input.blockId },
        include: {
          gridColumns: {
            orderBy: { index: "asc" },
          },
          gridRows: {
            orderBy: { index: "asc" },
          },
          gridCells: {
            orderBy: [{ row: "asc" }, { column: "asc" }],
          },
        },
      });

      return grid;
    }),

  // Save complete grid configuration
  saveGrid: publicProcedure
    .input(
      z.object({
        blockId: z.string(),
        layoutId: z.string(),
        storeId: z.string(),
        rows: z.number().min(1),
        columns: z.number().min(1),
        totalWidth: z.number(),
        totalHeight: z.number(),
        gridColumns: z.array(GridColumnSchema),
        gridRows: z.array(GridRowSchema),
        gridCells: z.array(GridCellSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      console.log(`💾 Saving grid configuration for block ${input.blockId}`);

      try {
        // Calculate world coordinates for cells
        const blockPosition = await ctx.db.layout.findFirst({
          where: { id: input.layoutId },
          select: {
            blocks: true, // This will need to be properly typed based on your schema
          },
        });

        // Find the specific block in the layout
        const layoutBlocks = (blockPosition?.blocks as any[]) || [];
        const block = layoutBlocks.find((b: any) => b.id === input.blockId);

        if (!block) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Block not found in layout",
          });
        }

        const cellsWithWorldCoords = input.gridCells.map((cell) => {
          // Calculate world coordinates based on block position + cell offset
          const columnWidth = input.gridColumns[cell.column]?.width || 0;
          const rowHeight = input.gridRows[cell.row]?.height || 0;

          // Calculate cumulative offset for this cell
          const xOffset = input.gridColumns
            .slice(0, cell.column)
            .reduce((sum, col) => sum + col.width, 0);
          const yOffset = input.gridRows
            .slice(0, cell.row)
            .reduce((sum, row) => sum + row.height, 0);

          const worldX = block.x + xOffset + cell.width / 2; // Center of cell
          const worldY = block.y + yOffset + cell.height / 2; // Center of cell

          return {
            ...cell,
            worldX,
            worldY,
          };
        });

        // Use transaction to ensure data consistency
        const result = await ctx.db.$transaction(async (tx) => {
          // Delete existing grid if it exists
          await tx.blockGrid.deleteMany({
            where: { blockId: input.blockId },
          });

          // Create new grid configuration
          const grid = await tx.blockGrid.create({
            data: {
              blockId: input.blockId,
              layoutId: input.layoutId,
              storeId: input.storeId,
              rows: input.rows,
              columns: input.columns,
              totalWidth: input.totalWidth,
              totalHeight: input.totalHeight,
            },
          });

          // Create columns
          await tx.gridColumn.createMany({
            data: input.gridColumns.map((col) => ({
              gridId: grid.id,
              index: col.index,
              width: col.width,
              name: col.name,
            })),
          });

          // Create rows
          await tx.gridRow.createMany({
            data: input.gridRows.map((row) => ({
              gridId: grid.id,
              index: row.index,
              height: row.height,
              name: row.name,
            })),
          });

          // Create cells with world coordinates
          await tx.gridCell.createMany({
            data: cellsWithWorldCoords.map((cell) => ({
              gridId: grid.id,
              row: cell.row,
              column: cell.column,
              width: cell.width,
              height: cell.height,
              productName: cell.productName || null,
              isEmpty: cell.isEmpty,
              worldX: cell.worldX,
              worldY: cell.worldY,
              name: cell.name || null,
            })),
          });

          return grid;
        });

        console.log(
          `✅ Saved grid configuration: ${input.rows}×${input.columns} with ${input.gridCells.length} cells`,
        );

        return {
          success: true,
          gridId: result.id,
          cellsCount: input.gridCells.length,
          productsCount: input.gridCells.filter((c) => !c.isEmpty).length,
        };
      } catch (error) {
        console.error("❌ Grid save failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save grid configuration",
        });
      }
    }),

  // Update single cell product assignment
  updateCellProduct: publicProcedure
    .input(
      z.object({
        blockId: z.string(),
        row: z.number(),
        column: z.number(),
        productName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const grid = await ctx.db.blockGrid.findUnique({
        where: { blockId: input.blockId },
      });

      if (!grid) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Grid configuration not found",
        });
      }

      const cell = await ctx.db.gridCell.findFirst({
        where: {
          gridId: grid.id,
          row: input.row,
          column: input.column,
        },
      });

      if (!cell) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cell not found",
        });
      }

      return await ctx.db.gridCell.update({
        where: { id: cell.id },
        data: {
          productName: input.productName || null,
          isEmpty: !input.productName,
        },
      });
    }),

  // Search for products across all grids
  searchProducts: publicProcedure
    .input(
      z.object({
        storeId: z.string(),
        layoutId: z.string(),
        productName: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const cells = await ctx.db.gridCell.findMany({
        where: {
          grid: {
            storeId: input.storeId,
            layoutId: input.layoutId,
          },
          productName: {
            contains: input.productName,
            mode: "insensitive",
          },
        },
        include: {
          grid: true,
        },
      });

      return cells.map((cell) => ({
        productName: cell.productName,
        blockId: cell.grid.blockId,
        row: cell.row,
        column: cell.column,
        worldX: cell.worldX,
        worldY: cell.worldY,
        cellInfo: `Block ${cell.grid.blockId}, Cell [${cell.row + 1}, ${cell.column + 1}]`,
      }));
    }),

  // Delete grid configuration
  deleteGrid: publicProcedure
    .input(z.object({ blockId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.blockGrid.deleteMany({
        where: { blockId: input.blockId },
      });

      return { success: true };
    }),
});
