import { eq, like, asc, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ENV } from "./_core/env";
import * as memoryStore from "./_core/memoryStore";
import {
  users, cameraTypes, lensGroups, formats, filmTypes,
  paperBrands, paperTypes, paperSizes, printData,
  type InsertUser, type InsertCameraType, type InsertLensGroup, type InsertFormat,
  type InsertFilmType, type InsertPaperBrand, type InsertPaperType,
  type InsertPaperSize, type InsertPrintData,
} from "../drizzle/schema";

type DrizzleDb = ReturnType<typeof drizzle>;
let _db: DrizzleDb | null = null;

export async function getDb(): Promise<DrizzleDb | null> {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL, { max: 5 });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: updateSet,
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] ?? undefined;
}

// ─── Grey Print Data System Queries ──────────────────────────────────────────

// Camera Types
export async function getCameraTypes() {
  const db = await getDb();
  if (!db) return memoryStore.getCameraTypes();
  return db.select().from(cameraTypes).orderBy(asc(cameraTypes.sortOrder), asc(cameraTypes.name));
}
export async function createCameraType(data: InsertCameraType) {
  const db = await getDb();
  if (!db) return memoryStore.createCameraType(data);
  const rows = await db.insert(cameraTypes).values(data).returning({ id: cameraTypes.id });
  return rows[0].id;
}
export async function updateCameraType(id: number, data: Partial<InsertCameraType>) {
  const db = await getDb();
  if (!db) return memoryStore.updateCameraType(id, data);
  await db.update(cameraTypes).set({ ...data, updatedAt: new Date() }).where(eq(cameraTypes.id, id));
}
export async function deleteCameraType(id: number) {
  const db = await getDb();
  if (!db) return memoryStore.deleteCameraType(id);
  await db.delete(cameraTypes).where(eq(cameraTypes.id, id));
}

// Lens Groups
export async function getLensGroups(cameraTypeId: number) {
  const db = await getDb();
  if (!db) return memoryStore.getLensGroups(cameraTypeId);
  return db.select().from(lensGroups).where(eq(lensGroups.cameraTypeId, cameraTypeId)).orderBy(asc(lensGroups.sortOrder), asc(lensGroups.name));
}
export async function createLensGroup(data: InsertLensGroup) {
  const db = await getDb();
  if (!db) return memoryStore.createLensGroup(data);
  const rows = await db.insert(lensGroups).values(data).returning({ id: lensGroups.id });
  return rows[0].id;
}
export async function updateLensGroup(id: number, data: Partial<InsertLensGroup>) {
  const db = await getDb();
  if (!db) return memoryStore.updateLensGroup(id, data);
  await db.update(lensGroups).set({ ...data, updatedAt: new Date() }).where(eq(lensGroups.id, id));
}
export async function deleteLensGroup(id: number) {
  const db = await getDb();
  if (!db) return memoryStore.deleteLensGroup(id);
  await db.delete(lensGroups).where(eq(lensGroups.id, id));
}

// Formats
export async function getFormats(lensGroupId: number) {
  const db = await getDb();
  if (!db) return memoryStore.getFormats(lensGroupId);
  return db.select().from(formats).where(eq(formats.lensGroupId, lensGroupId)).orderBy(asc(formats.sortOrder), asc(formats.name));
}
export async function createFormat(data: InsertFormat) {
  const db = await getDb();
  if (!db) return memoryStore.createFormat(data);
  const rows = await db.insert(formats).values(data).returning({ id: formats.id });
  return rows[0].id;
}
export async function updateFormat(id: number, data: Partial<InsertFormat>) {
  const db = await getDb();
  if (!db) return memoryStore.updateFormat(id, data);
  await db.update(formats).set({ ...data, updatedAt: new Date() }).where(eq(formats.id, id));
}
export async function deleteFormat(id: number) {
  const db = await getDb();
  if (!db) return memoryStore.deleteFormat(id);
  await db.delete(formats).where(eq(formats.id, id));
}

