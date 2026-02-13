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

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
});
