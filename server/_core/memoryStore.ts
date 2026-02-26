/**
 * In-memory store for local preview when DATABASE_URL is not set.
 * Enables full CRUD (add/rename/delete) and list/search without a real DB.
 */

type IdRecord = { id: number; name: string; description?: string | null; sortOrder: number };

const nextId = () => ++_lastId;
let _lastId = 0;

// Camera Types
const _cameras: (IdRecord & { createdAt: Date; updatedAt: Date })[] = [];
export function getCameraTypes() {
  return _cameras.slice().sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}
export function createCameraType(data: { name: string; description?: string | null }) {
  const id = nextId();
  const now = new Date();
  _cameras.push({
    id,
    name: data.name,
    description: data.description ?? null,
    sortOrder: _cameras.length,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}
export function updateCameraType(id: number, data: { name?: string; description?: string | null }) {
  const r = _cameras.find((c) => c.id === id);
  if (r) {
    if (data.name !== undefined) r.name = data.name;
    if (data.description !== undefined) r.description = data.description;
    r.updatedAt = new Date();
  }
}
export function deleteCameraType(id: number) {
  const lensIds = _lenses.filter((l) => l.cameraTypeId === id).map((l) => l.id);
  lensIds.forEach((lid) => deleteLensGroup(lid));
  const idx = _cameras.findIndex((c) => c.id === id);
  if (idx !== -1) _cameras.splice(idx, 1);
}

// Lens Groups
const _lenses: (IdRecord & { cameraTypeId: number; createdAt: Date; updatedAt: Date })[] = [];
export function getLensGroups(cameraTypeId: number) {
  return _lenses
    .filter((l) => l.cameraTypeId === cameraTypeId)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}
export function createLensGroup(data: { name: string; description?: string | null; cameraTypeId: number }) {
  const id = nextId();
  const now = new Date();
  const list = _lenses.filter((l) => l.cameraTypeId === data.cameraTypeId);
  _lenses.push({
    id,
    name: data.name,
    description: data.description ?? null,
    sortOrder: list.length,
    cameraTypeId: data.cameraTypeId,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}
export function updateLensGroup(id: number, data: { name?: string; description?: string | null }) {
  const r = _lenses.find((l) => l.id === id);
  if (r) {
    if (data.name !== undefined) r.name = data.name;
    if (data.description !== undefined) r.description = data.description;
    r.updatedAt = new Date();
  }
}
export function deleteLensGroup(id: number) {
  const idx = _lenses.findIndex((l) => l.id === id);
  if (idx !== -1) _lenses.splice(idx, 1);
  const formatIds = _formats.filter((f) => f.lensGroupId === id).map((f) => f.id);
  formatIds.forEach((fid) => deleteFormat(fid));
}

// Formats
const _formats: (IdRecord & { lensGroupId: number; createdAt: Date; updatedAt: Date })[] = [];
export function getFormats(lensGroupId: number) {
  return _formats
    .filter((f) => f.lensGroupId === lensGroupId)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}
export function createFormat(data: { name: string; description?: string | null; lensGroupId: number }) {
  const id = nextId();
  const now = new Date();
  const list = _formats.filter((f) => f.lensGroupId === data.lensGroupId);
  _formats.push({
    id,
    name: data.name,
    description: data.description ?? null,
    sortOrder: list.length,
    lensGroupId: data.lensGroupId,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}
export function updateFormat(id: number, data: { name?: string; description?: string | null }) {
  const r = _formats.find((f) => f.id === id);
  if (r) {
    if (data.name !== undefined) r.name = data.name;
    if (data.description !== undefined) r.description = data.description;
    r.updatedAt = new Date();
  }
}
export function deleteFormat(id: number) {
  const idx = _formats.findIndex((f) => f.id === id);
  if (idx !== -1) _formats.splice(idx, 1);
  const filmIds = _films.filter((f) => f.formatId === id).map((f) => f.id);
  filmIds.forEach((fid) => deleteFilmType(fid));
}

// Film Types
const _films: (IdRecord & { formatId: number; iso?: string | null; createdAt: Date; updatedAt: Date })[] = [];
export function getFilmTypes(formatId: number) {
  return _films
    .filter((f) => f.formatId === formatId)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}
export function createFilmType(data: { name: string; description?: string | null; formatId: number; iso?: string | null }) {
  const id = nextId();
  const now = new Date();
  const list = _films.filter((f) => f.formatId === data.formatId);
  _films.push({
    id,
    name: data.name,
    description: data.description ?? null,
    sortOrder: list.length,
    formatId: data.formatId,
    iso: data.iso ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}
export function updateFilmType(id: number, data: { name?: string; description?: string | null; iso?: string | null }) {
  const r = _films.find((f) => f.id === id);
  if (r) {
    if (data.name !== undefined) r.name = data.name;
    if (data.description !== undefined) r.description = data.description;
    if (data.iso !== undefined) r.iso = data.iso;
    r.updatedAt = new Date();
  }
}
export function deleteFilmType(id: number) {
  const idx = _films.findIndex((f) => f.id === id);
  if (idx !== -1) _films.splice(idx, 1);
  const brandIds = _paperBrands.filter((b) => b.filmTypeId === id).map((b) => b.id);
  brandIds.forEach((bid) => deletePaperBrand(bid));
}

// Paper Brands
const _paperBrands: (IdRecord & { filmTypeId: number; createdAt: Date; updatedAt: Date })[] = [];
export function getPaperBrands(filmTypeId: number) {
  return _paperBrands
    .filter((b) => b.filmTypeId === filmTypeId)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}
export function createPaperBrand(data: { name: string; description?: string | null; filmTypeId: number }) {
  const id = nextId();
  const now = new Date();
  const list = _paperBrands.filter((b) => b.filmTypeId === data.filmTypeId);
  _paperBrands.push({
    id,
    name: data.name,
    description: data.description ?? null,
    sortOrder: list.length,
    filmTypeId: data.filmTypeId,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}
export function updatePaperBrand(id: number, data: { name?: string; description?: string | null }) {
  const r = _paperBrands.find((b) => b.id === id);
  if (r) {
    if (data.name !== undefined) r.name = data.name;
    if (data.description !== undefined) r.description = data.description;
    r.updatedAt = new Date();
  }
}
export function deletePaperBrand(id: number) {
  const idx = _paperBrands.findIndex((b) => b.id === id);
  if (idx !== -1) _paperBrands.splice(idx, 1);
  const typeIds = _paperTypes.filter((t) => t.paperBrandId === id).map((t) => t.id);
  typeIds.forEach((tid) => deletePaperType(tid));
}

// Paper Types
const _paperTypes: (IdRecord & { paperBrandId: number; createdAt: Date; updatedAt: Date })[] = [];
export function getPaperTypes(paperBrandId: number) {
  return _paperTypes
    .filter((t) => t.paperBrandId === paperBrandId)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}
export function createPaperType(data: { name: string; description?: string | null; paperBrandId: number }) {
  const id = nextId();
  const now = new Date();
  const list = _paperTypes.filter((t) => t.paperBrandId === data.paperBrandId);
  _paperTypes.push({
    id,
    name: data.name,
    description: data.description ?? null,
    sortOrder: list.length,
    paperBrandId: data.paperBrandId,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}
export function updatePaperType(id: number, data: { name?: string; description?: string | null }) {
  const r = _paperTypes.find((t) => t.id === id);
  if (r) {
    if (data.name !== undefined) r.name = data.name;
    if (data.description !== undefined) r.description = data.description;
    r.updatedAt = new Date();
  }
}
export function deletePaperType(id: number) {
  const idx = _paperTypes.findIndex((t) => t.id === id);
  if (idx !== -1) _paperTypes.splice(idx, 1);
  const sizeIds = _paperSizes.filter((s) => s.paperTypeId === id).map((s) => s.id);
  sizeIds.forEach((sid) => deletePaperSize(sid));
}

// Paper Sizes
const _paperSizes: (IdRecord & { paperTypeId: number; createdAt: Date; updatedAt: Date })[] = [];
export function getPaperSizes(paperTypeId: number) {
  return _paperSizes
    .filter((s) => s.paperTypeId === paperTypeId)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}
export function createPaperSize(data: { name: string; description?: string | null; paperTypeId: number }) {
  const id = nextId();
  const now = new Date();
  const list = _paperSizes.filter((s) => s.paperTypeId === data.paperTypeId);
  _paperSizes.push({
    id,
    name: data.name,
    description: data.description ?? null,
    sortOrder: list.length,
    paperTypeId: data.paperTypeId,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}
export function updatePaperSize(id: number, data: { name?: string; description?: string | null }) {
  const r = _paperSizes.find((s) => s.id === id);
  if (r) {
    if (data.name !== undefined) r.name = data.name;
    if (data.description !== undefined) r.description = data.description;
    r.updatedAt = new Date();
  }
}
export function deletePaperSize(id: number) {
  const idx = _paperSizes.findIndex((s) => s.id === id);
  if (idx !== -1) _paperSizes.splice(idx, 1);
  const pdIdx = _printData.findIndex((p) => p.paperSizeId === id);
  if (pdIdx !== -1) _printData.splice(pdIdx, 1);
}

/** Build path "카메라 › 렌즈 › 판형 › 필름 › 브랜드 › 종류 › 사이즈" for a paper size */
export function getPaperSizePath(paperSizeId: number): string {
  const size = _paperSizes.find((s) => s.id === paperSizeId);
  if (!size) return "";
  const type = _paperTypes.find((t) => t.id === size.paperTypeId);
  if (!type) return size.name;
  const brand = _paperBrands.find((b) => b.id === type.paperBrandId);
  if (!brand) return `${type.name} › ${size.name}`;
  const film = _films.find((f) => f.id === brand.filmTypeId);
  if (!film) return `${brand.name} › ${type.name} › ${size.name}`;
  const format = _formats.find((f) => f.id === film.formatId);
  if (!format) return `${film.name} › ${brand.name} › ${type.name} › ${size.name}`;
  const lens = _lenses.find((l) => l.id === format.lensGroupId);
  if (!lens) return `${format.name} › ${film.name} › ${brand.name} › ${type.name} › ${size.name}`;
  const camera = _cameras.find((c) => c.id === lens.cameraTypeId);
  if (!camera) return `${lens.name} › ${format.name} › ${film.name} › ${brand.name} › ${type.name} › ${size.name}`;
  return `${camera.name} › ${lens.name} › ${format.name} › ${film.name} › ${brand.name} › ${type.name} › ${size.name}`;
}

export function listAllPaperSizesWithPath(): { id: number; name: string; path: string }[] {
  return _paperSizes
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((s) => ({ id: s.id, name: s.name, path: getPaperSizePath(s.id) }));
}

// Print Data (extraData stored as array in memory)
type PrintDataRow = {
  id: number;
  paperSizeId: number;
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
export function getPrintDataList(paperSizeId: number): (Omit<PrintDataRow, "extraData"> & { extraData: { key: string; value: string }[] })[] {
  return _printData
    .filter((p) => p.paperSizeId === paperSizeId)
    .map((row) => ({ ...row, extraData: parseExtraData(row.extraData) }));
}
export function getPrintDataListAll(): (Omit<PrintDataRow, "extraData"> & { extraData: { key: string; value: string }[]; sizeName: string })[] {
  return _printData
    .slice()
    .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))
    .map((row) => ({
      ...row,
      extraData: parseExtraData(row.extraData),
      sizeName: _paperSizes.find((s) => s.id === row.paperSizeId)?.name ?? "",
    }));
}
export function createPrintData(paperSizeId: number): number {
  const id = nextId();
  const now = new Date();
  _printData.push({
    id,
    paperSizeId,
    title: null,
    exposureTime: null,
    aperture: null,
    filterYellow: null,
    filterMagenta: null,
    filterCyan: null,
    developer: null,
    developmentTime: null,
    temperature: null,
    dilution: null,
    enlargerHeight: null,
    testStrip: null,
    notes: null,
    extraData: null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}
export function deletePrintData(id: number) {
  const idx = _printData.findIndex((p) => p.id === id);
  if (idx !== -1) _printData.splice(idx, 1);
}
export function upsertPrintData(data: Partial<PrintDataRow> & { paperSizeId: number }) {
  const byId = data.id != null ? _printData.find((p) => p.id === data.id) : null;
  const existing = byId ?? (data.id == null ? _printData.find((p) => p.paperSizeId === data.paperSizeId) : null);
  const extra =
    data.extraData === undefined
      ? undefined
      : Array.isArray(data.extraData)
        ? data.extraData
        : typeof data.extraData === "string"
          ? (() => {
              try {
                return JSON.parse(data.extraData) as { key: string; value: string }[];
              } catch {
                return [];
              }
            })()
          : undefined;
  const now = new Date();
  if (existing) {
    Object.assign(existing, {
      ...data,
      extraData: extra ?? existing.extraData,
      updatedAt: now,
    });
    return existing.id;
  }
  const id = nextId();
  _printData.push({
    id,
    paperSizeId: data.paperSizeId,
    title: data.title ?? null,
    exposureTime: data.exposureTime ?? null,
    aperture: data.aperture ?? null,
    filterYellow: data.filterYellow ?? null,
    filterMagenta: data.filterMagenta ?? null,
    filterCyan: data.filterCyan ?? null,
    developer: data.developer ?? null,
    developmentTime: data.developmentTime ?? null,
    temperature: data.temperature ?? null,
    dilution: data.dilution ?? null,
    enlargerHeight: data.enlargerHeight ?? null,
    testStrip: data.testStrip ?? null,
    notes: data.notes ?? null,
    extraData: extra ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

// Search
export function searchAll(query: string) {
  const q = query.toLowerCase().trim();
  const match = (s: string) => s.toLowerCase().includes(q);
  return {
    cameras: _cameras.filter((c) => match(c.name)).slice(0, 10),
    lenses: _lenses.filter((l) => match(l.name)).slice(0, 10),
    formats: _formats.filter((f) => match(f.name)).slice(0, 10),
    films: _films.filter((f) => match(f.name)).slice(0, 10),
    brands: _paperBrands.filter((b) => match(b.name)).slice(0, 10),
    types: _paperTypes.filter((t) => match(t.name)).slice(0, 10),
    sizes: _paperSizes.filter((s) => match(s.name)).slice(0, 10),
  };
}