// Film Types
export async function getFilmTypes(formatId: number) {
  const db = await getDb();
  if (!db) return memoryStore.getFilmTypes(formatId);
  return db.select().from(filmTypes).where(eq(filmTypes.formatId, formatId)).orderBy(asc(filmTypes.sortOrder), asc(filmTypes.name));
}
export async function createFilmType(data: InsertFilmType) {
  const db = await getDb();
  if (!db) return memoryStore.createFilmType(data);
  const rows = await db.insert(filmTypes).values(data).returning({ id: filmTypes.id });
  return rows[0].id;
}
export async function updateFilmType(id: number, data: Partial<InsertFilmType>) {
  const db = await getDb();
  if (!db) return memoryStore.updateFilmType(id, data);
  await db.update(filmTypes).set({ ...data, updatedAt: new Date() }).where(eq(filmTypes.id, id));
}
export async function deleteFilmType(id: number) {
  const db = await getDb();
  if (!db) return memoryStore.deleteFilmType(id);
  await db.delete(filmTypes).where(eq(filmTypes.id, id));
}

// Paper Brands
export async function getPaperBrands(filmTypeId: number) {
  const db = await getDb();
  if (!db) return memoryStore.getPaperBrands(filmTypeId);
  return db.select().from(paperBrands).where(eq(paperBrands.filmTypeId, filmTypeId)).orderBy(asc(paperBrands.sortOrder), asc(paperBrands.name));
}
export async function createPaperBrand(data: InsertPaperBrand) {
  const db = await getDb();
  if (!db) return memoryStore.createPaperBrand(data);
  const rows = await db.insert(paperBrands).values(data).returning({ id: paperBrands.id });
  return rows[0].id;
}
export async function updatePaperBrand(id: number, data: Partial<InsertPaperBrand>) {
  const db = await getDb();
  if (!db) return memoryStore.updatePaperBrand(id, data);
  await db.update(paperBrands).set({ ...data, updatedAt: new Date() }).where(eq(paperBrands.id, id));
}
export async function deletePaperBrand(id: number) {
  const db = await getDb();
  if (!db) return memoryStore.deletePaperBrand(id);
  await db.delete(paperBrands).where(eq(paperBrands.id, id));
}

// Paper Types
export async function getPaperTypes(paperBrandId: number) {
  const db = await getDb();
  if (!db) return memoryStore.getPaperTypes(paperBrandId);
  return db.select().from(paperTypes).where(eq(paperTypes.paperBrandId, paperBrandId)).orderBy(asc(paperTypes.sortOrder), asc(paperTypes.name));
}
export async function createPaperType(data: InsertPaperType) {
  const db = await getDb();
  if (!db) return memoryStore.createPaperType(data);
  const rows = await db.insert(paperTypes).values(data).returning({ id: paperTypes.id });
  return rows[0].id;
}
export async function updatePaperType(id: number, data: Partial<InsertPaperType>) {
  const db = await getDb();
  if (!db) return memoryStore.updatePaperType(id, data);
  await db.update(paperTypes).set({ ...data, updatedAt: new Date() }).where(eq(paperTypes.id, id));
}
export async function deletePaperType(id: number) {
  const db = await getDb();
  if (!db) return memoryStore.deletePaperType(id);
  await db.delete(paperTypes).where(eq(paperTypes.id, id));
}

// Paper Sizes
export async function getPaperSizes(paperTypeId: number) {
  const db = await getDb();
  if (!db) return memoryStore.getPaperSizes(paperTypeId);
  return db.select().from(paperSizes).where(eq(paperSizes.paperTypeId, paperTypeId)).orderBy(asc(paperSizes.sortOrder), asc(paperSizes.name));
}
export async function createPaperSize(data: InsertPaperSize) {
  const db = await getDb();
  if (!db) return memoryStore.createPaperSize(data);
  const rows = await db.insert(paperSizes).values(data).returning({ id: paperSizes.id });
  return rows[0].id;
}
export async function updatePaperSize(id: number, data: Partial<InsertPaperSize>) {
  const db = await getDb();
  if (!db) return memoryStore.updatePaperSize(id, data);
  await db.update(paperSizes).set({ ...data, updatedAt: new Date() }).where(eq(paperSizes.id, id));
}
export async function deletePaperSize(id: number) {
  const db = await getDb();
  if (!db) return memoryStore.deletePaperSize(id);
  await db.delete(paperSizes).where(eq(paperSizes.id, id));
}

