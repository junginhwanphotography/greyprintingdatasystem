import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

const nameInput = z.object({ name: z.string().min(1).max(255), description: z.string().optional() });

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

  // ─── Camera Types ──────────────────────────────────────────────────────────
  cameras: router({
    list: publicProcedure.query(() => db.getCameraTypes()),
    create: publicProcedure
      .input(nameInput)
      .mutation(({ input }) => db.createCameraType({ name: input.name, description: input.description })),
    update: publicProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).max(255).optional(), description: z.string().optional() }))
      .mutation(({ input }) => db.updateCameraType(input.id, { name: input.name, description: input.description })),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteCameraType(input.id)),
  }),

  // ─── Lens Groups ───────────────────────────────────────────────────────────
  lenses: router({
    list: publicProcedure
      .input(z.object({ cameraTypeId: z.number() }))
      .query(({ input }) => db.getLensGroups(input.cameraTypeId)),
    create: publicProcedure
      .input(nameInput.extend({ cameraTypeId: z.number() }))
      .mutation(({ input }) => db.createLensGroup({ name: input.name, description: input.description, cameraTypeId: input.cameraTypeId })),
    update: publicProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).max(255).optional(), description: z.string().optional() }))
      .mutation(({ input }) => db.updateLensGroup(input.id, { name: input.name, description: input.description })),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteLensGroup(input.id)),
  }),

  // ─── Formats ───────────────────────────────────────────────────────────────
  formats: router({
    list: publicProcedure
      .input(z.object({ lensGroupId: z.number() }))
      .query(({ input }) => db.getFormats(input.lensGroupId)),
    create: publicProcedure
      .input(nameInput.extend({ lensGroupId: z.number() }))
      .mutation(({ input }) => db.createFormat({ name: input.name, description: input.description, lensGroupId: input.lensGroupId })),
    update: publicProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).max(255).optional(), description: z.string().optional() }))
      .mutation(({ input }) => db.updateFormat(input.id, { name: input.name, description: input.description })),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteFormat(input.id)),
  }),

  // ─── Film Types ────────────────────────────────────────────────────────────
  films: router({
    list: publicProcedure
      .input(z.object({ formatId: z.number() }))
      .query(({ input }) => db.getFilmTypes(input.formatId)),
    create: publicProcedure
      .input(nameInput.extend({ formatId: z.number(), iso: z.string().optional() }))
      .mutation(({ input }) => db.createFilmType({ name: input.name, description: input.description, formatId: input.formatId, iso: input.iso })),
    update: publicProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).max(255).optional(), description: z.string().optional(), iso: z.string().optional() }))
      .mutation(({ input }) => db.updateFilmType(input.id, { name: input.name, description: input.description, iso: input.iso })),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteFilmType(input.id)),
  }),

  // ─── Paper Brands ──────────────────────────────────────────────────────────
  paperBrands: router({
    list: publicProcedure
      .input(z.object({ filmTypeId: z.number() }))
      .query(({ input }) => db.getPaperBrands(input.filmTypeId)),
    create: publicProcedure
      .input(nameInput.extend({ filmTypeId: z.number() }))
      .mutation(({ input }) => db.createPaperBrand({ name: input.name, description: input.description, filmTypeId: input.filmTypeId })),
    update: publicProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).max(255).optional(), description: z.string().optional() }))
      .mutation(({ input }) => db.updatePaperBrand(input.id, { name: input.name, description: input.description })),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deletePaperBrand(input.id)),
  }),

  // ─── Paper Types ───────────────────────────────────────────────────────────
  paperTypes: router({
    list: publicProcedure
      .input(z.object({ paperBrandId: z.number() }))
      .query(({ input }) => db.getPaperTypes(input.paperBrandId)),
    create: publicProcedure
      .input(nameInput.extend({ paperBrandId: z.number() }))
      .mutation(({ input }) => db.createPaperType({ name: input.name, description: input.description, paperBrandId: input.paperBrandId })),
    update: publicProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).max(255).optional(), description: z.string().optional() }))
      .mutation(({ input }) => db.updatePaperType(input.id, { name: input.name, description: input.description })),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deletePaperType(input.id)),
  }),

  // ─── Paper Sizes ───────────────────────────────────────────────────────────
  paperSizes: router({
    list: publicProcedure
      .input(z.object({ paperTypeId: z.number() }))
      .query(({ input }) => db.getPaperSizes(input.paperTypeId)),
    create: publicProcedure
      .input(nameInput.extend({ paperTypeId: z.number() }))
      .mutation(({ input }) => db.createPaperSize({ name: input.name, description: input.description, paperTypeId: input.paperTypeId })),
    update: publicProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).max(255).optional(), description: z.string().optional() }))
      .mutation(({ input }) => db.updatePaperSize(input.id, { name: input.name, description: input.description })),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deletePaperSize(input.id)),
    listAllWithPath: publicProcedure
      .query(() => db.listAllPaperSizesWithPath()),
  }),

  // ─── Print Data ────────────────────────────────────────────────────────────
  printData: router({
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getPrintDataById(input.id)),
    list: publicProcedure
      .input(z.object({ paperSizeId: z.number() }))
      .query(({ input }) => db.getPrintDataList(input.paperSizeId)),
    listAll: publicProcedure
      .query(() => db.getPrintDataListAll()),
    create: publicProcedure
      .input(z.object({ paperSizeId: z.number() }))
      .mutation(({ input }) => db.createPrintData(input.paperSizeId)),
    upsert: publicProcedure
      .input(z.object({
        id: z.number().optional(),
        paperSizeId: z.number(),
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

  // ─── Search ────────────────────────────────────────────────────────────────
  search: router({
    all: publicProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(({ input }) => db.searchAll(input.query)),
  }),
});

export type AppRouter = typeof appRouter;
