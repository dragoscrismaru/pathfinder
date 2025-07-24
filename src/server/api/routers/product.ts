import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const productRouter = createTRPCRouter({
  // Get products for store
  getByStore: publicProcedure
    .input(z.object({ storeId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.product.findMany({
        where: { storeId: input.storeId },
        orderBy: { name: "asc" },
      });
    }),

  // Create product
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        storeId: z.string(),
        blockId: z.string().optional(),
        x: z.number().optional(),
        y: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.product.create({
        data: input,
      });
    }),

  // Update product position
  updatePosition: publicProcedure
    .input(
      z.object({
        id: z.string(),
        blockId: z.string().optional(),
        x: z.number().optional(),
        y: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.product.update({
        where: { id: input.id },
        data: {
          blockId: input.blockId,
          x: input.x,
          y: input.y,
        },
      });
    }),

  // Search products
  search: publicProcedure
    .input(
      z.object({
        storeId: z.string(),
        query: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.db.product.findMany({
        where: {
          storeId: input.storeId,
          name: {
            contains: input.query,
            mode: "insensitive",
          },
        },
      });
    }),
});