// Print Data
type PrintDataUpsert = Omit<InsertPrintData, "extraData"> & {
  id?: number;
  extraData?: InsertPrintData["extraData"] | { key: string; value: string }[];
};

function parsePrintDataExtra(row: { extraData?: string | null }) {
  const extraData = row.extraData;
  if (typeof extraData === "string" && extraData) {
    try {
      return JSON.parse(extraData) as { key: string; value: string }[];
    } catch {
      return [];
    }
  }
  return Array.isArray(extraData) ? extraData : [];
}

export async function getPrintDataById(id: number) {
  const db = await getDb();
  if (!db) return memoryStore.getPrintDataById(id);
  const rows = await db.select().from(printData).where(eq(printData.id, id));
  const row = rows[0] ?? null;
  if (!row) return null;
  return { ...row, extraData: parsePrintDataExtra(row) };
}

export async function getPrintDataList(paperSizeId: number) {
  const db = await getDb();
  if (!db) return memoryStore.getPrintDataList(paperSizeId);
  const rows = await db.select().from(printData).where(eq(printData.paperSizeId, paperSizeId));
  return rows.map((row) => ({ ...row, extraData: parsePrintDataExtra(row) }));
}

export async function getPrintDataListAll() {
  const db = await getDb();
  if (!db) return memoryStore.getPrintDataListAll();
  const rows = await db
    .select({
      id: printData.id,
      paperSizeId: printData.paperSizeId,
      title: printData.title,
      exposureTime: printData.exposureTime,
      aperture: printData.aperture,
      filterYellow: printData.filterYellow,
      filterMagenta: printData.filterMagenta,
      filterCyan: printData.filterCyan,
      developer: printData.developer,
      developmentTime: printData.developmentTime,
      temperature: printData.temperature,
      dilution: printData.dilution,
      enlargerHeight: printData.enlargerHeight,
      testStrip: printData.testStrip,
      notes: printData.notes,
      extraData: printData.extraData,
      createdAt: printData.createdAt,
      updatedAt: printData.updatedAt,
      sizeName: paperSizes.name,
    })
    .from(printData)
    .leftJoin(paperSizes, eq(printData.paperSizeId, paperSizes.id))
    .orderBy(desc(printData.updatedAt));
  return rows.map((row) => ({
    ...row,
    sizeName: row.sizeName ?? "",
    extraData: parsePrintDataExtra(row),
  }));
}

export async function listAllPaperSizesWithPath(): Promise<{ id: number; name: string; path: string }[]> {
  const db = await getDb();
  if (!db) return memoryStore.listAllPaperSizesWithPath();
  const sizes = await db.select().from(paperSizes).orderBy(asc(paperSizes.sortOrder), asc(paperSizes.name));
  const paperTypesData = await db.select().from(paperTypes);
  const paperBrandsData = await db.select().from(paperBrands);
  const filmTypesData = await db.select().from(filmTypes);
  const formatsData = await db.select().from(formats);
  const lensGroupsData = await db.select().from(lensGroups);
  const cameraTypesData = await db.select().from(cameraTypes);
  const byId = <T extends { id: number }>(arr: T[]) => new Map(arr.map((x) => [x.id, x]));
  const typesById = byId(paperTypesData);
  const brandsById = byId(paperBrandsData);
  const filmsById = byId(filmTypesData);
  const formatsById = byId(formatsData);
  const lensesById = byId(lensGroupsData);
  const camerasById = byId(cameraTypesData);
  function buildPath(size: (typeof sizes)[0]): string {
    const type = typesById.get(size.paperTypeId);
    if (!type) return size.name;
    const brand = brandsById.get(type.paperBrandId);
    if (!brand) return `${type.name} › ${size.name}`;
    const film = filmsById.get(brand.filmTypeId);
    if (!film) return `${brand.name} › ${type.name} › ${size.name}`;
    const format = formatsById.get(film.formatId);
    if (!format) return `${film.name} › ${brand.name} › ${type.name} › ${size.name}`;
    const lens = lensesById.get(format.lensGroupId);
    if (!lens) return `${format.name} › ${film.name} › ${brand.name} › ${type.name} › ${size.name}`;
    const camera = camerasById.get(lens.cameraTypeId);
    if (!camera) return `${lens.name} › ${format.name} › ${film.name} › ${brand.name} › ${type.name} › ${size.name}`;
    return `${camera.name} › ${lens.name} › ${format.name} › ${film.name} › ${brand.name} › ${type.name} › ${size.name}`;
  }
  return sizes.map((s) => ({ id: s.id, name: s.name, path: buildPath(s) }));
}

