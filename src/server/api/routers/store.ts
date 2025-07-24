import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

// Validation schemas
const StoreBlockSchema = z.object({
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
  rotation: z.union([
    z.literal(0),
    z.literal(90),
    z.literal(180),
    z.literal(270),
  ]),
  color: z.string().optional(),
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
          pathPoints: true,
        },
      });

      if (!store) {
        throw new Error("Store not found");
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
        storeId: z.string(),
        blocks: z.array(StoreBlockSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.layout.updateMany({
        where: { storeId: input.storeId },
        data: {
          blocks: input.blocks,
          updatedAt: new Date(),
        },
      });
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
