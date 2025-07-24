import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { PathPointSchema, StoreBlockSchema } from "./store";

export const layoutRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(z.object({ storeId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.layout.findMany({
        where: {
          storeId: input.storeId,
        },
        include: {
          pathPoints: {},
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  // 🆕 Get specific layout by ID
  getById: publicProcedure
    .input(
      z.object({
        // storeId: z.string(),
        layoutId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const layout = await ctx.db.layout.findFirst({
        where: {
          id: input.layoutId,
          //   storeId: input.storeId, // Ensure layout belongs to store
        },
        include: {
          store: {
            select: { id: true, name: true, description: true },
          },
        },
      });

      if (!layout) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Layout not found or does not belong to this store",
        });
      }

      return layout;
    }),

  // 🆕 Update specific layout
  updateLayout: publicProcedure
    .input(
      z.object({
        layoutId: z.string(),
        blocks: z.array(StoreBlockSchema),
        pathPoints: z.array(PathPointSchema).optional().default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      console.log(`💾 Updating layout ${input.layoutId}`);

      // Verify layout exists
      const existingLayout = await ctx.db.layout.findUnique({
        where: { id: input.layoutId },
      });

      if (!existingLayout) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Layout not found",
        });
      }

      // ✅ Update specific layout only
      const result = await ctx.db.layout.update({
        where: { id: input.layoutId },
        data: {
          blocks: input.blocks,
          //   pathPoints: input.pathPoints,
          updatedAt: new Date(),
        },
      });

      console.log(
        `✅ Updated layout ${input.layoutId} with ${input.blocks.length} blocks`,
      );

      return {
        success: true,
        layoutId: result.id,
        blocksCount: input.blocks.length,
        pathPointsCount: input.pathPoints.length,
        updatedAt: result.updatedAt,
      };
    }),

  // 🆕 Delete layout
  deleteLayout: publicProcedure
    .input(
      z.object({
        layoutId: z.string(),
        storeId: z.string(), // For verification
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify layout belongs to store
      const layout = await ctx.db.layout.findFirst({
        where: {
          id: input.layoutId,
          storeId: input.storeId,
        },
      });

      if (!layout) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Layout not found or does not belong to this store",
        });
      }

      // Check if it's the last layout (prevent deletion)
      const layoutCount = await ctx.db.layout.count({
        where: { storeId: input.storeId },
      });

      if (layoutCount <= 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot delete the last layout. Each store must have at least one layout.",
        });
      }

      await ctx.db.layout.delete({
        where: { id: input.layoutId },
      });

      return { success: true };
    }),

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
              pathPoints: [],
            },
          },
        },
        include: {
          layouts: true,
        },
      });
    }),
  //   hello: publicProcedure
  //     .input(z.object({ text: z.string() }))
  //     .query(({ input }) => {
  //       return {
  //         greeting: `Hello ${input.text}`,
  //       };
  //     }),

  //   create: publicProcedure
  //     .input(z.object({ name: z.string().min(1) }))
  //     .mutation(async ({ ctx, input }) => {
  //       return ctx.db.post.create({
  //         data: {
  //           name: input.name,
  //         },
  //       });
  //     }),

  //   getLatest: publicProcedure.query(async ({ ctx }) => {
  //     const post = await ctx.db.post.findFirst({
  //       orderBy: { createdAt: "desc" },
  //     });

  //     return post ?? null;
  //   }),
});
