import { eq, like, asc, desc, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as memoryStore from "./_core/memoryStore";
import {
  users, nodes, printData,
  type InsertUser, type InsertNode, type InsertPrintData,
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

// ─── Nodes ────────────────────────────────────────────────────────────────────

export async function getNodes(parentId: number | null) {
  const db = await getDb();
  if (!db) return memoryStore.getNodes(parentId);
  let rows: (typeof nodes.$inferSelect)[];
  try {
    rows = parentId == null
      ? await db.select().from(nodes).where(isNull(nodes.parentId)).orderBy(asc(nodes.sortOrder), asc(nodes.name))
      : await db.select().from(nodes).where(eq(nodes.parentId, parentId)).orderBy(asc(nodes.sortOrder), asc(nodes.name));
  } catch (err) {
    console.warn("[db] getNodes failed (migration may still be running):", err);
    return [];
  }

  // Attach childCount for each node
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return rows.map((r) => ({ ...r, childCount: 0 }));
  const childCounts = await db
    .select({ parentId: nodes.parentId, count: sql<number>`count(*)::int` })
    .from(nodes)
    .where(inArray(nodes.parentId, ids))
    .groupBy(nodes.parentId);
  const countMap = new Map(childCounts.map((c) => [c.parentId, c.count]));
  return rows.map((r) => ({ ...r, childCount: countMap.get(r.id) ?? 0 }));
}

export async function getNodeById(id: number) {
  const db = await getDb();
  if (!db) return memoryStore.getNodeById(id);
  const rows = await db.select().from(nodes).where(eq(nodes.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createNode(data: InsertNode) {
  const db = await getDb();
  if (!db) return memoryStore.createNode(data);
  try {
    const rows = await db.insert(nodes).values(data).returning({ id: nodes.id });
    return rows[0].id;
  } catch (err) {
    console.error("[db] createNode failed:", err);
    throw err;
  }
}

export async function updateNode(id: number, data: Partial<InsertNode>) {
  const db = await getDb();
  if (!db) return memoryStore.updateNode(id, data);
  await db.update(nodes).set({ ...data, updatedAt: new Date() }).where(eq(nodes.id, id));
}

export async function deleteNode(id: number) {
  const db = await getDb();
  if (!db) return memoryStore.deleteNode(id);

  // Get all descendant IDs using recursive CTE
  // With postgres.js driver, db.execute() returns the rows array directly (no .rows wrapper)
  const result = await db.execute(sql`
    WITH RECURSIVE descendants AS (
      SELECT id FROM nodes WHERE id = ${id}
      UNION ALL
      SELECT n.id FROM nodes n
      INNER JOIN descendants d ON n."parentId" = d.id
    )
    SELECT id FROM descendants
  `);
  const allIds = (result as unknown as { id: number }[]).map((r) => r.id);
  if (allIds.length === 0) return;

  // Delete print data for all descendant nodes
  await db.delete(printData).where(inArray(printData.nodeId, allIds));
  // Delete all nodes (bulk delete — no FK constraints)
  await db.delete(nodes).where(inArray(nodes.id, allIds));
}

export async function getNodePath(id: number): Promise<{ id: number; name: string }[]> {
  const db = await getDb();
  if (!db) return memoryStore.getNodePath(id);

  // With postgres.js driver, db.execute() returns the rows array directly (no .rows wrapper)
  const result = await db.execute(sql`
    WITH RECURSIVE path AS (
      SELECT id, name, "parentId", 0 AS depth
      FROM nodes WHERE id = ${id}
      UNION ALL
      SELECT n.id, n.name, n."parentId", p.depth + 1
      FROM nodes n
      INNER JOIN path p ON n.id = p."parentId"
    )
    SELECT id, name FROM path ORDER BY depth DESC
  `);
  return result as unknown as { id: number; name: string }[];
}

export async function copyNode(id: number, targetParentId: number | null): Promise<number> {
  const db = await getDb();
  if (!db) return memoryStore.copyNode(id, targetParentId);

  const [src] = await db.select().from(nodes).where(eq(nodes.id, id));
  if (!src) throw new Error("Node not found");

  const [newRow] = await db.insert(nodes).values({
    parentId: targetParentId,
    name: src.name,
    description: src.description,
    sortOrder: src.sortOrder,
  }).returning({ id: nodes.id });

  // Copy print data
  const pdList = await db.select().from(printData).where(eq(printData.nodeId, id));
  if (pdList.length > 0) {
    await db.insert(printData).values(
      pdList.map((pd) => ({
        nodeId: newRow.id,
        title: pd.title, exposureTime: pd.exposureTime, aperture: pd.aperture,
        filterYellow: pd.filterYellow, filterMagenta: pd.filterMagenta, filterCyan: pd.filterCyan,
        developer: pd.developer, developmentTime: pd.developmentTime, temperature: pd.temperature,
        dilution: pd.dilution, enlargerHeight: pd.enlargerHeight, testStrip: pd.testStrip,
        notes: pd.notes, extraData: pd.extraData,
      }))
    );
  }

  // Copy children recursively
  const children = await db.select().from(nodes).where(eq(nodes.parentId, id));
  await Promise.all(children.map((child) => copyNode(child.id, newRow.id)));

  return newRow.id;
}

export async function listAllNodesWithPath(): Promise<{ id: number; name: string; path: string }[]> {
  const db = await getDb();
  if (!db) return memoryStore.listAllNodesWithPath();
  const allNodes = await db.select().from(nodes).orderBy(asc(nodes.sortOrder), asc(nodes.name));
  const byId = new Map(allNodes.map((n) => [n.id, n]));

  function buildPath(nodeId: number): string {
    const parts: string[] = [];
    let cur: (typeof allNodes)[0] | undefined = byId.get(nodeId);
    while (cur) {
      parts.unshift(cur.name);
      cur = cur.parentId != null ? byId.get(cur.parentId) : undefined;
    }
    return parts.join(" › ");
  }

  return allNodes.map((n) => ({ id: n.id, name: n.name, path: buildPath(n.id) }));
}

export async function searchNodes(query: string) {
  const db = await getDb();
  if (!db) return memoryStore.searchNodes(query);
  const pattern = `%${query}%`;
  return db.select().from(nodes).where(like(nodes.name, pattern)).limit(50);
}

// ─── Print Data ───────────────────────────────────────────────────────────────

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

export async function getPrintDataList(nodeId: number) {
  const db = await getDb();
  if (!db) return memoryStore.getPrintDataList(nodeId);
  try {
    const rows = await db.select().from(printData).where(eq(printData.nodeId, nodeId));
    return rows.map((row) => ({ ...row, extraData: parsePrintDataExtra(row) }));
  } catch (err) {
    console.warn("[db] getPrintDataList failed:", err);
    return [];
  }
}

export async function getPrintDataListAll() {
  const db = await getDb();
  if (!db) return memoryStore.getPrintDataListAll();
  const rows = await db
    .select({
      id: printData.id,
      nodeId: printData.nodeId,
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
      nodeName: nodes.name,
    })
    .from(printData)
    .leftJoin(nodes, eq(printData.nodeId, nodes.id))
    .orderBy(desc(printData.updatedAt));
  return rows.map((row) => ({
    ...row,
    nodeName: row.nodeName ?? "",
    extraData: parsePrintDataExtra(row),
  }));
}

export async function createPrintData(nodeId: number) {
  const db = await getDb();
  if (!db) return memoryStore.createPrintData(nodeId);
  const rows = await db.insert(printData).values({ nodeId }).returning({ id: printData.id });
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
  if (!db) return memoryStore.upsertPrintData({ ...data, extraData: data.extraData } as Partial<InsertPrintData> & { nodeId: number });
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
