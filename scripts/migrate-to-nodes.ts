/**
 * One-time migration: 7 fixed hierarchy tables → flexible `nodes` tree table.
 *
 * Run ONCE against the production Neon DB:
 *   $env:DATABASE_URL="<your-neon-connection-string>"
 *   npx tsx scripts/migrate-to-nodes.ts
 *
 * The script is idempotent — it exits early if the `nodes` table already exists.
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set. Export it and retry.");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });

async function main() {
  console.log("🔍  Checking if migration is already done...");

  // Check if nodes table already exists
  const exists = await sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'nodes' AND table_schema = 'public'
  `;
  if (exists.length > 0) {
    console.log("✅  nodes table already exists — skipping migration.");
    await sql.end();
    return;
  }

  // Check if the old tables exist
  const oldTablesCheck = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('camera_types','lens_groups','formats','film_types','paper_brands','paper_types','paper_sizes')
  `;
  const existingOldTables = oldTablesCheck.map((r) => r.table_name as string);
  console.log(`📋  Found old tables: ${existingOldTables.join(", ") || "(none)"}`);

  console.log("🚀  Starting migration...");

  await sql.begin(async (tx) => {
    // ── 1. Create nodes table with temp tracking columns ──────────────────
    await tx`
      CREATE TABLE nodes (
        id          SERIAL PRIMARY KEY,
        "parentId"  INTEGER,
        name        VARCHAR(255) NOT NULL,
        description TEXT,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        _old_id     INTEGER,
        _entity_type TEXT
      )
    `;
    console.log("  ✔  Created nodes table");

    // ── 2. Migrate hierarchy levels (only if old tables exist) ────────────
    if (existingOldTables.includes("camera_types")) {
      await tx`
        INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
        SELECT NULL, name, description, "sortOrder", "createdAt", "updatedAt", id, 'camera'
        FROM camera_types
      `;
      console.log("  ✔  Migrated camera_types");
    }

    if (existingOldTables.includes("lens_groups")) {
      await tx`
        INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
        SELECT cam_node.id, lg.name, lg.description, lg."sortOrder", lg."createdAt", lg."updatedAt", lg.id, 'lens'
        FROM lens_groups lg
        JOIN nodes cam_node ON cam_node._entity_type = 'camera' AND cam_node._old_id = lg."cameraTypeId"
      `;
      console.log("  ✔  Migrated lens_groups");
    }

    if (existingOldTables.includes("formats")) {
      await tx`
        INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
        SELECT lens_node.id, f.name, f.description, f."sortOrder", f."createdAt", f."updatedAt", f.id, 'format'
        FROM formats f
        JOIN nodes lens_node ON lens_node._entity_type = 'lens' AND lens_node._old_id = f."lensGroupId"
      `;
      console.log("  ✔  Migrated formats");
    }

    if (existingOldTables.includes("film_types")) {
      await tx`
        INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
        SELECT fmt_node.id, ft.name, ft.description, ft."sortOrder", ft."createdAt", ft."updatedAt", ft.id, 'film'
        FROM film_types ft
        JOIN nodes fmt_node ON fmt_node._entity_type = 'format' AND fmt_node._old_id = ft."formatId"
      `;
      console.log("  ✔  Migrated film_types");
    }

    if (existingOldTables.includes("paper_brands")) {
      await tx`
        INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
        SELECT film_node.id, pb.name, pb.description, pb."sortOrder", pb."createdAt", pb."updatedAt", pb.id, 'brand'
        FROM paper_brands pb
        JOIN nodes film_node ON film_node._entity_type = 'film' AND film_node._old_id = pb."filmTypeId"
      `;
      console.log("  ✔  Migrated paper_brands");
    }

    if (existingOldTables.includes("paper_types")) {
      await tx`
        INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
        SELECT brand_node.id, pt.name, pt.description, pt."sortOrder", pt."createdAt", pt."updatedAt", pt.id, 'type'
        FROM paper_types pt
        JOIN nodes brand_node ON brand_node._entity_type = 'brand' AND brand_node._old_id = pt."paperBrandId"
      `;
      console.log("  ✔  Migrated paper_types");
    }

    if (existingOldTables.includes("paper_sizes")) {
      await tx`
        INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
        SELECT type_node.id, ps.name, ps.description, ps."sortOrder", ps."createdAt", ps."updatedAt", ps.id, 'size'
        FROM paper_sizes ps
        JOIN nodes type_node ON type_node._entity_type = 'type' AND type_node._old_id = ps."paperTypeId"
      `;
      console.log("  ✔  Migrated paper_sizes");
    }

    // ── 3. Update print_data: rename paperSizeId → nodeId, remap values ──
    const printDataCols = await tx`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'print_data' AND table_schema = 'public'
    `;
    const colNames = printDataCols.map((r) => r.column_name as string);

    if (colNames.includes("paperSizeId")) {
      // Rename column
      await tx`ALTER TABLE print_data RENAME COLUMN "paperSizeId" TO "nodeId"`;
      console.log('  ✔  Renamed print_data.paperSizeId → nodeId');

      // Remap old paper_size IDs to new node IDs (only if old paper_sizes exist)
      if (existingOldTables.includes("paper_sizes")) {
        await tx`
          UPDATE print_data pd
          SET "nodeId" = size_node.id
          FROM nodes size_node
          WHERE size_node._entity_type = 'size'
            AND size_node._old_id = pd."nodeId"
        `;
        console.log("  ✔  Remapped print_data.nodeId values");
      }
    } else if (colNames.includes("nodeId")) {
      console.log("  ℹ  print_data.nodeId already exists, skipping rename");
    }

    // ── 4. Clean up temp columns ──────────────────────────────────────────
    await tx`ALTER TABLE nodes DROP COLUMN IF EXISTS _old_id`;
    await tx`ALTER TABLE nodes DROP COLUMN IF EXISTS _entity_type`;
    console.log("  ✔  Removed temp tracking columns");
  });

  console.log("");
  console.log("🎉  Migration complete!");
  console.log("   The old tables (camera_types, lens_groups, etc.) are still present.");
  console.log("   You can drop them manually once you confirm everything works.");

  await sql.end();
}

main().catch((err) => {
  console.error("❌  Migration failed:", err);
  process.exit(1);
});
