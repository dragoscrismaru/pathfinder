import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Validation schemas
export const StoreBlockSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().min(0.1),
  height: z.number().min(0.1),
  type: z.enum([
    "wall",
    "room",
    "shelf",
    "counter",
    "entrance",
    "checkout",
    "building",
  ]),
  name: z.string().min(1),

  color: z.string().optional(),
});

export const PathPointSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  type: z.enum(["start", "end"]),
});

export const storeRouter = createTRPCRouter({
  // Get all stores
  getAll: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.store.findMany({
      include: {
        layouts: {
          select: {
            id: true,
            name: true,
            updatedAt: true,
          },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }),

  // Get store by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const store = await ctx.db.store.findUnique({
        where: { id: input.id },
        include: {
          layouts: true,
          products: true,
        },
      });

      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found",
        });
      }
      return store;
    }),

  // Create store
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.store.create({
        data: {
          name: input.name,
          description: input.description,
          layouts: {
            create: {
              name: "Main Layout",
              blocks: [],
            },
          },
        },
        include: {
          layouts: true,
        },
      });
    }),

  // Update layout
  updateLayout: publicProcedure
    .input(
      z.object({
        layoutId: z.string(), // ✅ Specify which layout to update
        blocks: z.array(StoreBlockSchema),
        pathPoints: z.array(PathPointSchema).optional().default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // const startTime = Date.now();

      console.log(`💾 Updating layout ${input.layoutId}`);

      // Verify layout exists
      const layout = await ctx.db.layout.findUnique({
        where: { id: input.layoutId },
      });

      if (!layout) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Layout not found",
        });
      }

      // ✅ Update specific layout only
      const result = await ctx.db.layout.update({
        where: { id: input.layoutId }, // Target specific layout
        data: {
          blocks: input.blocks,
          // pathPoints: input.pathPoints,
          updatedAt: new Date(),
        },
      });

      // const endTime = Date.now();
      console.log(`✅ Updated layout ${input.layoutId} successfully`);

      return {
        success: true,
        layoutId: result.id,
        blocksCount: input.blocks.length,
        pathPointsCount: input.pathPoints.length,
        updatedAt: result.updatedAt,
      };
    }),

  // Delete store
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.store.delete({
        where: { id: input.id },
      });
    }),
});
