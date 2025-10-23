CREATE TABLE "bookie" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100),
	"bot_version" varchar(255),
	"bot_file_url" varchar(255),
	"file_size_mb" real,
	"release_note" varchar(255),
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "license_key" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"bookie_id" integer NOT NULL,
	"key_name" varchar(100),
	"introducer_id" integer,
	"purchase_route" varchar(100) DEFAULT 'mySite' NOT NULL,
	"use_period" varchar(100) NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp DEFAULT now() NOT NULL,
	"last_used_time" timestamp DEFAULT now() NOT NULL,
	"comment" varchar(100),
	"is_blocked" boolean DEFAULT false NOT NULL,
	"is_running" boolean DEFAULT false NOT NULL,
	"is_auto_pay" boolean DEFAULT true NOT NULL,
	"stripe_subscription_id" text,
	CONSTRAINT "license_key_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "price" (
	"id" serial PRIMARY KEY NOT NULL,
	"bookie_id" integer NOT NULL,
	"month_price" numeric(10, 2),
	"three_month_price" numeric(10, 2),
	"six_month_price" numeric(10, 2)
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_name" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "permission" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reset_code" varchar(8);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reset_expires" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "temp_password" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_product_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plan_name" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_status" varchar(20);--> statement-breakpoint
ALTER TABLE "license_key" ADD CONSTRAINT "license_key_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_key" ADD CONSTRAINT "license_key_bookie_id_bookie_id_fk" FOREIGN KEY ("bookie_id") REFERENCES "public"."bookie"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price" ADD CONSTRAINT "price_bookie_id_bookie_id_fk" FOREIGN KEY ("bookie_id") REFERENCES "public"."bookie"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_stripe_customer_id_unique" UNIQUE("stripe_customer_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id");