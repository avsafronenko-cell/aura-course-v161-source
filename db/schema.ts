import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const certificates = sqliteTable(
  "certificates",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    fullName: text("full_name").notNull(),
    gender: text("gender").notNull().default("male"),
    language: text("language").notNull().default("uk"),
    issuedAt: text("issued_at").notNull(),
  },
  (table) => ({
    userIdUnique: uniqueIndex("certificates_user_id_unique").on(table.userId),
  }),
);
