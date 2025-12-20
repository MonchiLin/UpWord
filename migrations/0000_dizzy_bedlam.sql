CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`generation_task_id` text NOT NULL,
	`generation_job_id` text,
	`model` text NOT NULL,
	`title` text NOT NULL,
	`content_json` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`published_at` text,
	FOREIGN KEY (`generation_task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`generation_job_id`) REFERENCES `generation_jobs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_articles_status_enum" CHECK("articles"."status" IN ('draft', 'published')),
	CONSTRAINT "chk_articles_content_json_valid" CHECK(json_valid("articles"."content_json"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_articles_unique` ON `articles` (`generation_task_id`,`model`);--> statement-breakpoint
CREATE INDEX `idx_articles_generation_task_id` ON `articles` (`generation_task_id`);--> statement-breakpoint
CREATE INDEX `idx_articles_status` ON `articles` (`status`);--> statement-breakpoint
CREATE INDEX `idx_articles_published` ON `articles` (`published_at`);--> statement-breakpoint
CREATE TABLE `daily_words` (
	`date` text PRIMARY KEY NOT NULL,
	`new_words_json` text NOT NULL,
	`review_words_json` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	CONSTRAINT "chk_daily_words_new_words_json_valid" CHECK(json_valid("daily_words"."new_words_json")),
	CONSTRAINT "chk_daily_words_review_words_json_valid" CHECK(json_valid("daily_words"."review_words_json"))
);
--> statement-breakpoint
CREATE TABLE `generation_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`generation_task_id` text NOT NULL,
	`model` text NOT NULL,
	`params_json` text NOT NULL,
	`status` text NOT NULL,
	`error_message` text,
	`usage_json` text,
	`started_at` text,
	`finished_at` text,
	FOREIGN KEY (`generation_task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_generation_jobs_status_enum" CHECK("generation_jobs"."status" IN ('queued', 'running', 'succeeded', 'failed', 'canceled')),
	CONSTRAINT "chk_generation_jobs_params_json_valid" CHECK(json_valid("generation_jobs"."params_json")),
	CONSTRAINT "chk_generation_jobs_usage_json_valid" CHECK("generation_jobs"."usage_json" IS NULL OR json_valid("generation_jobs"."usage_json"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_generation_jobs_unique` ON `generation_jobs` (`generation_task_id`,`model`);--> statement-breakpoint
CREATE INDEX `idx_generation_jobs_generation_task_id` ON `generation_jobs` (`generation_task_id`);--> statement-breakpoint
CREATE INDEX `idx_generation_jobs_status` ON `generation_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_generation_jobs_model` ON `generation_jobs` (`model`);--> statement-breakpoint
CREATE TABLE `generation_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`topic_preference` text NOT NULL,
	`model_setting_json` text NOT NULL,
	`concurrency` integer NOT NULL,
	`timeout_ms` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	CONSTRAINT "chk_generation_profiles_model_setting_json_valid" CHECK(json_valid("generation_profiles"."model_setting_json")),
	CONSTRAINT "chk_generation_profiles_concurrency_gt0" CHECK("generation_profiles"."concurrency" > 0),
	CONSTRAINT "chk_generation_profiles_timeout_ms_gt0" CHECK("generation_profiles"."timeout_ms" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_generation_profiles_name` ON `generation_profiles` (`name`);--> statement-breakpoint
CREATE INDEX `idx_generation_profiles_topic_preference` ON `generation_profiles` (`topic_preference`);--> statement-breakpoint
CREATE TABLE `highlights` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`actor` text NOT NULL,
	`start_meta_json` text NOT NULL,
	`end_meta_json` text NOT NULL,
	`text` text NOT NULL,
	`note` text,
	`style_json` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_highlights_start_meta_json_valid" CHECK(json_valid("highlights"."start_meta_json")),
	CONSTRAINT "chk_highlights_end_meta_json_valid" CHECK(json_valid("highlights"."end_meta_json")),
	CONSTRAINT "chk_highlights_style_json_valid" CHECK("highlights"."style_json" IS NULL OR json_valid("highlights"."style_json"))
);
--> statement-breakpoint
CREATE INDEX `idx_highlights_article_id` ON `highlights` (`article_id`);--> statement-breakpoint
CREATE INDEX `idx_highlights_actor` ON `highlights` (`actor`);--> statement-breakpoint
CREATE INDEX `idx_highlights_article_actor` ON `highlights` (`article_id`,`actor`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`task_date` text NOT NULL,
	`type` text NOT NULL,
	`trigger_source` text DEFAULT 'manual' NOT NULL,
	`status` text NOT NULL,
	`profile_id` text NOT NULL,
	`result_json` text,
	`error_message` text,
	`error_context_json` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`started_at` text,
	`finished_at` text,
	`published_at` text,
	FOREIGN KEY (`profile_id`) REFERENCES `generation_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_tasks_type_enum" CHECK("tasks"."type" IN ('article_generation')),
	CONSTRAINT "chk_tasks_trigger_source_enum" CHECK("tasks"."trigger_source" IN ('manual')),
	CONSTRAINT "chk_tasks_status_enum" CHECK("tasks"."status" IN ('queued', 'running', 'succeeded', 'failed', 'canceled')),
	CONSTRAINT "chk_tasks_result_json_valid" CHECK("tasks"."result_json" IS NULL OR json_valid("tasks"."result_json")),
	CONSTRAINT "chk_tasks_error_context_json_valid" CHECK("tasks"."error_context_json" IS NULL OR json_valid("tasks"."error_context_json")),
	CONSTRAINT "chk_tasks_published_only_for_article_generation" CHECK("tasks"."type" = 'article_generation' OR "tasks"."published_at" IS NULL)
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_task_date` ON `tasks` (`task_date`);--> statement-breakpoint
CREATE INDEX `idx_tasks_type` ON `tasks` (`type`);--> statement-breakpoint
CREATE INDEX `idx_tasks_status` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `idx_tasks_profile_id` ON `tasks` (`profile_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_published_at` ON `tasks` (`published_at`);--> statement-breakpoint
CREATE TABLE `word_learning_records` (
	`word` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`last_ai_article_at` text,
	`last_shanbay_sync_date` text,
	`due_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`stability` real DEFAULT 0 NOT NULL,
	`difficulty` real DEFAULT 0 NOT NULL,
	`elapsed_days` integer DEFAULT 0 NOT NULL,
	`scheduled_days` integer DEFAULT 0 NOT NULL,
	`learning_steps` integer DEFAULT 0 NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	`state` text DEFAULT 'new' NOT NULL,
	`last_review_at` text,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`word`) REFERENCES `words`(`word`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_word_learning_records_state_enum" CHECK("word_learning_records"."state" IN ('new', 'learning', 'review', 'relearning')),
	CONSTRAINT "chk_word_learning_records_elapsed_days_gte0" CHECK("word_learning_records"."elapsed_days" >= 0),
	CONSTRAINT "chk_word_learning_records_scheduled_days_gte0" CHECK("word_learning_records"."scheduled_days" >= 0),
	CONSTRAINT "chk_word_learning_records_learning_steps_gte0" CHECK("word_learning_records"."learning_steps" >= 0),
	CONSTRAINT "chk_word_learning_records_reps_gte0" CHECK("word_learning_records"."reps" >= 0),
	CONSTRAINT "chk_word_learning_records_lapses_gte0" CHECK("word_learning_records"."lapses" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_word_learning_records_due_at` ON `word_learning_records` (`due_at`);--> statement-breakpoint
CREATE TABLE `word_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`word` text NOT NULL,
	`rating` text NOT NULL,
	`state` text NOT NULL,
	`due_at` text NOT NULL,
	`stability` real NOT NULL,
	`difficulty` real NOT NULL,
	`elapsed_days` integer NOT NULL,
	`last_elapsed_days` integer NOT NULL,
	`scheduled_days` integer NOT NULL,
	`learning_steps` integer NOT NULL,
	`review_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`word`) REFERENCES `words`(`word`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_word_reviews_rating_enum" CHECK("word_reviews"."rating" IN ('again', 'hard', 'good', 'easy')),
	CONSTRAINT "chk_word_reviews_state_enum" CHECK("word_reviews"."state" IN ('new', 'learning', 'review', 'relearning')),
	CONSTRAINT "chk_word_reviews_elapsed_days_gte0" CHECK("word_reviews"."elapsed_days" >= 0),
	CONSTRAINT "chk_word_reviews_last_elapsed_days_gte0" CHECK("word_reviews"."last_elapsed_days" >= 0),
	CONSTRAINT "chk_word_reviews_scheduled_days_gte0" CHECK("word_reviews"."scheduled_days" >= 0),
	CONSTRAINT "chk_word_reviews_learning_steps_gte0" CHECK("word_reviews"."learning_steps" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_word_reviews_word` ON `word_reviews` (`word`);--> statement-breakpoint
CREATE INDEX `idx_word_reviews_review_at` ON `word_reviews` (`review_at`);--> statement-breakpoint
CREATE INDEX `idx_word_reviews_rating` ON `word_reviews` (`rating`);--> statement-breakpoint
CREATE TABLE `words` (
	`word` text PRIMARY KEY NOT NULL,
	`mastery_status` text DEFAULT 'unknown' NOT NULL,
	`origin` text NOT NULL,
	`origin_ref` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	CONSTRAINT "chk_words_mastery_status_enum" CHECK("words"."mastery_status" IN ('unknown', 'familiar', 'mastered')),
	CONSTRAINT "chk_words_origin_enum" CHECK("words"."origin" IN ('shanbay', 'article', 'manual'))
);
--> statement-breakpoint
CREATE INDEX `idx_words_mastery_status` ON `words` (`mastery_status`);--> statement-breakpoint
CREATE INDEX `idx_words_origin` ON `words` (`origin`);