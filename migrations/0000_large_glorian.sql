CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"roll_no" text NOT NULL,
	"date" text NOT NULL,
	"period" integer NOT NULL,
	"subject_id" integer,
	"status" text NOT NULL,
	"course_type" text NOT NULL,
	"course_name" text,
	"section" text,
	"batch_year" text NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"synced" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_leave" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"course_type" text NOT NULL,
	"year" text NOT NULL,
	"course_division" text,
	"section" text DEFAULT 'A' NOT NULL,
	"affected_periods" text[],
	"applied_at" text NOT NULL,
	"applied_by" integer NOT NULL,
	"reason" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"reason" text,
	"affected_courses" text[],
	"triggered_at" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaves" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"from_date" text NOT NULL,
	"to_date" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missed_attendance_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"course_type" text NOT NULL,
	"year" text NOT NULL,
	"course_division" text,
	"section" text DEFAULT 'A' NOT NULL,
	"period" integer NOT NULL,
	"status" text DEFAULT 'not_taken' NOT NULL,
	"taken_by" integer,
	"timestamp" timestamp,
	"remarks" text,
	"student_count" integer DEFAULT 0,
	"attendance_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missed_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_type" text NOT NULL,
	"year" text NOT NULL,
	"stream" text,
	"section" text DEFAULT 'A' NOT NULL,
	"subject" text NOT NULL,
	"subject_name" text NOT NULL,
	"missed_date" text NOT NULL,
	"period_number" integer NOT NULL,
	"day_of_week" text NOT NULL,
	"scheduled_start_time" text,
	"scheduled_end_time" text,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"reason" text DEFAULT 'Attendance not taken' NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"makeup_date" text,
	"makeup_period" integer,
	"priority" text DEFAULT 'normal' NOT NULL,
	"days_pending" integer DEFAULT 0,
	"auto_detected" boolean DEFAULT true NOT NULL,
	"completed_by" integer,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "namaz_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"date" text NOT NULL,
	"prayer" text NOT NULL,
	"status" text NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "period_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_number" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"label" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "remarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"content" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"submitted_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "results" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" text NOT NULL,
	"course_type" text NOT NULL,
	"course_name" text,
	"section" text,
	"exam_type" text NOT NULL,
	"file_url" text NOT NULL,
	"file_type" text NOT NULL,
	"uploaded_by" text,
	"upload_date" timestamp DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"roll_no" text NOT NULL,
	"course_type" text NOT NULL,
	"course_division" text,
	"year" text NOT NULL,
	"batch" text,
	"dob" text NOT NULL,
	"blood_group" text,
	"father_name" text,
	"mother_name" text,
	"contact_1" text,
	"contact_2" text,
	"address" text,
	"aadhar_number" text,
	"photo_url" text,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"subject_code" text NOT NULL,
	"course_type" text NOT NULL,
	"year" text,
	"stream" text,
	"section" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "timetable" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_type" text NOT NULL,
	"year" text NOT NULL,
	"stream" text,
	"section" text DEFAULT 'A' NOT NULL,
	"day_of_week" text NOT NULL,
	"period_number" integer NOT NULL,
	"subject_id" integer,
	"start_time" text,
	"end_time" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timetable_period_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_type" text NOT NULL,
	"year" text NOT NULL,
	"stream" text,
	"section" text,
	"default_periods" integer NOT NULL,
	"custom_day_periods" text,
	"updated_by" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'teacher' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
