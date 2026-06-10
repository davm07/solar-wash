CREATE TABLE "cleaning_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plant_id" uuid NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "mesa_washes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"mesa_id" uuid NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"finished_at" timestamp,
	"duration_seconds" integer
);
--> statement-breakpoint
CREATE TABLE "mesas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plant_id" uuid NOT NULL,
	"code" varchar(100) NOT NULL,
	"label" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	CONSTRAINT "mesas_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "plants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"location" varchar(255),
	"client_id" uuid NOT NULL,
	"total_mesas" integer DEFAULT 0 NOT NULL,
	"svg_path" varchar(1000)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(20) DEFAULT 'technician' NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wash_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plant_id" uuid NOT NULL,
	"technician_id" uuid NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"finished_at" timestamp,
	"cycle_id" uuid,
	"notes" varchar(500)
);
--> statement-breakpoint
ALTER TABLE "cleaning_cycles" ADD CONSTRAINT "cleaning_cycles_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesa_washes" ADD CONSTRAINT "mesa_washes_session_id_wash_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."wash_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesa_washes" ADD CONSTRAINT "mesa_washes_mesa_id_mesas_id_fk" FOREIGN KEY ("mesa_id") REFERENCES "public"."mesas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesas" ADD CONSTRAINT "mesas_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plants" ADD CONSTRAINT "plants_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wash_sessions" ADD CONSTRAINT "wash_sessions_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wash_sessions" ADD CONSTRAINT "wash_sessions_technician_id_users_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wash_sessions" ADD CONSTRAINT "wash_sessions_cycle_id_cleaning_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cleaning_cycles"("id") ON DELETE no action ON UPDATE no action;