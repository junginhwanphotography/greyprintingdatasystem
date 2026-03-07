import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { expandQueryForSearch } from "./_core/aiSearch";

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
      .query(async ({ input }) => {
        const results = await db.searchNodesWithPath(input.query);
        const suggestions = results.length === 0 ? db.getSearchSuggestions(input.query) : [];
        return { results, suggestions };
      }),

    /** AI로 자연어·일부 단어를 검색 키워드로 확장한 뒤 검색 (GEMINI/OPENAI 있으면 사용) */
    searchSmart: publicProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => {
        try {
          const expanded = await expandQueryForSearch(input.query);
          const searchQuery = (expanded || input.query).trim();
          if (!searchQuery) return { results: [], suggestions: [], usedAI: false };
          const results = await db.searchNodesWithPath(searchQuery);
          const suggestions = results.length === 0 ? db.getSearchSuggestions(searchQuery) : [];
          const usedAI = expanded.trim().toLowerCase() !== input.query.trim().toLowerCase();
          return { results, suggestions, usedAI };
        } catch (err) {
          console.warn("[searchSmart]", err);
          const q = input.query.trim();
          if (!q) return { results: [], suggestions: [], usedAI: false };
          const results = await db.searchNodesWithPath(q);
          const suggestions = results.length === 0 ? db.getSearchSuggestions(q) : [];
          return { results, suggestions, usedAI: false };
        }
      }),
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
