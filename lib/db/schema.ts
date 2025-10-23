import {
  pgTableCreator,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  real,
  numeric,
  uniqueIndex,
  index,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

/* =========================
 * Users
 * ========================= */
const pgTable = pgTableCreator((name) => name)

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  first_name: varchar('first_name', { length: 100 }),
  last_name: varchar('last_name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
  permission: boolean('permission').notNull().default(true),
  resetCode: varchar('reset_code', { length: 8 }),
  resetExpires: timestamp('reset_expires'),
  tempPassword: text('temp_password'),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
})

/* =========================
 * Bookie / Price / License
 * ========================= */
export const bookie = pgTable('bookie', {
  id: serial('id').primaryKey(),
  bookieName: varchar('name', { length: 100 }),
  botVersion: varchar('bot_version', { length: 255 }),
  botFileUrl: varchar('bot_file_url', { length: 255 }),
  fileSizeMB: real('file_size_mb'),
  releaseNote: varchar('release_note', { length: 255 }),
  uploadedAt: timestamp('uploaded_at', { mode: 'date' }).notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
})

export const price = pgTable('price', {
  id: serial('id').primaryKey(),
  bookieId: integer('bookie_id').notNull().references(() => bookie.id, { onDelete: 'cascade' }),
  monthPrice: numeric('month_price', { precision: 10, scale: 2 }),
  threeMonthPrice: numeric('three_month_price', { precision: 10, scale: 2 }),
  sixMonthPrice: numeric('six_month_price', { precision: 10, scale: 2 }),
})

export const licenseKey = pgTable('license_key', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bookieId: integer('bookie_id').notNull().references(() => bookie.id, { onDelete: 'cascade' }),
  keyName: varchar('key_name', { length: 100 }),
  introducerId: integer('introducer_id'),
  purchaseRoute: varchar('purchase_route', { length: 100 }).notNull().default('mySite'),
  usePeriod: varchar('use_period', { length: 100 }).notNull(),
  startTime: timestamp('start_time', { mode: 'date' }).notNull().defaultNow(),
  endTime: timestamp('end_time', { mode: 'date' }).notNull().defaultNow(),
  lastUsedTime: timestamp('last_used_time', { mode: 'date' }).notNull().defaultNow(),
  comment: varchar('comment', { length: 100 }),
  isBlocked: boolean('is_blocked').notNull().default(false),
  isRunning: boolean('is_running').notNull().default(false),
  isAutoPay: boolean('is_auto_pay').notNull().default(true),

  // 기존: .unique() 제거
  stripeSubscriptionId: text('stripe_subscription_id'), // nullable 허용 (수동 키 생성 대비)
  botVersion: varchar('bot_version', { length: 255 }),
}, (t) => ({
  // 부분 복합 유니크: Stripe 구독이 있는 행에 한해 (구독ID, 부키ID) 조합 고유
  uniqStripeSubBookie: uniqueIndex('license_key_sub_bookie_uq')
    .on(t.stripeSubscriptionId, t.bookieId)
    .where(sql`stripe_subscription_id IS NOT NULL`),
}));

/* =========================
 * Direct Rooms (1 user = 1 room)
 * ========================= */
export const rooms = pgTable(
  'rooms',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default('Direct chat'),
    status: text('status').notNull().default('open'), // open|closed
    lastMessageAt: timestamp('last_message_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    publicId: uuid('public_id')
      .notNull()
      .defaultRandom(), // Postgres: gen_random_uuid()
  },
  (t) => ({
    uqUser: uniqueIndex('rooms_user_id_uq').on(t.userId),
    uqPublic: uniqueIndex('rooms_public_id_uq').on(t.publicId),
    idxLastMsg: index('rooms_last_message_at_idx').on(t.lastMessageAt),
  }),
)

