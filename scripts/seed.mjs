import postgres from "postgres";
import * as fs from "fs";
import * as path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL required"); process.exit(1); }

const sql = postgres(DATABASE_URL, { max: 1 });
const BASE_DIR = "C:/Users/Administrator/Desktop/그레이 인화 데이터 시스템";

// ── Parse txt content ────────────────────────────────────────────────────────
function parseTxt(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const result = {};
  for (const line of content.split(/\r?\n/).map(l => l.trim()).filter(Boolean)) {
    if (line.startsWith("H")) result.enlargerHeight = line.slice(1).trim();
    else if (line.startsWith("T")) result.exposureTime = line.slice(1).trim();
    else if (line.startsWith("F")) result.aperture = line.slice(1).trim();
    else if (line.startsWith("C")) result.filterCyan = line.slice(1).trim();
    else if (line.startsWith("M")) result.filterMagenta = line.slice(1).trim();
    else if (line.startsWith("Y")) result.filterYellow = line.slice(1).trim();
  }
  return result;
}

// ── Camera/LensGroup name parsing ────────────────────────────────────────────
function titleCase(str) {
  return str.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function parseCameraLens(folderName) {
  if (folderName === "렌즈 불명") return { camera: "기타", lensGroup: "렌즈 불명" };
  const parts = folderName.split(" ");
  const camera = titleCase(parts[0]);
  const lensGroup = titleCase(parts.slice(1).join(" "));
  return { camera, lensGroup };
}

// If immediate children contain non-film folder names, it has format subfolders
function detectFormatSubfolders(lensDir) {
  const filmKeywords = ["kodak", "fuji", "ilford", "foma", "adox", "agfa"];
  const children = fs.readdirSync(lensDir).filter(c =>
    fs.statSync(path.join(lensDir, c)).isDirectory()
  );
  return children.some(c => !filmKeywords.some(k => c.toLowerCase().includes(k)));
}

// ── In-memory cache for find-or-create ───────────────────────────────────────
const cache = {
  cameras:    new Map(), // name → id
  lenses:     new Map(), // `${camId}:${name}` → id
  formats:    new Map(), // `${lgId}:${name}` → id
  films:      new Map(), // `${fmtId}:${name}` → id
  brands:     new Map(), // `${filmId}:${name}` → id
  types:      new Map(), // `${brandId}:${name}` → id
  sizes:      new Map(), // `${typeId}:${name}` → id
};

async function getOrCreate(table, idCol, data, cacheMap, cacheKey) {
  if (cacheMap.has(cacheKey)) return cacheMap.get(cacheKey);
  const rows = await sql`INSERT INTO ${sql(table)} ${sql(data)} RETURNING ${sql(idCol)}`;
  const id = rows[0][idCol];
  cacheMap.set(cacheKey, id);
  return id;
}

// ── Main seed ────────────────────────────────────────────────────────────────
async function seed() {
  console.log("🗑  Clearing existing data...");
  await sql`DELETE FROM print_data`;
  await sql`DELETE FROM paper_sizes`;
  await sql`DELETE FROM paper_types`;
  await sql`DELETE FROM paper_brands`;
  await sql`DELETE FROM film_types`;
  await sql`DELETE FROM formats`;
  await sql`DELETE FROM lens_groups`;
  await sql`DELETE FROM camera_types`;
  console.log("✓ Cleared\n");

  const now = new Date();
  let totalFiles = 0;

  const topDirs = fs.readdirSync(BASE_DIR).filter(d =>
    fs.statSync(path.join(BASE_DIR, d)).isDirectory()
  );

  for (const topDir of topDirs) {
    const { camera: cameraName, lensGroup: lensGroupName } = parseCameraLens(topDir);
    const lensDir = path.join(BASE_DIR, topDir);

    // Camera
    const camId = await getOrCreate(
      "camera_types", "id",
      { name: cameraName, "sortOrder": 0, "createdAt": now, "updatedAt": now },
      cache.cameras, cameraName
    );

    // LensGroup
    const lgId = await getOrCreate(
      "lens_groups", "id",
      { "cameraTypeId": camId, name: lensGroupName, "sortOrder": 0, "createdAt": now, "updatedAt": now },
      cache.lenses, `${camId}:${lensGroupName}`
    );

    const hasFormats = detectFormatSubfolders(lensDir);

    if (hasFormats) {
      // e.g. pentax 67 lenses: subfolders are format names (645, 67, 69)
      const formatDirs = fs.readdirSync(lensDir).filter(d =>
        fs.statSync(path.join(lensDir, d)).isDirectory()
      );
      for (const fmtDir of formatDirs) {
        const fmtId = await getOrCreate(
          "formats", "id",
          { "lensGroupId": lgId, name: fmtDir, "sortOrder": 0, "createdAt": now, "updatedAt": now },
          cache.formats, `${lgId}:${fmtDir}`
        );
        await processFilms(path.join(lensDir, fmtDir), fmtId, now);
        totalFiles += countFiles(path.join(lensDir, fmtDir));
      }
    } else {
      // No format subfolder: infer from film name
      const filmDirs = fs.readdirSync(lensDir).filter(d =>
        fs.statSync(path.join(lensDir, d)).isDirectory()
      );
      // Group films by inferred format
      const formatMap = {};
      for (const filmDir of filmDirs) {
        const fmt = filmDir.includes("120mm") ? "120mm" :
                    filmDir.includes("35mm")  ? "35mm"  : "기본";
        if (!formatMap[fmt]) formatMap[fmt] = [];
        formatMap[fmt].push(filmDir);
      }
      for (const [fmtName, films] of Object.entries(formatMap)) {
        const fmtId = await getOrCreate(
          "formats", "id",
          { "lensGroupId": lgId, name: fmtName, "sortOrder": 0, "createdAt": now, "updatedAt": now },
          cache.formats, `${lgId}:${fmtName}`
        );
        for (const filmDir of films) {
          await processFilm(path.join(lensDir, filmDir), filmDir, fmtId, now);
          totalFiles += countFiles(path.join(lensDir, filmDir));
        }
      }
    }

    console.log(`✓ ${topDir} → ${cameraName} / ${lensGroupName}`);
  }

  console.log(`\n🎉 Done! Processed ~${totalFiles} txt files.`);
  await sql.end();
}

async function processFilms(formatPath, fmtId, now) {
  const filmDirs = fs.readdirSync(formatPath).filter(d =>
    fs.statSync(path.join(formatPath, d)).isDirectory()
  );
  for (const filmDir of filmDirs) {
    await processFilm(path.join(formatPath, filmDir), filmDir, fmtId, now);
  }
}

async function processFilm(filmPath, filmDir, fmtId, now) {
  const filmName = titleCase(filmDir);
  const filmId = await getOrCreate(
    "film_types", "id",
    { "formatId": fmtId, name: filmName, "sortOrder": 0, "createdAt": now, "updatedAt": now },
    cache.films, `${fmtId}:${filmName}`
  );

  const brandDirs = fs.readdirSync(filmPath).filter(d =>
    fs.statSync(path.join(filmPath, d)).isDirectory()
  );
  for (const brandDir of brandDirs) {
    const brandId = await getOrCreate(
      "paper_brands", "id",
      { "filmTypeId": filmId, name: brandDir, "sortOrder": 0, "createdAt": now, "updatedAt": now },
      cache.brands, `${filmId}:${brandDir}`
    );

    const typeDirs = fs.readdirSync(path.join(filmPath, brandDir)).filter(d =>
      fs.statSync(path.join(filmPath, brandDir, d)).isDirectory()
    );
    for (const typeDir of typeDirs) {
      const typeId = await getOrCreate(
        "paper_types", "id",
        { "paperBrandId": brandId, name: typeDir, "sortOrder": 0, "createdAt": now, "updatedAt": now },
        cache.types, `${brandId}:${typeDir}`
      );

      const sizeFiles = fs.readdirSync(path.join(filmPath, brandDir, typeDir))
        .filter(f => f.endsWith(".txt"));
      for (const sizeFile of sizeFiles) {
        const sizeName = path.basename(sizeFile, ".txt");
        const sizeId = await getOrCreate(
          "paper_sizes", "id",
          { "paperTypeId": typeId, name: sizeName, "sortOrder": 0, "createdAt": now, "updatedAt": now },
          cache.sizes, `${typeId}:${sizeName}`
        );

        const txtPath = path.join(filmPath, brandDir, typeDir, sizeFile);
        const pd = parseTxt(txtPath);
        if (Object.keys(pd).length > 0) {
          await sql`INSERT INTO print_data
            ("paperSizeId", "enlargerHeight", "exposureTime", aperture,
             "filterCyan", "filterMagenta", "filterYellow", "createdAt", "updatedAt")
            VALUES (
              ${sizeId},
              ${pd.enlargerHeight ?? null}, ${pd.exposureTime ?? null}, ${pd.aperture ?? null},
              ${pd.filterCyan ?? null}, ${pd.filterMagenta ?? null}, ${pd.filterYellow ?? null},
              ${now}, ${now}
            )`;
        }
      }
    }
  }
}

function countFiles(dirPath) {
  let count = 0;
  for (const entry of fs.readdirSync(dirPath)) {
    const full = path.join(dirPath, entry);
    if (fs.statSync(full).isDirectory()) count += countFiles(full);
    else if (entry.endsWith(".txt")) count++;
  }
  return count;
}

seed().catch(err => { console.error(err); process.exit(1); });
