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

// ─── Grey Print Data System — Tree Node Table ────────────────────────────────

export const nodes = pgTable("nodes", {
  id: serial("id").primaryKey(),
  parentId: integer("parentId"),          // null = root level
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const printData = pgTable("print_data", {
  id: serial("id").primaryKey(),
  nodeId: integer("nodeId"),    // was paperSizeId — set NOT NULL after migration

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

export type Node = typeof nodes.$inferSelect;
export type InsertNode = typeof nodes.$inferInsert;
export type PrintData = typeof printData.$inferSelect;
export type InsertPrintData = typeof printData.$inferInsert;
