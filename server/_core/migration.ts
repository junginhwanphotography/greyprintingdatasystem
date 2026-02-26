/**
 * Auto-migration: runs on every server startup. Each step is idempotent.
 *
 * Step 1. Create `nodes` table (IF NOT EXISTS).
 * Step 2. Populate `nodes` from old hierarchy tables (only if nodes is empty).
 * Step 3. Add `nodeId` column to `print_data` (IF NOT EXISTS).
 * Step 4. Map `print_data.nodeId` from old paperSizeId using nodes data.
 * Step 5. Clean up temp tracking columns.
 *
 * Steps are independent — a crash/restart just resumes from where it left off.
 */

import postgres from "postgres";

export async function runMigrationIfNeeded(): Promise<void> {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) return;

  const sql = postgres(DATABASE_URL, { max: 1, connect_timeout: 30 });

  try {
    // ── Step 1: Create nodes table (with optional temp tracking columns) ───
    await sql`
      CREATE TABLE IF NOT EXISTS nodes (
        id          SERIAL PRIMARY KEY,
        "parentId"  INTEGER,
        name        VARCHAR(255) NOT NULL,
        description TEXT,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    // ── Step 2: Populate nodes from old tables (if nodes is empty) ─────────
    const [{ nodeCount }] = await sql`SELECT COUNT(*)::int AS "nodeCount" FROM nodes`;
    if (nodeCount === 0) {
      const oldTablesResult = await sql`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('camera_types','lens_groups','formats','film_types','paper_brands','paper_types','paper_sizes')
      `;
      const oldTables = new Set(oldTablesResult.map((r) => r.table_name as string));

      if (oldTables.size > 0) {
        console.log("[migration] Populating nodes from old hierarchy tables...");

        // Add temp tracking columns for the mapping phase (kept until Step 5)
        await sql`ALTER TABLE nodes ADD COLUMN IF NOT EXISTS _old_id INTEGER`;
        await sql`ALTER TABLE nodes ADD COLUMN IF NOT EXISTS _entity_type TEXT`;

        if (oldTables.has("camera_types")) {
          await sql`
            INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
            SELECT NULL, name, description, "sortOrder", "createdAt", "updatedAt", id, 'camera' FROM camera_types
          `;
          console.log("[migration]  • camera_types done");
        }
        if (oldTables.has("lens_groups")) {
          await sql`
            INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
            SELECT cam.id, lg.name, lg.description, lg."sortOrder", lg."createdAt", lg."updatedAt", lg.id, 'lens'
            FROM lens_groups lg JOIN nodes cam ON cam._entity_type='camera' AND cam._old_id=lg."cameraTypeId"
          `;
          console.log("[migration]  • lens_groups done");
        }
        if (oldTables.has("formats")) {
          await sql`
            INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
            SELECT lens.id, f.name, f.description, f."sortOrder", f."createdAt", f."updatedAt", f.id, 'format'
            FROM formats f JOIN nodes lens ON lens._entity_type='lens' AND lens._old_id=f."lensGroupId"
          `;
          console.log("[migration]  • formats done");
        }
        if (oldTables.has("film_types")) {
          await sql`
            INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
            SELECT fmt.id, ft.name, ft.description, ft."sortOrder", ft."createdAt", ft."updatedAt", ft.id, 'film'
            FROM film_types ft JOIN nodes fmt ON fmt._entity_type='format' AND fmt._old_id=ft."formatId"
          `;
          console.log("[migration]  • film_types done");
        }
        if (oldTables.has("paper_brands")) {
          await sql`
            INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
            SELECT film.id, pb.name, pb.description, pb."sortOrder", pb."createdAt", pb."updatedAt", pb.id, 'brand'
            FROM paper_brands pb JOIN nodes film ON film._entity_type='film' AND film._old_id=pb."filmTypeId"
          `;
          console.log("[migration]  • paper_brands done");
        }
        if (oldTables.has("paper_types")) {
          await sql`
            INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
            SELECT brand.id, pt.name, pt.description, pt."sortOrder", pt."createdAt", pt."updatedAt", pt.id, 'type'
            FROM paper_types pt JOIN nodes brand ON brand._entity_type='brand' AND brand._old_id=pt."paperBrandId"
          `;
          console.log("[migration]  • paper_types done");
        }
        if (oldTables.has("paper_sizes")) {
          await sql`
            INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
            SELECT ptype.id, ps.name, ps.description, ps."sortOrder", ps."createdAt", ps."updatedAt", ps.id, 'size'
            FROM paper_sizes ps JOIN nodes ptype ON ptype._entity_type='type' AND ptype._old_id=ps."paperTypeId"
          `;
          console.log("[migration]  • paper_sizes done");
        }

        const [{ finalCount }] = await sql`SELECT COUNT(*)::int AS "finalCount" FROM nodes`;
        console.log(`[migration] nodes populated: ${finalCount} rows`);
      }
    }

    // ── Step 3: Add nodeId column to print_data, make paperSizeId nullable ──
    await sql`ALTER TABLE print_data ADD COLUMN IF NOT EXISTS "nodeId" INTEGER`;
    // paperSizeId must be nullable so new inserts (which only provide nodeId) don't fail
    try {
      await sql`ALTER TABLE print_data ALTER COLUMN "paperSizeId" DROP NOT NULL`;
    } catch { /* already nullable or column doesn't exist */ }

    // ── Step 4: Map print_data.nodeId from old paperSizeId ─────────────────
    // Check if temp tracking cols still exist in nodes (needed for mapping)
    const tempColCheck = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'nodes'
        AND column_name IN ('_old_id', '_entity_type')
    `;
    const hasTempCols = tempColCheck.length === 2;

    // Check if print_data still has paperSizeId column
    const pdColCheck = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'print_data'
        AND column_name = 'paperSizeId'
    `;
    const hasPaperSizeIdCol = pdColCheck.length > 0;

    if (hasTempCols && hasPaperSizeIdCol) {
      const [{ unmapped }] = await sql`
        SELECT COUNT(*)::int AS unmapped FROM print_data WHERE "nodeId" IS NULL
      `;
      if (unmapped > 0) {
        await sql`
          UPDATE print_data pd
          SET "nodeId" = size_node.id
          FROM nodes size_node
          WHERE size_node._entity_type = 'size'
            AND size_node._old_id = pd."paperSizeId"
            AND pd."nodeId" IS NULL
        `;
        console.log(`[migration] Mapped ${unmapped} print_data rows to nodeId`);
      }
    }

    // ── Step 5: Clean up temp tracking columns ─────────────────────────────
    if (hasTempCols) {
      await sql`ALTER TABLE nodes DROP COLUMN IF EXISTS _old_id`;
      await sql`ALTER TABLE nodes DROP COLUMN IF EXISTS _entity_type`;
      console.log("[migration] Removed temp tracking columns");
    }

    // Set NOT NULL on nodeId if all rows are mapped
    const [{ nullCount }] = await sql`
      SELECT COUNT(*)::int AS "nullCount" FROM print_data WHERE "nodeId" IS NULL
    `;
    if (nullCount === 0) {
      try {
        await sql`ALTER TABLE print_data ALTER COLUMN "nodeId" SET NOT NULL`;
      } catch { /* already NOT NULL */ }
    }

    console.log("[migration] Migration check complete.");
  } catch (err) {
    console.error("[migration] Error:", err);
    // Don't crash the server — it will try again on next startup
  } finally {
    await sql.end();
  }
}
