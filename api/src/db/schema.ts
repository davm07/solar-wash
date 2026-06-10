import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("technician"),
});

export const plants = pgTable("plants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  clientId: uuid("client_id")
    .notNull()
    .references(() => users.id),
  totalMesas: integer("total_mesas").notNull().default(0),
  svgPath: varchar("svg_path", { length: 1000 }),
});

export const mesas = pgTable("mesas", {
  id: uuid("id").defaultRandom().primaryKey(),
  plantId: uuid("plant_id")
    .notNull()
    .references(() => plants.id),
  code: varchar("code", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
});

export const cleaningCycles = pgTable("cleaning_cycles", {
  id: uuid("id").defaultRandom().primaryKey(),
  plantId: uuid("plant_id")
    .notNull()
    .references(() => plants.id),
  startedAt: timestamp("started_at").defaultNow(),
  finishedAt: timestamp("finished_at"),
});

export const washSessions = pgTable("wash_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  plantId: uuid("plant_id")
    .notNull()
    .references(() => plants.id),
  technicianId: uuid("technician_id")
    .notNull()
    .references(() => users.id),
  startedAt: timestamp("started_at").defaultNow(),
  finishedAt: timestamp("finished_at"),
  cycleId: uuid("cycle_id").references(() => cleaningCycles.id),
  notes: varchar("notes", { length: 500 }),
});

export const mesaWashes = pgTable("mesa_washes", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => washSessions.id),
  mesaId: uuid("mesa_id")
    .notNull()
    .references(() => mesas.id),
  startedAt: timestamp("started_at").defaultNow(),
  finishedAt: timestamp("finished_at"),
  durationSeconds: integer("duration_seconds"),
});
