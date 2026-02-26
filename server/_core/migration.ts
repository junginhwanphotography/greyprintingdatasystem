/**
 * Auto-migration: runs once on server startup to migrate the 7-table hierarchy
 * schema to the unified `nodes` table. Safe to call multiple times (idempotent).
 */

import postgres from "postgres";

export async function runMigrationIfNeeded(): Promise<void> {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    // No DB configured — using in-memory store, nothing to migrate.
    return;
  }

  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    // Check if migration has already run
    const nodesExists = await sql`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'nodes'
    `;
    if (nodesExists.length > 0) {
      // Already migrated
      await sql.end();
      return;
    }

    console.log("[migration] Running one-time schema migration to nodes table...");

    // Check which old tables exist
    const oldTablesResult = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('camera_types','lens_groups','formats','film_types','paper_brands','paper_types','paper_sizes')
    `;
    const oldTables = new Set(oldTablesResult.map((r) => r.table_name as string));

    await sql.begin(async (tx) => {
      // 1. Create nodes table with temp tracking columns
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

      // 2. Insert each hierarchy level in order
      if (oldTables.has("camera_types")) {
        await tx`
          INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
          SELECT NULL, name, description, "sortOrder", "createdAt", "updatedAt", id, 'camera'
          FROM camera_types
        `;
      }
      if (oldTables.has("lens_groups")) {
        await tx`
          INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
          SELECT cam.id, lg.name, lg.description, lg."sortOrder", lg."createdAt", lg."updatedAt", lg.id, 'lens'
          FROM lens_groups lg
          JOIN nodes cam ON cam._entity_type = 'camera' AND cam._old_id = lg."cameraTypeId"
        `;
      }
      if (oldTables.has("formats")) {
        await tx`
          INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
          SELECT lens.id, f.name, f.description, f."sortOrder", f."createdAt", f."updatedAt", f.id, 'format'
          FROM formats f
          JOIN nodes lens ON lens._entity_type = 'lens' AND lens._old_id = f."lensGroupId"
        `;
      }
      if (oldTables.has("film_types")) {
        await tx`
          INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
          SELECT fmt.id, ft.name, ft.description, ft."sortOrder", ft."createdAt", ft."updatedAt", ft.id, 'film'
          FROM film_types ft
          JOIN nodes fmt ON fmt._entity_type = 'format' AND fmt._old_id = ft."formatId"
        `;
      }
      if (oldTables.has("paper_brands")) {
        await tx`
          INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
          SELECT film.id, pb.name, pb.description, pb."sortOrder", pb."createdAt", pb."updatedAt", pb.id, 'brand'
          FROM paper_brands pb
          JOIN nodes film ON film._entity_type = 'film' AND film._old_id = pb."filmTypeId"
        `;
      }
      if (oldTables.has("paper_types")) {
        await tx`
          INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
          SELECT brand.id, pt.name, pt.description, pt."sortOrder", pt."createdAt", pt."updatedAt", pt.id, 'type'
          FROM paper_types pt
          JOIN nodes brand ON brand._entity_type = 'brand' AND brand._old_id = pt."paperBrandId"
        `;
      }
      if (oldTables.has("paper_sizes")) {
        await tx`
          INSERT INTO nodes ("parentId", name, description, "sortOrder", "createdAt", "updatedAt", _old_id, _entity_type)
          SELECT ptype.id, ps.name, ps.description, ps."sortOrder", ps."createdAt", ps."updatedAt", ps.id, 'size'
          FROM paper_sizes ps
          JOIN nodes ptype ON ptype._entity_type = 'type' AND ptype._old_id = ps."paperTypeId"
        `;
      }

      // 3. Handle print_data column rename and remapping
      const colCheck = await tx`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'print_data'
      `;
      const cols = new Set(colCheck.map((r) => r.column_name as string));

      if (cols.has("paperSizeId")) {
        await tx`ALTER TABLE print_data RENAME COLUMN "paperSizeId" TO "nodeId"`;
        if (oldTables.has("paper_sizes")) {
          await tx`
            UPDATE print_data pd
            SET "nodeId" = size_node.id
            FROM nodes size_node
            WHERE size_node._entity_type = 'size' AND size_node._old_id = pd."nodeId"
          `;
        }
      }

      // 4. Remove temp tracking columns
      await tx`ALTER TABLE nodes DROP COLUMN IF EXISTS _old_id`;
      await tx`ALTER TABLE nodes DROP COLUMN IF EXISTS _entity_type`;
    });

    console.log("[migration] ✅  Migration complete — nodes table created and data migrated.");
  } catch (err) {
    console.error("[migration] ❌  Migration failed:", err);
    // Don't crash the server — the old code path won't work but at least we can debug
  } finally {
    await sql.end();
  }
}
