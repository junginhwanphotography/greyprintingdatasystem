import { pgEnum, pgTable, serial, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Grey Print Data System Tables ───────────────────────────────────────────

export const cameraTypes = pgTable("camera_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const lensGroups = pgTable("lens_groups", {
  id: serial("id").primaryKey(),
  cameraTypeId: integer("cameraTypeId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const formats = pgTable("formats", {
  id: serial("id").primaryKey(),
  lensGroupId: integer("lensGroupId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const filmTypes = pgTable("film_types", {
  id: serial("id").primaryKey(),
  formatId: integer("formatId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  iso: varchar("iso", { length: 32 }),
  description: text("description"),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const paperBrands = pgTable("paper_brands", {
  id: serial("id").primaryKey(),
  filmTypeId: integer("filmTypeId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const paperTypes = pgTable("paper_types", {
  id: serial("id").primaryKey(),
  paperBrandId: integer("paperBrandId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const paperSizes = pgTable("paper_sizes", {
  id: serial("id").primaryKey(),
  paperTypeId: integer("paperTypeId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const printData = pgTable("print_data", {
  id: serial("id").primaryKey(),
  paperSizeId: integer("paperSizeId").notNull(),
  title: varchar("title", { length: 255 }),

  exposureTime: varchar("exposureTime", { length: 64 }),
  aperture: varchar("aperture", { length: 32 }),

  filterYellow: varchar("filterYellow", { length: 16 }),
  filterMagenta: varchar("filterMagenta", { length: 16 }),
  filterCyan: varchar("filterCyan", { length: 16 }),

  developer: varchar("developer", { length: 255 }),
  developmentTime: varchar("developmentTime", { length: 64 }),
  temperature: varchar("temperature", { length: 32 }),
  dilution: varchar("dilution", { length: 64 }),

  enlargerHeight: varchar("enlargerHeight", { length: 64 }),
  testStrip: text("testStrip"),
  notes: text("notes"),
  extraData: text("extraData"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Type exports
export type CameraType = typeof cameraTypes.$inferSelect;
export type InsertCameraType = typeof cameraTypes.$inferInsert;
export type LensGroup = typeof lensGroups.$inferSelect;
export type InsertLensGroup = typeof lensGroups.$inferInsert;
export type Format = typeof formats.$inferSelect;
export type InsertFormat = typeof formats.$inferInsert;
export type FilmType = typeof filmTypes.$inferSelect;
export type InsertFilmType = typeof filmTypes.$inferInsert;
export type PaperBrand = typeof paperBrands.$inferSelect;
export type InsertPaperBrand = typeof paperBrands.$inferInsert;
export type PaperType = typeof paperTypes.$inferSelect;
export type InsertPaperType = typeof paperTypes.$inferInsert;
export type PaperSize = typeof paperSizes.$inferSelect;
export type InsertPaperSize = typeof paperSizes.$inferInsert;
export type PrintData = typeof printData.$inferSelect;
export type InsertPrintData = typeof printData.$inferInsert;
