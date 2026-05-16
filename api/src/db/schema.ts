import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: varchar("name", { length: 255 }).notNull(),

  email: varchar("email", { length: 255 }).notNull().unique(),

  password: text("password").notNull(),

  role: varchar("role", { length: 50 }).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