export async function createPrintData(paperSizeId: number) {
  const db = await getDb();
  if (!db) return memoryStore.createPrintData(paperSizeId);
  const rows = await db.insert(printData).values({ paperSizeId } as InsertPrintData).returning({ id: printData.id });
  return rows[0].id;
}

export async function deletePrintData(id: number) {
  const db = await getDb();
  if (!db) return memoryStore.deletePrintData(id);
  await db.delete(printData).where(eq(printData.id, id));
}

export async function upsertPrintData(data: PrintDataUpsert) {
  const db = await getDb();
  const payload = {
    ...data,
    id: undefined,
    updatedAt: new Date(),
    extraData:
      data.extraData === undefined
        ? undefined
        : Array.isArray(data.extraData)
          ? JSON.stringify(data.extraData)
          : data.extraData,
  };
  if (!db) return memoryStore.upsertPrintData({ ...data, extraData: data.extraData } as Partial<InsertPrintData> & { paperSizeId: number });
  if (data.id != null) {
    const existing = await db.select().from(printData).where(eq(printData.id, data.id));
    if (existing.length > 0) {
      await db.update(printData).set(payload).where(eq(printData.id, data.id));
      return data.id;
    }
  }
  const rows = await db.insert(printData).values(payload as InsertPrintData).returning({ id: printData.id });
  return rows[0].id;
}

// ─── Recursive Copy Functions ────────────────────────────────────────────────

export async function copyPaperSize(id: number, targetPaperTypeId: number): Promise<number> {
  const db = await getDb();
  if (!db) return memoryStore.copyPaperSize(id, targetPaperTypeId);
  const [src] = await db.select().from(paperSizes).where(eq(paperSizes.id, id));
  if (!src) throw new Error("Paper size not found");
  const [newRow] = await db.insert(paperSizes).values({
    name: src.name, description: src.description, paperTypeId: targetPaperTypeId, sortOrder: src.sortOrder,
  }).returning({ id: paperSizes.id });
  const pdList = await db.select().from(printData).where(eq(printData.paperSizeId, id));
  for (const pd of pdList) {
    await db.insert(printData).values({
      paperSizeId: newRow.id,
      title: pd.title, exposureTime: pd.exposureTime, aperture: pd.aperture,
      filterYellow: pd.filterYellow, filterMagenta: pd.filterMagenta, filterCyan: pd.filterCyan,
      developer: pd.developer, developmentTime: pd.developmentTime, temperature: pd.temperature,
      dilution: pd.dilution, enlargerHeight: pd.enlargerHeight, testStrip: pd.testStrip,
      notes: pd.notes, extraData: pd.extraData,
    });
  }
  return newRow.id;
}

export async function copyPaperType(id: number, targetPaperBrandId: number): Promise<number> {
  const db = await getDb();
  if (!db) return memoryStore.copyPaperType(id, targetPaperBrandId);
  const [src] = await db.select().from(paperTypes).where(eq(paperTypes.id, id));
  if (!src) throw new Error("Paper type not found");
  const [newRow] = await db.insert(paperTypes).values({
    name: src.name, description: src.description, paperBrandId: targetPaperBrandId, sortOrder: src.sortOrder,
  }).returning({ id: paperTypes.id });
  const children = await db.select().from(paperSizes).where(eq(paperSizes.paperTypeId, id));
  await Promise.all(children.map((child) => copyPaperSize(child.id, newRow.id)));
  return newRow.id;
}

export async function copyPaperBrand(id: number, targetFilmTypeId: number): Promise<number> {
  const db = await getDb();
  if (!db) return memoryStore.copyPaperBrand(id, targetFilmTypeId);
  const [src] = await db.select().from(paperBrands).where(eq(paperBrands.id, id));
  if (!src) throw new Error("Paper brand not found");
  const [newRow] = await db.insert(paperBrands).values({
    name: src.name, description: src.description, filmTypeId: targetFilmTypeId, sortOrder: src.sortOrder,
  }).returning({ id: paperBrands.id });
  const children = await db.select().from(paperTypes).where(eq(paperTypes.paperBrandId, id));
  await Promise.all(children.map((child) => copyPaperType(child.id, newRow.id)));
  return newRow.id;
}