export const roomMessages = pgTable('room_messages', {
  id: serial('id').primaryKey(),
  roomId: integer('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  authorId: integer('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  authorRole: text('author_role').notNull(), // 'owner' | 'admin'
  body: text('body'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
})

export const roomAttachments = pgTable('room_attachments', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id').notNull().references(() => roomMessages.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(), // 'image' | 'file'
  filename: text('filename').notNull(),
  url: text('url').notNull(),
  mime: text('mime').notNull(),
  size: text('size').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
})

export const roomAdminReads = pgTable(
  'room_admin_reads',
  {
    id: serial('id').primaryKey(),
    roomId: integer('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
    adminId: integer('admin_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    lastReadAt: timestamp('last_read_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  },
  (t) => ({
    uqRoomAdmin: uniqueIndex('room_admin_reads_room_admin_uq').on(t.roomId, t.adminId),
    idxRoom: index('room_admin_reads_room_idx').on(t.roomId),
    idxAdmin: index('room_admin_reads_admin_idx').on(t.adminId),
  }),
)

export const roomUserReads = pgTable(
  'room_user_reads',
  {
    id: serial('id').primaryKey(),
    roomId: integer('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    lastReadAt: timestamp('last_read_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  },
  (t) => ({
    uq: uniqueIndex('room_user_reads_room_user_uq').on(t.roomId, t.userId),
  }),
)

/* =========================
 * Teams
 * ========================= */
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
})

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
})

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
})

export const invitations = pgTable(
  'invitations',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).notNull(),
    invitedBy: integer('invited_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
    invitedAt: timestamp('invited_at').notNull().defaultNow(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
  },
  (t) => ({
    // 같은 팀에 같은 이메일 중복 초대 방지
    uqTeamEmail: uniqueIndex('invitations_team_email_uq').on(t.teamId, t.email),
  })
)

/* =========================
 * Relations
 * ========================= */
// License
export const licenseRelations = relations(licenseKey, ({ one }) => ({
  user: one(users, {
    fields: [licenseKey.userId],
    references: [users.id],
  }),
  bookie: one(bookie, {
    fields: [licenseKey.bookieId],
    references: [bookie.id],
  }),
}))

// Price
export const priceRelations = relations(price, ({ one }) => ({
  bookie: one(bookie, {
    fields: [price.bookieId],
    references: [bookie.id],
  }),
}))

// Users
export const usersRelations = relations(users, ({ many, one }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations, { relationName: 'invitations_invited_by_users_id' }),
  room: one(rooms, {
    fields: [users.id],
    references: [rooms.userId],
  }),
}))

/* ---- Rooms relations ---- */
export const roomsRelations = relations(rooms, ({ one, many }) => ({
  user: one(users, {
    fields: [rooms.userId],
    references: [users.id],
  }),
  messages: many(roomMessages),
}))

export const roomMessagesRelations = relations(roomMessages, ({ one, many }) => ({
  room: one(rooms, {
    fields: [roomMessages.roomId],
    references: [rooms.id],
  }),
  author: one(users, {
    fields: [roomMessages.authorId],
    references: [users.id],
  }),
  attachments: many(roomAttachments),
}))

export const roomAttachmentsRelations = relations(roomAttachments, ({ one }) => ({
  message: one(roomMessages, {
    fields: [roomAttachments.messageId],
    references: [roomMessages.id],
  }),
}))

// Teams
export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
}))

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}))

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}))

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}))

/* =========================
 * Types
 * ========================= */
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Bookie = typeof bookie.$inferSelect
export type NewBookie = typeof bookie.$inferInsert

export type Price = typeof price.$inferSelect
export type NewPrice = typeof price.$inferInsert

export type LicenseKey = typeof licenseKey.$inferSelect
export type NewLicenseKey = typeof licenseKey.$inferInsert

export type Room = typeof rooms.$inferSelect
export type NewRoom = typeof rooms.$inferInsert

export type RoomMessage = typeof roomMessages.$inferSelect
export type NewRoomMessage = typeof roomMessages.$inferInsert

export type RoomAttachment = typeof roomAttachments.$inferSelect
export type NewRoomAttachment = typeof roomAttachments.$inferInsert

export type Team = typeof teams.$inferSelect
export type NewTeam = typeof teams.$inferInsert
export type TeamMember = typeof teamMembers.$inferSelect
export type NewTeamMember = typeof teamMembers.$inferInsert
export type ActivityLog = typeof activityLogs.$inferSelect
export type NewActivityLog = typeof activityLogs.$inferInsert
export type Invitation = typeof invitations.$inferSelect
export type NewInvitation = typeof invitations.$inferInsert

export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'first_name' | 'email'>
  })[]
}

/* =========================
 * Activity enum
 * ========================= */
export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}
