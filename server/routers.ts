import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Nodes (flexible hierarchy, any depth) ───────────────────────────────
  nodes: router({
    list: publicProcedure
      .input(z.object({ parentId: z.number().nullable() }))
      .query(({ input }) => db.getNodes(input.parentId)),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getNodeById(input.id)),

    getPath: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getNodePath(input.id)),

    create: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        parentId: z.number().nullable(),
      }))
      .mutation(({ input }) => db.createNode({
        name: input.name,
        description: input.description,
        parentId: input.parentId,
        sortOrder: 0,
      })),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
      }))
      .mutation(({ input }) => db.updateNode(input.id, {
        name: input.name,
        description: input.description,
      })),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteNode(input.id)),

    copy: publicProcedure
      .input(z.object({ id: z.number(), targetParentId: z.number().nullable() }))
      .mutation(({ input }) => db.copyNode(input.id, input.targetParentId)),

    listAllWithPath: publicProcedure
      .query(() => db.listAllNodesWithPath()),

    search: publicProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(({ input }) => db.searchNodes(input.query)),
  }),

  // ─── Print Data ────────────────────────────────────────────────────────────
  printData: router({
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getPrintDataById(input.id)),

    list: publicProcedure
      .input(z.object({ nodeId: z.number() }))
      .query(({ input }) => db.getPrintDataList(input.nodeId)),

    listAll: publicProcedure
      .query(() => db.getPrintDataListAll()),

    create: publicProcedure
      .input(z.object({ nodeId: z.number() }))
      .mutation(({ input }) => db.createPrintData(input.nodeId)),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deletePrintData(input.id)),

    upsert: publicProcedure
      .input(z.object({
        id: z.number().optional(),
        nodeId: z.number(),
        title: z.string().optional(),
        exposureTime: z.string().optional(),
        aperture: z.string().optional(),
        filterYellow: z.string().optional(),
        filterMagenta: z.string().optional(),
        filterCyan: z.string().optional(),
        developer: z.string().optional(),
        developmentTime: z.string().optional(),
        temperature: z.string().optional(),
        dilution: z.string().optional(),
        enlargerHeight: z.string().optional(),
        testStrip: z.string().optional(),
        notes: z.string().optional(),
        extraData: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
      }))
      .mutation(({ input }) => db.upsertPrintData(input)),
  }),
});

export type AppRouter = typeof appRouter;
