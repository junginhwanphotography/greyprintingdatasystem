import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

/** MySQL2/drizzle insert result can be array [ResultSetHeader] or object { insertId } depending on driver version */
function getInsertId(result: unknown): number {
  if (Array.isArray(result) && result[0] != null && typeof (result[0] as { insertId?: number }).insertId === "number")
    return (result[0] as { insertId: number }).insertId;
  if (result != null && typeof (result as { insertId?: number }).insertId === "number")
    return (result as { insertId: number }).insertId;
  throw new Error("Insert did not return insertId");
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
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

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

// ─── Grey Print Data System Queries ──────────────────────────────────────────

import * as memoryStore from "./_core/memoryStore";
import { like, asc, desc, leftJoin } from "drizzle-orm";
import {
  cameraTypes, lensGroups, formats, filmTypes,
  paperBrands, paperTypes, paperSizes, printData,
  type InsertCameraType, type InsertLensGroup, type InsertFormat,
  type InsertFilmType, type InsertPaperBrand, type InsertPaperType,
  type InsertPaperSize, type InsertPrintData,
} from "../drizzle/schema";

// Camera Types
export async function getCameraTypes() {
  const db = await getDb();
  if (!db) return memoryStore.getCameraTypes();
  return db.select().from(cameraTypes).orderBy(asc(cameraTypes.sortOrder), asc(cameraTypes.name));
}
export async function createCameraType(data: InsertCameraType) {
  const db = await getDb();
  if (!db) return memoryStore.createCameraType(data);
  const result = await db.insert(cameraTypes).values(data);
  return result[0].insertId;
}
export async function updateCameraType(id: number, data: Partial<InsertCameraType>) {
  const db = await getDb();
  if (!db) return memoryStore.updateCameraType(id, data);
  await db.update(cameraTypes).set(data).where(eq(cameraTypes.id, id));
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
  const result = await db.insert(lensGroups).values(data);
  return result[0].insertId;
}
export async function updateLensGroup(id: number, data: Partial<InsertLensGroup>) {
  const db = await getDb();
  if (!db) return memoryStore.updateLensGroup(id, data);
  await db.update(lensGroups).set(data).where(eq(lensGroups.id, id));
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
  const result = await db.insert(formats).values(data);
  return result[0].insertId;
}
export async function updateFormat(id: number, data: Partial<InsertFormat>) {
  const db = await getDb();
  if (!db) return memoryStore.updateFormat(id, data);
  await db.update(formats).set(data).where(eq(formats.id, id));
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
  const result = await db.insert(filmTypes).values(data);
  return result[0].insertId;
}
export async function updateFilmType(id: number, data: Partial<InsertFilmType>) {
  const db = await getDb();
  if (!db) return memoryStore.updateFilmType(id, data);
  await db.update(filmTypes).set(data).where(eq(filmTypes.id, id));
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
  const result = await db.insert(paperBrands).values(data);
  return result[0].insertId;
}
export async function updatePaperBrand(id: number, data: Partial<InsertPaperBrand>) {
  const db = await getDb();
  if (!db) return memoryStore.updatePaperBrand(id, data);
  await db.update(paperBrands).set(data).where(eq(paperBrands.id, id));
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
  const result = await db.insert(paperTypes).values(data);
  return result[0].insertId;
}
export async function updatePaperType(id: number, data: Partial<InsertPaperType>) {
  const db = await getDb();
  if (!db) return memoryStore.updatePaperType(id, data);
  await db.update(paperTypes).set(data).where(eq(paperTypes.id, id));
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
  const result = await db.insert(paperSizes).values(data);
  return result[0].insertId;
}
export async function updatePaperSize(id: number, data: Partial<InsertPaperSize>) {
  const db = await getDb();
  if (!db) return memoryStore.updatePaperSize(id, data);
  await db.update(paperSizes).set(data).where(eq(paperSizes.id, id));
}
export async function deletePaperSize(id: number) {
  const db = await getDb();
  if (!db) return memoryStore.deletePaperSize(id);
  await db.delete(paperSizes).where(eq(paperSizes.id, id));
}

// Print Data (extraData: API sends array, DB stores JSON string)
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
  const pathMap = new Map<number, string>();
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
  try {
    const result = await db.insert(printData).values({ paperSizeId } as InsertPrintData);
    return getInsertId(result);
  } catch (err) {
    console.error("[Database] createPrintData failed:", err);
    throw err;
  }
}

export async function upsertPrintData(data: PrintDataUpsert) {
  const db = await getDb();
  const payload = {
    ...data,
    id: undefined,
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
  const result = await db.insert(printData).values(payload as InsertPrintData);
  return getInsertId(result);
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
