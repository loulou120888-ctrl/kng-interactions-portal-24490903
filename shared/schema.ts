import { pgTable, uuid, text, boolean, timestamp, integer, numeric, pgEnum, unique, index } from "drizzle-orm/pg-core";

export const appRoleEnum = pgEnum("app_role", ["member", "sld", "ld", "aux", "adm", "manager"]);
export const departmentEnum = pgEnum("department", ["events", "parties", "entertainment"]);
export const scheduleTypeEnum = pgEnum("schedule_type", ["events_parties", "entertainment"]);
export const slotStatusEnum = pgEnum("slot_status", ["booked", "in_progress", "completed", "cancelled"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  display_name: text("display_name").notNull(),
  username: text("username"),
  avatar_url: text("avatar_url"),
  department: departmentEnum("department"),
  status: text("status").notNull().default("offline"),
  deactivated: boolean("deactivated").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userCredentials = pgTable("user_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  profile_id: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  password_hash: text("password_hash").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  role: appRoleEnum("role").notNull().default("member"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.user_id, t.role)]);

export const signupCodes = pgTable("signup_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  role: appRoleEnum("role").notNull().default("member"),
  department: departmentEnum("department"),
  created_by: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
  used_by: uuid("used_by").references(() => profiles.id, { onDelete: "set null" }),
  used_at: timestamp("used_at", { withTimezone: true }),
  revoked: boolean("revoked").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scheduleSlots = pgTable("schedule_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  schedule_type: scheduleTypeEnum("schedule_type").notNull(),
  slot_start: timestamp("slot_start", { withTimezone: true }).notNull(),
  department: departmentEnum("department").notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  booked_by: uuid("booked_by").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  claimed_by: uuid("claimed_by").references(() => profiles.id, { onDelete: "set null" }),
  status: slotStatusEnum("status").notNull().default("booked"),
  interaction_id: uuid("interaction_id"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const interactions = pgTable("interactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  department: departmentEnum("department").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  author_id: uuid("author_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  slot_id: uuid("slot_id").references(() => scheduleSlots.id, { onDelete: "set null" }),
  poster_message: text("poster_message"),
  poster_image_url: text("poster_image_url"),
  f3_message: text("f3_message"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const interactionAttendees = pgTable("interaction_attendees", {
  interaction_id: uuid("interaction_id").notNull().references(() => interactions.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
}, (t) => [{ pk: { columns: [t.interaction_id, t.user_id] } }]);

export const prizes = pgTable("prizes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  default_quantity: integer("default_quantity").notNull().default(1),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const interactionWinners = pgTable("interaction_winners", {
  id: uuid("id").primaryKey().defaultRandom(),
  interaction_id: uuid("interaction_id").notNull().references(() => interactions.id, { onDelete: "cascade" }),
  winner_id: text("winner_id").notNull(),
  prize_code: text("prize_code").notNull(),
  prize_name: text("prize_name"),
  quantity: integer("quantity").notNull().default(1),
  comped: boolean("comped").notNull().default(false),
  comped_by: uuid("comped_by").references(() => profiles.id, { onDelete: "set null" }),
  comped_at: timestamp("comped_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pointsLog = pgTable("points_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  interaction_id: uuid("interaction_id").references(() => interactions.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull().default(1),
  awarded_at: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  author_id: uuid("author_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const announcementReads = pgTable("announcement_reads", {
  announcement_id: uuid("announcement_id").notNull().references(() => announcements.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  read_at: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [{ pk: { columns: [t.announcement_id, t.user_id] } }]);

export const hallOfFame = pgTable("hall_of_fame", {
  id: uuid("id").primaryKey().defaultRandom(),
  author_id: uuid("author_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  winner_id: text("winner_id"),
  caption: text("caption"),
  image_url: text("image_url").notNull(),
  frame_id: text("frame_id").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const hallOfFameFrames = pgTable("hall_of_fame_frames", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  image_url: text("image_url").notNull(),
  created_by: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
  region_x: numeric("region_x"),
  region_y: numeric("region_y"),
  region_w: numeric("region_w"),
  region_h: numeric("region_h"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const uploadedFiles = pgTable("uploaded_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  bucket: text("bucket").notNull(),
  path: text("path").notNull(),
  public_url: text("public_url").notNull(),
  uploaded_by: uuid("uploaded_by").references(() => profiles.id, { onDelete: "set null" }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
