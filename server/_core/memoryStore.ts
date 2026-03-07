/**
 * In-memory store for local preview when DATABASE_URL is not set.
 * Supports flexible tree-based hierarchy (any depth) + print data.
 */

import { SEARCH_SYNONYMS } from "../searchSynonyms.js";

let _lastId = 0;
const nextId = () => ++_lastId;

// ─── Nodes ────────────────────────────────────────────────────────────────────

type NodeRecord = {
  id: number;
  parentId: number | null;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

const _nodes: NodeRecord[] = [];

export function getNodes(parentId: number | null): (NodeRecord & { childCount: number })[] {
  const children = _nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return children.map((n) => ({
    ...n,
    childCount: _nodes.filter((c) => c.parentId === n.id).length,
  }));
}

export function getNodeById(id: number): NodeRecord | null {
  return _nodes.find((n) => n.id === id) ?? null;
}

export function createNode(data: { name: string; description?: string | null; parentId: number | null; sortOrder?: number }): number {
  const id = nextId();
  const siblings = _nodes.filter((n) => n.parentId === data.parentId);
  _nodes.push({
    id,
    parentId: data.parentId,
    name: data.name,
    description: data.description ?? null,
    sortOrder: data.sortOrder ?? siblings.length,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return id;
}

export function updateNode(id: number, data: { name?: string; description?: string | null }) {
  const node = _nodes.find((n) => n.id === id);
  if (node) {
    if (data.name !== undefined) node.name = data.name;
    if (data.description !== undefined) node.description = data.description;
    node.updatedAt = new Date();
  }
}

export function deleteNode(id: number) {
  const children = _nodes.filter((n) => n.parentId === id);
  children.forEach((c) => deleteNode(c.id));
  const pdToDelete = _printData.filter((p) => p.nodeId === id).map((p) => p.id);
  pdToDelete.forEach((pdId) => {
    const idx = _printData.findIndex((p) => p.id === pdId);
    if (idx !== -1) _printData.splice(idx, 1);
  });
  const idx = _nodes.findIndex((n) => n.id === id);
  if (idx !== -1) _nodes.splice(idx, 1);
}

export function getNodePath(id: number): { id: number; name: string }[] {
  const path: { id: number; name: string }[] = [];
  let currentId: number | null = id;
  while (currentId !== null) {
    const node = _nodes.find((n) => n.id === currentId);
    if (!node) break;
    path.unshift({ id: node.id, name: node.name });
    currentId = node.parentId;
  }
  return path;
}

export function copyNode(id: number, targetParentId: number | null): number {
  const src = _nodes.find((n) => n.id === id);
  if (!src) throw new Error("Node not found");
  const newId = createNode({
    name: src.name,
    description: src.description,
    parentId: targetParentId,
    sortOrder: src.sortOrder,
  });
  const pdList = _printData.filter((p) => p.nodeId === id);
  const now = new Date();
  pdList.forEach((pd) => {
    _printData.push({ ...pd, id: nextId(), nodeId: newId, createdAt: now, updatedAt: now });
  });
  const children = _nodes.filter((n) => n.parentId === id);
  children.forEach((c) => copyNode(c.id, newId));
  return newId;
}

export function listAllNodesWithPath(): { id: number; name: string; path: string }[] {
  return _nodes
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((n) => ({
      id: n.id,
      name: n.name,
      path: getNodePath(n.id)
        .map((p) => p.name)
        .join(" › "),
    }));
}

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
      if (lower.includes(en) || en.includes(lower)) { terms.add(en); terms.add(ko); }
    }
  }
  return [...terms];
}

function tokenMatches(name: string, path: string, terms: string[]): boolean {
  const nl = name.toLowerCase();
  const pl = path.toLowerCase();
  return terms.some((t) => t && (nl.includes(t) || pl.includes(t)));
}

export function searchNodesWithPath(query: string): { id: number; name: string; description: string | null; path: string }[] {
  const rawTokens = query.trim().split(/\s+/).filter((t) => t.length > 0);
  if (rawTokens.length === 0) return [];

  const tokenMatchTerms = rawTokens.map((t) => getMatchTerms(t)).filter((a) => a.length > 0);
  const rawTokensAligned = rawTokens.filter((t) => getMatchTerms(t).length > 0);

  const withPath = _nodes.map((n) => ({
    id: n.id,
    name: n.name,
    description: n.description,
    path: getNodePath(n.id).map((p) => p.name).join(" › "),
  }));

  function isWordLikeToken(token: string): boolean {
    return /[a-z가-힣\u3131-\u318e\uac00-\ud7a3]/.test(token);
  }

  const score = (name: string, path: string) => {
    const nl = name.toLowerCase();
    const pl = path.toLowerCase();
    const pathSegments = path ? path.split(" › ") : [];
    let baseScore = 0;
    let matchedGroups = 0;
    let wordLikeMatched = 0;
    for (let g = 0; g < tokenMatchTerms.length; g++) {
      const terms = tokenMatchTerms[g];
      const raw = rawTokensAligned[g];
      let scoreG = 0;
      for (const t of terms) {
        if (nl === t) scoreG += 20;
        else if (nl.startsWith(t)) scoreG += 10;
        else if (nl.includes(t)) scoreG += 5;
        if (pl.includes(t)) scoreG += 2;
      }
      if (scoreG > 0) {
        matchedGroups += 1;
        if (raw && isWordLikeToken(raw)) wordLikeMatched += 1;
      }
      baseScore += scoreG;
    }
    const groupBonus = tokenMatchTerms.length > 1 ? matchedGroups * 50 : 0;
    const wordBonus = wordLikeMatched * 25;
    let segmentsMatched = 0;
    for (const seg of pathSegments) {
      const segLower = seg.toLowerCase();
      if (tokenMatchTerms.some((terms) => terms.some((t) => t && segLower.includes(t))))
        segmentsMatched += 1;
    }
    const segmentBonus = segmentsMatched * 40;
    const nameExactBonus = tokenMatchTerms.some((terms) => terms.some((t) => t && nl === t)) ? 30 : 0;
    return baseScore + groupBonus + wordBonus + segmentBonus + nameExactBonus;
  };

  return withPath
    .map((n) => ({ ...n, _score: score(n.name, n.path) }))
    .filter((n) => n._score > 0 && tokenMatchTerms.some((terms) => tokenMatches(n.name, n.path, terms)))
    .sort((a, b) => b._score - a._score)
    .slice(0, 50)
    .map(({ _score: _, ...n }) => n);
}

