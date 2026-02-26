import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Grey Print Data System Tables ───────────────────────────────────────────

/**
 * 카메라 종류 (Camera Types)
 * e.g., 35mm SLR, Medium Format, Large Format, Rangefinder
 */
export const cameraTypes = mysqlTable("camera_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 렌즈군 (Lens Groups)
 * e.g., Nikkor, Canon FD, Leica M
 */
export const lensGroups = mysqlTable("lens_groups", {
  id: int("id").autoincrement().primaryKey(),
  cameraTypeId: int("cameraTypeId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 판형 (Formats)
 * e.g., 35mm, 120, 4x5, 8x10
 */
export const formats = mysqlTable("formats", {
  id: int("id").autoincrement().primaryKey(),
  lensGroupId: int("lensGroupId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 필름 종류 (Film Types)
 * e.g., Kodak Portra 400, Ilford HP5, Fuji Velvia 50
 */
export const filmTypes = mysqlTable("film_types", {
  id: int("id").autoincrement().primaryKey(),
  formatId: int("formatId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  iso: varchar("iso", { length: 32 }),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 인화지 브랜드 (Paper Brands)
 * e.g., Ilford, Kodak, Foma, Adox
 */
export const paperBrands = mysqlTable("paper_brands", {
  id: int("id").autoincrement().primaryKey(),
  filmTypeId: int("filmTypeId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 인화지 종류 (Paper Types)
 * e.g., Glossy, Matte, Pearl, Fiber Base
 */
export const paperTypes = mysqlTable("paper_types", {
  id: int("id").autoincrement().primaryKey(),
  paperBrandId: int("paperBrandId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 인화지 사이즈 (Paper Sizes)
 * e.g., 4x6, 5x7, 8x10, 11x14, 16x20
 */
export const paperSizes = mysqlTable("paper_sizes", {
  id: int("id").autoincrement().primaryKey(),
  paperTypeId: int("paperTypeId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 인화 데이터 (Print Data)
 * 최종 인화에 필요한 모든 파라미터 데이터
 */
export const printData = mysqlTable("print_data", {
  id: int("id").autoincrement().primaryKey(),
  paperSizeId: int("paperSizeId").notNull(),
  title: varchar("title", { length: 255 }),                    // 인화 데이터 제목

  // 노출 설정
  exposureTime: varchar("exposureTime", { length: 64 }),      // 노출 시간 (초)
  aperture: varchar("aperture", { length: 32 }),               // 조리개 (f/8 등)

  // 필터 설정 (컬러 헤드)
  filterYellow: varchar("filterYellow", { length: 16 }),       // 옐로우 필터 값
  filterMagenta: varchar("filterMagenta", { length: 16 }),     // 마젠타 필터 값
  filterCyan: varchar("filterCyan", { length: 16 }),           // 시안 필터 값

  // 현상 설정
  developer: varchar("developer", { length: 255 }),            // 현상액 이름
  developmentTime: varchar("developmentTime", { length: 64 }), // 현상 시간
  temperature: varchar("temperature", { length: 32 }),         // 온도
  dilution: varchar("dilution", { length: 64 }),               // 희석 비율

  // 추가 정보
  enlargerHeight: varchar("enlargerHeight", { length: 64 }),   // 확대기 높이
  testStrip: text("testStrip"),                                 // 테스트 스트립 메모
  notes: text("notes"),                                         // 일반 메모
  extraData: text("extraData"),                                 // 추가 데이터 JSON: [{ key, value }]

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
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
