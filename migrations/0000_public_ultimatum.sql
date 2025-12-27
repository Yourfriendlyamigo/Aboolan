CREATE TABLE "family_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"parent_id" integer,
	"mother_name" text,
	"phone_number" text,
	"is_deceased" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