export async function copyFilmType(id: number, targetFormatId: number): Promise<number> {
  const db = await getDb();
  if (!db) return memoryStore.copyFilmType(id, targetFormatId);
  const [src] = await db.select().from(filmTypes).where(eq(filmTypes.id, id));
  if (!src) throw new Error("Film type not found");
  const [newRow] = await db.insert(filmTypes).values({
    name: src.name, description: src.description, formatId: targetFormatId, sortOrder: src.sortOrder, iso: src.iso,
  }).returning({ id: filmTypes.id });
  const children = await db.select().from(paperBrands).where(eq(paperBrands.filmTypeId, id));
  await Promise.all(children.map((child) => copyPaperBrand(child.id, newRow.id)));
  return newRow.id;
}

export async function copyFormat(id: number, targetLensGroupId: number): Promise<number> {
  const db = await getDb();
  if (!db) return memoryStore.copyFormat(id, targetLensGroupId);
  const [src] = await db.select().from(formats).where(eq(formats.id, id));
  if (!src) throw new Error("Format not found");
  const [newRow] = await db.insert(formats).values({
    name: src.name, description: src.description, lensGroupId: targetLensGroupId, sortOrder: src.sortOrder,
  }).returning({ id: formats.id });
  const children = await db.select().from(filmTypes).where(eq(filmTypes.formatId, id));
  await Promise.all(children.map((child) => copyFilmType(child.id, newRow.id)));
  return newRow.id;
}

export async function copyLensGroup(id: number, targetCameraTypeId: number): Promise<number> {
  const db = await getDb();
  if (!db) return memoryStore.copyLensGroup(id, targetCameraTypeId);
  const [src] = await db.select().from(lensGroups).where(eq(lensGroups.id, id));
  if (!src) throw new Error("Lens group not found");
  const [newRow] = await db.insert(lensGroups).values({
    name: src.name, description: src.description, cameraTypeId: targetCameraTypeId, sortOrder: src.sortOrder,
  }).returning({ id: lensGroups.id });
  const children = await db.select().from(formats).where(eq(formats.lensGroupId, id));
  await Promise.all(children.map((child) => copyFormat(child.id, newRow.id)));
  return newRow.id;
}

export async function copyCameraType(id: number): Promise<number> {
  const db = await getDb();
  if (!db) return memoryStore.copyCameraType(id);
  const [src] = await db.select().from(cameraTypes).where(eq(cameraTypes.id, id));
  if (!src) throw new Error("Camera type not found");
  const [newRow] = await db.insert(cameraTypes).values({
    name: `${src.name} (복사본)`, description: src.description, sortOrder: src.sortOrder,
  }).returning({ id: cameraTypes.id });
  const children = await db.select().from(lensGroups).where(eq(lensGroups.cameraTypeId, id));
  await Promise.all(children.map((child) => copyLensGroup(child.id, newRow.id)));
  return newRow.id;
}

// Search
export async function searchAll(query: string) {
  const db = await getDb();
  if (!db) return memoryStore.searchAll(query);
  const pattern = `%${query}%`;
  const [cameras, lenses, fmts, films, brands, types, sizes] = await Promise.all([
    db.select().from(cameraTypes).where(like(cameraTypes.name, pattern)).limit(10),
    db.select().from(lensGroups).where(like(lensGroups.name, pattern)).limit(10),
    db.select().from(formats).where(like(formats.name, pattern)).limit(10),
    db.select().from(filmTypes).where(like(filmTypes.name, pattern)).limit(10),
    db.select().from(paperBrands).where(like(paperBrands.name, pattern)).limit(10),
    db.select().from(paperTypes).where(like(paperTypes.name, pattern)).limit(10),
    db.select().from(paperSizes).where(like(paperSizes.name, pattern)).limit(10),
  ]);
  return { cameras, lenses, formats: fmts, films, brands, types, sizes };
}
