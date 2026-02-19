CREATE TABLE "cellar_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"friend_id" integer NOT NULL,
	"granted_at" text NOT NULL,
	"revoked_at" text
);
--> statement-breakpoint
CREATE TABLE "consumed" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"wine_id" integer NOT NULL,
	"rating" integer,
	"notes" text,
	"consumed_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_id" integer NOT NULL,
	"addressee_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" text NOT NULL,
	"responded_at" text
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"wine_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"purchase_date" text,
	"purchase_price" real,
	"notes" text,
	"added_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invite_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"code" text NOT NULL,
	"expires_at" text NOT NULL,
	"used_by" integer,
	"used_at" text,
	"created_at" text NOT NULL,
	CONSTRAINT "invite_links_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" text NOT NULL,
	"used_at" text,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wine_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_user_id" integer NOT NULL,
	"to_user_id" integer NOT NULL,
	"wine_id" integer NOT NULL,
	"message" text,
	"read_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wines" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand" text NOT NULL,
	"varietal" text,
	"vintage" integer,
	"region" text,
	"image_url" text,
	"drink_window_start" integer,
	"drink_window_end" integer,
	"estimated_rating" integer,
	"rating_notes" text,
	"designation" text,
	"food_pairings" text,
	"market_price" text,
	"created_by" integer,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"wine_id" integer NOT NULL,
	"priority" integer DEFAULT 3,
	"notes" text,
	"added_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cellar_shares" ADD CONSTRAINT "cellar_shares_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cellar_shares" ADD CONSTRAINT "cellar_shares_friend_id_users_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumed" ADD CONSTRAINT "consumed_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumed" ADD CONSTRAINT "consumed_wine_id_wines_id_fk" FOREIGN KEY ("wine_id") REFERENCES "public"."wines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_users_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_wine_id_wines_id_fk" FOREIGN KEY ("wine_id") REFERENCES "public"."wines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wine_recommendations" ADD CONSTRAINT "wine_recommendations_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wine_recommendations" ADD CONSTRAINT "wine_recommendations_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wine_recommendations" ADD CONSTRAINT "wine_recommendations_wine_id_wines_id_fk" FOREIGN KEY ("wine_id") REFERENCES "public"."wines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wines" ADD CONSTRAINT "wines_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_wine_id_wines_id_fk" FOREIGN KEY ("wine_id") REFERENCES "public"."wines"("id") ON DELETE no action ON UPDATE no action;