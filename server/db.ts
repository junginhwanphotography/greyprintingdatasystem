import { eq, like, asc, desc, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as memoryStore from "./_core/memoryStore";
import { SEARCH_SYNONYMS } from "./searchSynonyms.js";
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

export type SearchNodeResult = { id: number; name: string; description: string | null; path: string };

/** 검색 결과 없을 때 추천 검색어 (한글→영문 등) */
export function getSearchSuggestions(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out = new Set<string>();
  const tokens = q.split(/\s+/).filter((t) => t.length > 0);
  for (const token of tokens) {
    for (const [ko, enList] of Object.entries(SEARCH_SYNONYMS)) {
      if (token.includes(ko) || ko.includes(token)) {
        enList.forEach((en) => out.add(en));
        out.add(ko);
      }
      for (const en of enList) {
        if (token.includes(en) || en.includes(token)) {
          out.add(en);
          out.add(ko);
        }
      }
    }
  }
  return [...out].filter((s) => s.toLowerCase() !== q).slice(0, 6);
}

/** 각 토큰에 대해 검색할 때 쓸 문자열 목록 (원본 + 동의어, 소문자) */
function getMatchTerms(token: string): string[] {
  const lower = token.toLowerCase().trim();
  if (!lower) return [];
  const terms = new Set<string>([lower]);
  for (const [ko, enList] of Object.entries(SEARCH_SYNONYMS)) {
    if (lower.includes(ko) || ko.includes(lower)) {
      terms.add(ko);
      enList.forEach((en) => terms.add(en));
    }
    for (const en of enList) {
      if (lower.includes(en) || en.includes(lower)) {
        terms.add(en);
        terms.add(ko);
      }
    }
  }
  return [...terms];
}

/** 토큰에 글자(한글/영문)가 포함되면 단어형, 숫자만 있으면 숫자형 */
function isWordLikeToken(token: string): boolean {
  return /[a-z가-힣\u3131-\u318e\uac00-\ud7a3]/.test(token);
}

function scoreNode(
  name: string,
  path: string,
  pathSegments: string[],
  tokenMatchTerms: string[][],
  rawTokens: string[]
): number {
  const nameLower = name.toLowerCase();
  const pathLower = path.toLowerCase();
  let baseScore = 0;
  let matchedTokenGroups = 0;
  let wordLikeGroupsMatched = 0;
  for (let g = 0; g < tokenMatchTerms.length; g++) {
    const terms = tokenMatchTerms[g];
    const raw = rawTokens[g];
    let groupScore = 0;
    for (const t of terms) {
      if (!t) continue;
      if (nameLower === t) groupScore += 20;
      else if (nameLower.startsWith(t)) groupScore += 10;
      else if (nameLower.includes(t)) groupScore += 5;
      if (pathLower.includes(t)) groupScore += 2;
    }
    if (groupScore > 0) {
      matchedTokenGroups += 1;
      if (raw && isWordLikeToken(raw)) wordLikeGroupsMatched += 1;
    }
    baseScore += groupScore;
  }
  const groupBonus = tokenMatchTerms.length > 1 ? matchedTokenGroups * 50 : 0;
  const wordBonus = wordLikeGroupsMatched * 25;

  let segmentsMatched = 0;
  for (const seg of pathSegments) {
    const segLower = seg.toLowerCase();
    if (tokenMatchTerms.some((terms) => terms.some((t) => t && segLower.includes(t))))
      segmentsMatched += 1;
  }
  const segmentBonus = segmentsMatched * 40;

  const nameExactBonus = tokenMatchTerms.some((terms) =>
    terms.some((t) => t && nameLower === t)
  )
    ? 30
    : 0;

  return baseScore + groupBonus + wordBonus + segmentBonus + nameExactBonus;
}

/** name 또는 path가 해당 토큰의 matchTerms 중 하나라도 포함하면 true */
function tokenMatches(name: string, path: string, terms: string[]): boolean {
  const nl = name.toLowerCase();
  const pl = path.toLowerCase();
  return terms.some((t) => t && (nl.includes(t) || pl.includes(t)));
}

export async function searchNodesWithPath(query: string): Promise<SearchNodeResult[]> {
  const db = await getDb();
  if (!db) return memoryStore.searchNodesWithPath(query);

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

  const rawTokens = query.trim().split(/\s+/).filter((t) => t.length > 0);
  if (rawTokens.length === 0) return [];

  const tokenMatchTerms = rawTokens.map((t) => getMatchTerms(t)).filter((a) => a.length > 0);
  const rawTokensAligned = rawTokens.filter((t) => getMatchTerms(t).length > 0);

  const withPath = allNodes.map((n) => ({
    id: n.id,
    name: n.name,
    description: n.description,
    path: buildPath(n.id),
  }));

  const matched = withPath
    .map((n) => {
      const pathSegments = n.path ? n.path.split(" › ") : [];
      return {
        ...n,
        score: scoreNode(n.name, n.path, pathSegments, tokenMatchTerms, rawTokensAligned),
      };
    })
    .filter((n) => {
      if (n.score <= 0) return false;
      return tokenMatchTerms.some((terms) => tokenMatches(n.name, n.path, terms));
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);

  return matched.map(({ id, name, description, path }) => ({ id, name, description, path }));
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