// ─── Print Data ───────────────────────────────────────────────────────────────

type PrintDataRow = {
  id: number;
  nodeId: number;
  title?: string | null;
  exposureTime?: string | null;
  aperture?: string | null;
  filterYellow?: string | null;
  filterMagenta?: string | null;
  filterCyan?: string | null;
  developer?: string | null;
  developmentTime?: string | null;
  temperature?: string | null;
  dilution?: string | null;
  enlargerHeight?: string | null;
  testStrip?: string | null;
  notes?: string | null;
  extraData?: { key: string; value: string }[] | string | null;
  createdAt: Date;
  updatedAt: Date;
};

const _printData: PrintDataRow[] = [];

function parseExtraData(extra: PrintDataRow["extraData"]): { key: string; value: string }[] {
  if (extra == null) return [];
  if (Array.isArray(extra)) return extra;
  try {
    return JSON.parse(extra as string) as { key: string; value: string }[];
  } catch {
    return [];
  }
}

export function getPrintDataById(id: number): (Omit<PrintDataRow, "extraData"> & { extraData: { key: string; value: string }[] }) | null {
  const row = _printData.find((p) => p.id === id) ?? null;
  if (!row) return null;
  return { ...row, extraData: parseExtraData(row.extraData) };
}

export function getPrintDataList(nodeId: number): (Omit<PrintDataRow, "extraData"> & { extraData: { key: string; value: string }[] })[] {
  return _printData
    .filter((p) => p.nodeId === nodeId)
    .map((row) => ({ ...row, extraData: parseExtraData(row.extraData) }));
}

export function getPrintDataListAll(): (Omit<PrintDataRow, "extraData"> & { extraData: { key: string; value: string }[]; nodeName: string })[] {
  return _printData
    .slice()
    .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))
    .map((row) => ({
      ...row,
      extraData: parseExtraData(row.extraData),
      nodeName: _nodes.find((n) => n.id === row.nodeId)?.name ?? "",
    }));
}

export function createPrintData(nodeId: number): number {
  const id = nextId();
  const now = new Date();
  _printData.push({
    id, nodeId, title: null, exposureTime: null, aperture: null,
    filterYellow: null, filterMagenta: null, filterCyan: null,
    developer: null, developmentTime: null, temperature: null,
    dilution: null, enlargerHeight: null, testStrip: null, notes: null,
    extraData: null, createdAt: now, updatedAt: now,
  });
  return id;
}

export function deletePrintData(id: number) {
  const idx = _printData.findIndex((p) => p.id === id);
  if (idx !== -1) _printData.splice(idx, 1);
}

export function upsertPrintData(data: Partial<PrintDataRow> & { nodeId: number }) {
  const existing = data.id != null ? _printData.find((p) => p.id === data.id) : null;
  const extra =
    data.extraData === undefined
      ? undefined
      : Array.isArray(data.extraData)
        ? data.extraData
        : typeof data.extraData === "string"
          ? (() => { try { return JSON.parse(data.extraData) as { key: string; value: string }[]; } catch { return []; } })()
          : undefined;
  const now = new Date();
  if (existing) {
    Object.assign(existing, { ...data, extraData: extra ?? existing.extraData, updatedAt: now });
    return existing.id;
  }
  const id = nextId();
  _printData.push({
    id, nodeId: data.nodeId,
    title: data.title ?? null, exposureTime: data.exposureTime ?? null,
    aperture: data.aperture ?? null, filterYellow: data.filterYellow ?? null,
    filterMagenta: data.filterMagenta ?? null, filterCyan: data.filterCyan ?? null,
    developer: data.developer ?? null, developmentTime: data.developmentTime ?? null,
    temperature: data.temperature ?? null, dilution: data.dilution ?? null,
    enlargerHeight: data.enlargerHeight ?? null, testStrip: data.testStrip ?? null,
    notes: data.notes ?? null, extraData: extra ?? null, createdAt: now, updatedAt: now,
  });
  return id;
}
