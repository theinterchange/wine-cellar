import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const wines = sqliteTable("wines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  brand: text("brand").notNull(),
  varietal: text("varietal"),
  vintage: integer("vintage"),
  region: text("region"),
  imageUrl: text("image_url"),
  drinkWindowStart: integer("drink_window_start"),
  drinkWindowEnd: integer("drink_window_end"),
  estimatedRating: integer("estimated_rating"),
  ratingNotes: text("rating_notes"),
  designation: text("designation"),
  foodPairings: text("food_pairings"),
  marketPrice: text("market_price"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const inventory = sqliteTable("inventory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  wineId: integer("wine_id").notNull().references(() => wines.id),
  quantity: integer("quantity").notNull().default(1),
  purchaseDate: text("purchase_date"),
  purchasePrice: real("purchase_price"),
  notes: text("notes"),
  addedAt: text("added_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const wishlist = sqliteTable("wishlist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  wineId: integer("wine_id").notNull().references(() => wines.id),
  priority: integer("priority").default(3),
  notes: text("notes"),
  addedAt: text("added_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const consumed = sqliteTable("consumed", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  wineId: integer("wine_id").notNull().references(() => wines.id),
  rating: integer("rating"),
  notes: text("notes"),
  consumedAt: text("consumed_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const friendships = sqliteTable("friendships", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requesterId: integer("requester_id").notNull().references(() => users.id),
  addresseeId: integer("addressee_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // "pending" | "accepted" | "declined"
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  respondedAt: text("responded_at"),
});

export const inviteLinks = sqliteTable("invite_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  code: text("code").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  usedBy: integer("used_by").references(() => users.id),
  usedAt: text("used_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const cellarShares = sqliteTable("cellar_shares", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  friendId: integer("friend_id").notNull().references(() => users.id),
  grantedAt: text("granted_at").notNull().$defaultFn(() => new Date().toISOString()),
  revokedAt: text("revoked_at"),
});

export const wineRecommendations = sqliteTable("wine_recommendations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromUserId: integer("from_user_id").notNull().references(() => users.id),
  toUserId: integer("to_user_id").notNull().references(() => users.id),
  wineId: integer("wine_id").notNull().references(() => wines.id),
  message: text("message"),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
});
