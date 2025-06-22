

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."question_type" AS ENUM (
    'multiple_choice',
    'true_false',
    'fill_in_the_blank'
);


ALTER TYPE "public"."question_type" OWNER TO "postgres";


CREATE TYPE "public"."quiz_mode_type" AS ENUM (
    'fixed_question_count',
    'time_based',
    'sudden_death',
    'unlimited'
);


ALTER TYPE "public"."quiz_mode_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_start_quiz"("user_id_input" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  profile_record RECORD;
  can_attempt BOOLEAN;
BEGIN
  -- Select the user's profile
  SELECT * INTO profile_record FROM public.profiles WHERE id = user_id_input;

  -- Reset daily attempts if last attempt was not today
  IF profile_record.last_attempt_date IS NULL OR profile_record.last_attempt_date < CURRENT_DATE THEN
    UPDATE public.profiles
    SET quiz_attempts_today = 0,
        last_attempt_date = CURRENT_DATE
    WHERE id = user_id_input;
    -- Re-fetch the updated record
    SELECT * INTO profile_record FROM public.profiles WHERE id = user_id_input;
  END IF;

  -- Check if user can attempt the quiz (e.g., limit of 3 for 'user' role)
  IF profile_record.role = 'admin' OR profile_record.role = 'premium_user' OR profile_record.quiz_attempts_today < 3 THEN
    -- Increment the attempt count
    UPDATE public.profiles
    SET quiz_attempts_today = profile_record.quiz_attempts_today + 1
    WHERE id = user_id_input;
    can_attempt := TRUE;
  ELSE
    can_attempt := FALSE;
  END IF;

  RETURN can_attempt;
END;
$$;


ALTER FUNCTION "public"."can_start_quiz"("user_id_input" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_users_with_email"("search_term" "text") RETURNS TABLE("id" "uuid", "full_name" "text", "email" "text", "role" "text", "created_at" timestamp with time zone, "last_sign_in_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select
    p.id,
    p.full_name,
    u.email,
    p.role,
    p.created_at,
    u.last_sign_in_at -- Get last_sign_in_at from auth.users
  from
    public.profiles as p
  join
    auth.users as u on p.id = u.id
  where
    p.full_name ilike '%' || search_term || '%';
$$;


ALTER FUNCTION "public"."get_all_users_with_email"("search_term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_leaderboard"() RETURNS TABLE("rank" bigint, "user_id" "uuid", "full_name" "text", "total_score" bigint)
    LANGUAGE "sql"
    AS $$
  select
    -- Calculate the rank based on the score ordering
    rank() over (order by sum(a.score) desc) as rank,
    p.id as user_id,
    p.full_name,
    sum(a.score) as total_score
  from
    public.quiz_attempts as a
  join
    public.profiles as p on a.user_id = p.id
  group by
    p.id, p.full_name
  order by
    total_score desc;
$$;


ALTER FUNCTION "public"."get_leaderboard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_leaderboard"("category_id_filter" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("rank" bigint, "user_id" "uuid", "full_name" "text", "total_score" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select
    rank() over (order by sum(a.score) desc) as rank,
    p.id as user_id,
    p.full_name,
    sum(a.score) as total_score
  from
    public.quiz_attempts as a
  join
    public.profiles as p on a.user_id = p.id
  where
    a.status = 'completed'
    and (category_id_filter is null or a.category_id = category_id_filter)
  group by
    p.id, p.full_name
  order by
    total_score desc;
$$;


ALTER FUNCTION "public"."get_leaderboard"("category_id_filter" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_quiz_performance_stats"("from_date" "text", "to_date" "text") RETURNS TABLE("quiz_id" "uuid", "quiz_title" "text", "total_attempts" bigint, "unique_takers" bigint, "avg_score" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        qa.category_id AS quiz_id,
        q.name_en AS quiz_title,
        count(qa.id) AS total_attempts,
        count(DISTINCT qa.user_id) AS unique_takers,
        -- vvv --- THE FINAL FIX IS HERE --- vvv
        -- We explicitly cast the result of avg() to the correct type
        avg(qa.score)::double precision AS avg_score
        -- ^^^ --- THE FINAL FIX IS HERE --- ^^^
    FROM
        public.quiz_attempts qa
    JOIN
        public.categories q ON qa.category_id = q.id
    WHERE
        qa.status = 'completed' AND
        qa.created_at >= from_date::timestamptz AND
        qa.created_at <= to_date::timestamptz
    GROUP BY
        qa.category_id, q.name_en
    ORDER BY
        total_attempts DESC;
END;
$$;


ALTER FUNCTION "public"."get_quiz_performance_stats"("from_date" "text", "to_date" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_rank"("p_user_id" "uuid") RETURNS TABLE("rank" bigint, "total_score" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  with ranked_scores as (
    select
      p.id as user_id,
      sum(a.score) as total_score,
      rank() over (order by sum(a.score) desc) as rank
    from
      public.quiz_attempts as a
    join
      public.profiles as p on a.user_id = p.id
    where
      a.status = 'completed'
    group by
      p.id
  )
  select r.rank, r.total_score
  from ranked_scores r
  where r.user_id = p_user_id;
$$;


ALTER FUNCTION "public"."get_user_rank"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_rank"("p_user_id" "uuid", "p_period" "text", "p_category_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("rank" bigint, "total_score" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  with ranked_scores as (
    select
      p.id as user_id,
      sum(a.score) as total_score,
      rank() over (order by sum(a.score) desc) as rank
    from
      public.quiz_attempts as a
    join
      public.profiles as p on a.user_id = p.id
    where
      a.status = 'completed'
      -- filter by time period
      and (
        (p_period = 'weekly' and a.completed_at >= now() - interval '7 days') or
        (p_period = 'monthly' and a.completed_at >= date_trunc('month', now())) or
        (p_period = 'all_time')
      )
      -- filter by category if provided
      and (p_category_id is null or a.category_id = p_category_id)
    group by
      p.id
  )
  select r.rank, r.total_score
  from ranked_scores r
  where r.user_id = p_user_id;
$$;


ALTER FUNCTION "public"."get_user_rank"("p_user_id" "uuid", "p_period" "text", "p_category_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_users_with_profiles"() RETURNS TABLE("id" "uuid", "full_name" "text", "email" "text", "role" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- First, ensure the person CALLING this function is an admin.
    -- This uses the get_my_role() function we created, which avoids recursion.
    IF public.get_my_role() <> 'admin' THEN
        RAISE EXCEPTION 'ACCESS DENIED: You must be an admin to view all users.';
    END IF;

    -- If the check passes, proceed with fetching all users as a superuser.
    RETURN QUERY
    SELECT
        p.id,
        p.full_name,
        au.email,
        p.role,
        au.created_at
    FROM
        public.profiles p
    JOIN
        auth.users au ON p.id = au.id;
END;
$$;


ALTER FUNCTION "public"."get_users_with_profiles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Inserts a row into public.profiles with ONLY the user id.
  -- Other columns will use their default values.
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_permission"("permission_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid() AND p.name = permission_name
  );
END;
$$;


ALTER FUNCTION "public"."has_permission"("permission_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    actor_id_value UUID;
BEGIN
    -- Get the user ID from the active session. If it's null (e.g., a system action), it will be logged as NULL.
    actor_id_value := auth.uid();

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.activity_logs (actor_id, action, table_name, record_id, new_record_data)
        VALUES (actor_id_value, TG_OP, TG_TABLE_NAME, NEW.id::text, row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.activity_logs (actor_id, action, table_name, record_id, old_record_data, new_record_data)
        VALUES (actor_id_value, TG_OP, TG_TABLE_NAME, NEW.id::text, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.activity_logs (actor_id, action, table_name, record_id, old_record_data)
        VALUES (actor_id_value, TG_OP, TG_TABLE_NAME, OLD.id::text, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$$;


ALTER FUNCTION "public"."log_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_all_time_leaderboard"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  -- First, clear the old all-time leaderboard data
  delete from public.leaderboards where period = 'all_time';

  -- Now, calculate the new leaderboard and insert it, including the full_name
  insert into public.leaderboards(period, user_id, full_name, total_score, quizzes_completed, rank)
  select
    'all_time' as period,
    p.id as user_id,
    p.full_name, -- The new field we are inserting
    sum(a.score) as total_score,
    count(a.id) as quizzes_completed,
    rank() over (order by sum(a.score) desc) as rank
  from
    public.quiz_attempts as a
  join
    public.profiles as p on a.user_id = p.id
  where
    a.status = 'completed'
  group by
    p.id, p.full_name; -- We also need to group by full_name now
$$;


ALTER FUNCTION "public"."update_all_time_leaderboard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_category_leaderboards"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  category_record record;
begin
  -- First, clear all old category-specific leaderboards
  delete from public.leaderboards where category_id is not null and period = 'all_time';

  -- Loop through each category
  for category_record in select id from public.categories loop
    -- Insert the leaderboard for the current category
    insert into public.leaderboards(period, user_id, full_name, total_score, quizzes_completed, rank, category_id)
    select
      'all_time' as period,
      p.id as user_id,
      p.full_name,
      sum(a.score) as total_score,
      count(a.id) as quizzes_completed,
      rank() over (order by sum(a.score) desc) as rank,
      category_record.id as category_id
    from
      public.quiz_attempts as a
    join
      public.profiles as p on a.user_id = p.id
    where
      a.status = 'completed' and a.category_id = category_record.id
    group by
      p.id, p.full_name;
  end loop;
end;
$$;


ALTER FUNCTION "public"."update_category_leaderboards"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_monthly_leaderboard"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  -- Clear the old monthly leaderboard data
  delete from public.leaderboards where period = 'monthly';

  -- Calculate the new monthly leaderboard and insert it
  insert into public.leaderboards(period, user_id, full_name, total_score, quizzes_completed, rank, category_id)
  select
    'monthly' as period,
    p.id as user_id,
    p.full_name,
    sum(a.score) as total_score,
    count(a.id) as quizzes_completed,
    rank() over (order by sum(a.score) desc) as rank,
    null as category_id
  from
    public.quiz_attempts as a
  join
    public.profiles as p on a.user_id = p.id
  where
    a.status = 'completed' and a.completed_at >= date_trunc('month', now())
  group by
    p.id, p.full_name;
$$;


ALTER FUNCTION "public"."update_monthly_leaderboard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_weekly_leaderboard"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  -- Clear the old weekly leaderboard data
  delete from public.leaderboards where period = 'weekly';

  -- Calculate the new weekly leaderboard and insert it
  insert into public.leaderboards(period, user_id, full_name, total_score, quizzes_completed, rank, category_id)
  select
    'weekly' as period,
    p.id as user_id,
    p.full_name,
    sum(a.score) as total_score,
    count(a.id) as quizzes_completed,
    rank() over (order by sum(a.score) desc) as rank,
    null as category_id -- This is a global weekly leaderboard
  from
    public.quiz_attempts as a
  join
    public.profiles as p on a.user_id = p.id
  where
    a.status = 'completed' and a.completed_at >= now() - interval '7 days'
  group by
    p.id, p.full_name;
$$;


ALTER FUNCTION "public"."update_weekly_leaderboard"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."achievements" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon_url" "text",
    "criteria" "jsonb" NOT NULL
);


ALTER TABLE "public"."achievements" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."achievements_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."achievements_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."achievements_id_seq" OWNED BY "public"."achievements"."id";



CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" bigint NOT NULL,
    "actor_id" "uuid",
    "action" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "text",
    "old_record_data" "jsonb",
    "new_record_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."activity_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."activity_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."activity_logs_id_seq" OWNED BY "public"."activity_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name_en" "text" NOT NULL,
    "name_ne" "text",
    "slug" "text" NOT NULL,
    "description_en" "text",
    "description_ne" "text",
    "parent_category_id" "uuid",
    "icon_url" "text",
    "is_published" boolean DEFAULT false NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "quiz_attempts_today" smallint DEFAULT '0'::smallint,
    "last_attempt_date" "date",
    "current_streak" integer DEFAULT 0,
    "last_activity_date" "date"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "status" "text" DEFAULT 'started'::"text" NOT NULL,
    "score" integer,
    "total_questions_attempted" integer,
    "correct_answers_count" integer,
    "incorrect_answers_count" integer,
    "time_taken_seconds" integer,
    "settings_snapshot" "jsonb",
    "started_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "quiz_mode_id" "uuid",
    CONSTRAINT "quiz_attempts_status_check" CHECK (("status" = ANY (ARRAY['started'::"text", 'completed'::"text", 'abandoned'::"text"])))
);


ALTER TABLE "public"."quiz_attempts" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."leaderboard" AS
 SELECT "p"."id",
    "p"."full_name",
    "sum"("qa"."score") AS "total_score"
   FROM ("public"."profiles" "p"
     JOIN "public"."quiz_attempts" "qa" ON (("p"."id" = "qa"."user_id")))
  WHERE ("qa"."status" = 'completed'::"text")
  GROUP BY "p"."id", "p"."full_name"
  ORDER BY ("sum"("qa"."score")) DESC;


ALTER TABLE "public"."leaderboard" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leaderboards" (
    "id" bigint NOT NULL,
    "period" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "total_score" bigint NOT NULL,
    "quizzes_completed" bigint NOT NULL,
    "rank" bigint NOT NULL,
    "full_name" "text"
);


ALTER TABLE "public"."leaderboards" OWNER TO "postgres";


ALTER TABLE "public"."leaderboards" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."leaderboards_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "option_text_en" "text" NOT NULL,
    "option_text_ne" "text",
    "is_correct" boolean DEFAULT false NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."permissions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."permissions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."permissions_id_seq" OWNED BY "public"."permissions"."id";



CREATE TABLE IF NOT EXISTS "public"."question_categories" (
    "question_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL
);


ALTER TABLE "public"."question_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_comments" (
    "id" bigint NOT NULL,
    "question_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "parent_comment_id" bigint,
    "comment_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."question_comments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."question_comments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."question_comments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."question_comments_id_seq" OWNED BY "public"."question_comments"."id";



CREATE TABLE IF NOT EXISTS "public"."user_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_attempt_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "selected_option_id" "uuid",
    "is_correct" boolean,
    "answered_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "time_taken_seconds" integer
);


ALTER TABLE "public"."user_answers" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."question_stats" AS
 SELECT "ua"."question_id",
    "count"("ua"."id") AS "total_attempts",
    ("avg"(
        CASE
            WHEN "ua"."is_correct" THEN 1
            ELSE 0
        END) * (100)::numeric) AS "correct_percentage"
   FROM "public"."user_answers" "ua"
  GROUP BY "ua"."question_id";


ALTER TABLE "public"."question_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_text_en" "text" NOT NULL,
    "question_text_ne" "text",
    "language" "text" NOT NULL,
    "difficulty_level" "text" DEFAULT 'medium'::"text" NOT NULL,
    "points" integer DEFAULT 1 NOT NULL,
    "explanation_en" "text",
    "explanation_ne" "text",
    "image_url" "text",
    "author_id" "uuid",
    "is_published" boolean DEFAULT false NOT NULL,
    "tags" "text"[],
    "source_reference" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "question_type" "public"."question_type" DEFAULT 'multiple_choice'::"public"."question_type" NOT NULL,
    CONSTRAINT "questions_difficulty_level_check" CHECK (("difficulty_level" = ANY (ARRAY['easy'::"text", 'medium'::"text", 'hard'::"text"]))),
    CONSTRAINT "questions_language_check" CHECK (("language" = ANY (ARRAY['en'::"text", 'ne'::"text", 'both'::"text"])))
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_modes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name_en" "text" NOT NULL,
    "name_ne" "text",
    "description_en" "text",
    "description_ne" "text",
    "mode_type" "public"."quiz_mode_type" NOT NULL,
    "config" "jsonb",
    "is_premium" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quiz_modes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "role_id" bigint NOT NULL,
    "permission_id" bigint NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."roles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."roles_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."roles_id_seq" OWNED BY "public"."roles"."id";



CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "user_id" "uuid" NOT NULL,
    "achievement_id" integer NOT NULL,
    "earned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_category_performance" AS
 SELECT "qa"."user_id",
    "qc"."category_id",
    "c"."name_en" AS "category_name",
    "count"("ua"."id") AS "total_questions_answered",
    "sum"(
        CASE
            WHEN ("ua"."is_correct" = true) THEN 1
            ELSE 0
        END) AS "correct_answers",
    "sum"(
        CASE
            WHEN ("ua"."is_correct" = false) THEN 1
            ELSE 0
        END) AS "incorrect_answers",
    ("avg"("ua"."time_taken_seconds"))::numeric(10,2) AS "avg_time_per_question_seconds",
    ("avg"(("q"."points" *
        CASE
            WHEN ("ua"."is_correct" = true) THEN 1
            ELSE 0
        END)))::numeric(10,2) AS "avg_points_per_question"
   FROM (((("public"."user_answers" "ua"
     JOIN "public"."quiz_attempts" "qa" ON (("ua"."quiz_attempt_id" = "qa"."id")))
     JOIN "public"."questions" "q" ON (("ua"."question_id" = "q"."id")))
     JOIN "public"."question_categories" "qc" ON (("q"."id" = "qc"."question_id")))
     JOIN "public"."categories" "c" ON (("qc"."category_id" = "c"."id")))
  WHERE ("qa"."status" = 'completed'::"text")
  GROUP BY "qa"."user_id", "qc"."category_id", "c"."name_en";


ALTER TABLE "public"."user_category_performance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role_id" bigint NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."achievements" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."achievements_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."activity_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."activity_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."permissions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."permissions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."question_comments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."question_comments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."roles" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."roles_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."leaderboards"
    ADD CONSTRAINT "leaderboards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."options"
    ADD CONSTRAINT "options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_categories"
    ADD CONSTRAINT "question_categories_pkey" PRIMARY KEY ("question_id", "category_id");



ALTER TABLE ONLY "public"."question_comments"
    ADD CONSTRAINT "question_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_modes"
    ADD CONSTRAINT "quiz_modes_name_en_key" UNIQUE ("name_en");



ALTER TABLE ONLY "public"."quiz_modes"
    ADD CONSTRAINT "quiz_modes_name_en_unique" UNIQUE ("name_en");



ALTER TABLE ONLY "public"."quiz_modes"
    ADD CONSTRAINT "quiz_modes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("user_id", "achievement_id");



ALTER TABLE ONLY "public"."user_answers"
    ADD CONSTRAINT "user_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id", "role_id");



CREATE INDEX "idx_options_question_id" ON "public"."options" USING "btree" ("question_id");



CREATE INDEX "idx_question_categories_category_id" ON "public"."question_categories" USING "btree" ("category_id");



CREATE INDEX "idx_questions_difficulty" ON "public"."questions" USING "btree" ("difficulty_level");



CREATE INDEX "idx_questions_language" ON "public"."questions" USING "btree" ("language");



CREATE INDEX "idx_quiz_attempts_user_id" ON "public"."quiz_attempts" USING "btree" ("user_id");



CREATE INDEX "idx_user_answers_question_id" ON "public"."user_answers" USING "btree" ("question_id");



CREATE INDEX "idx_user_answers_quiz_attempt_id" ON "public"."user_answers" USING "btree" ("quiz_attempt_id");



CREATE UNIQUE INDEX "leaderboards_period_user_category_idx" ON "public"."leaderboards" USING "btree" ("period", "user_id", COALESCE("category_id", '00000000-0000-0000-0000-000000000000'::"uuid"));



CREATE INDEX "question_comments_question_id_idx" ON "public"."question_comments" USING "btree" ("question_id");



CREATE INDEX "user_roles_user_id_idx" ON "public"."user_roles" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "categories_activity_log" AFTER INSERT OR DELETE OR UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"();



CREATE OR REPLACE TRIGGER "on_categories_updated" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_options_updated" BEFORE UPDATE ON "public"."options" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_profiles_updated" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_questions_updated" BEFORE UPDATE ON "public"."questions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_quiz_attempts_updated" BEFORE UPDATE ON "public"."quiz_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "questions_activity_log" AFTER INSERT OR DELETE OR UPDATE ON "public"."questions" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"();



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leaderboards"
    ADD CONSTRAINT "leaderboards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."options"
    ADD CONSTRAINT "options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_categories"
    ADD CONSTRAINT "question_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_categories"
    ADD CONSTRAINT "question_categories_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_comments"
    ADD CONSTRAINT "question_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_comments"
    ADD CONSTRAINT "question_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."question_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_comments"
    ADD CONSTRAINT "question_comments_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_quiz_mode_id_fkey" FOREIGN KEY ("quiz_mode_id") REFERENCES "public"."quiz_modes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_answers"
    ADD CONSTRAINT "user_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_answers"
    ADD CONSTRAINT "user_answers_quiz_attempt_id_fkey" FOREIGN KEY ("quiz_attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_answers"
    ADD CONSTRAINT "user_answers_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "public"."options"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage all profiles" ON "public"."profiles" USING ("public"."has_permission"('users:manage'::"text"));



CREATE POLICY "Admins can manage user roles" ON "public"."user_roles" USING ("public"."has_permission"('users:manage'::"text"));



CREATE POLICY "Admins can update any user profile" ON "public"."profiles" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Allow admins full access to categories" ON "public"."categories" TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text")) WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Allow admins full access to options" ON "public"."options" TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text")) WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Allow admins full access to question_categories" ON "public"."question_categories" TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text")) WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Allow admins full access to questions" ON "public"."questions" TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text")) WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Allow admins to delete from categories" ON "public"."categories" FOR DELETE TO "authenticated" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admins to delete from options" ON "public"."options" FOR DELETE TO "authenticated" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admins to delete from question_categories" ON "public"."question_categories" FOR DELETE TO "authenticated" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admins to delete from questions" ON "public"."questions" FOR DELETE TO "authenticated" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admins to delete questions" ON "public"."questions" FOR DELETE USING ("public"."has_permission"('questions:delete'::"text"));



CREATE POLICY "Allow admins to insert into categories" ON "public"."categories" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admins to insert into options" ON "public"."options" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admins to insert into question_categories" ON "public"."question_categories" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admins to insert into questions" ON "public"."questions" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admins to manage achievements" ON "public"."achievements" USING ("public"."has_permission"('gamification:manage'::"text"));



CREATE POLICY "Allow admins to manage permissions" ON "public"."permissions" USING ("public"."has_permission"('permissions:manage'::"text"));



CREATE POLICY "Allow admins to manage role permissions" ON "public"."role_permissions" USING ("public"."has_permission"('permissions:manage'::"text"));



CREATE POLICY "Allow admins to manage roles" ON "public"."roles" USING ("public"."has_permission"('roles:manage'::"text"));



CREATE POLICY "Allow admins to manage user roles" ON "public"."user_roles" USING ("public"."has_permission"('users:manage'::"text"));



CREATE POLICY "Allow admins to read activity logs" ON "public"."activity_logs" FOR SELECT USING ("public"."has_permission"('logs:view'::"text"));



CREATE POLICY "Allow admins to read all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admins to select from categories" ON "public"."categories" FOR SELECT TO "authenticated" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admins to select from options" ON "public"."options" FOR SELECT TO "authenticated" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admins to select from question_categories" ON "public"."question_categories" FOR SELECT TO "authenticated" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admins to select from questions" ON "public"."questions" FOR SELECT TO "authenticated" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admins to update categories" ON "public"."categories" FOR UPDATE TO "authenticated" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admins to update options" ON "public"."options" FOR UPDATE TO "authenticated" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admins to update question_categories" ON "public"."question_categories" FOR UPDATE TO "authenticated" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow admins to update questions" ON "public"."questions" FOR UPDATE TO "authenticated" USING (("public"."get_my_role"() = 'admin'::"text"));



CREATE POLICY "Allow authenticated users to create comments" ON "public"."question_comments" FOR INSERT WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND ("author_id" = "auth"."uid"())));



CREATE POLICY "Allow authenticated users to create their own answers" ON "public"."user_answers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."quiz_attempts" "qa"
  WHERE (("qa"."id" = "user_answers"."quiz_attempt_id") AND ("qa"."user_id" = "auth"."uid"())))));



CREATE POLICY "Allow authenticated users to create their own quiz attempts" ON "public"."quiz_attempts" FOR INSERT TO "authenticated" WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to insert their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Allow authenticated users to read categories" ON "public"."categories" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to read the leaderboard" ON "public"."leaderboards" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to read their own answers" ON "public"."user_answers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."quiz_attempts" "qa"
  WHERE (("qa"."id" = "user_answers"."quiz_attempt_id") AND ("qa"."user_id" = "auth"."uid"())))));



CREATE POLICY "Allow authenticated users to read their own quiz attempts" ON "public"."quiz_attempts" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow authenticated users to select their own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Allow authenticated users to select their own profilee" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Allow authenticated users to update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Allow authenticated users to update their own quiz attempts" ON "public"."quiz_attempts" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow content managers to handle categories" ON "public"."categories" USING ("public"."has_permission"('content:manage'::"text"));



CREATE POLICY "Allow content managers to manage quiz modes" ON "public"."quiz_modes" USING ("public"."has_permission"('content:manage'::"text"));



CREATE POLICY "Allow creating questions for authorized users" ON "public"."questions" FOR INSERT WITH CHECK (("public"."has_permission"('questions:create'::"text") AND ("author_id" = "auth"."uid"())));



CREATE POLICY "Allow creators to update their own drafts" ON "public"."questions" FOR UPDATE USING (("public"."has_permission"('questions:edit:own'::"text") AND ("author_id" = "auth"."uid"()) AND ("is_published" = false)));



CREATE POLICY "Allow editors to manage any question" ON "public"."questions" USING ("public"."has_permission"('questions:edit:all'::"text"));



CREATE POLICY "Allow editors to select any question" ON "public"."questions" FOR SELECT USING ("public"."has_permission"('questions:edit:all'::"text"));



CREATE POLICY "Allow editors to update any question" ON "public"."questions" FOR UPDATE USING ("public"."has_permission"('questions:edit:all'::"text"));



CREATE POLICY "Allow editors/admins to update any question" ON "public"."questions" FOR UPDATE USING ("public"."has_permission"('questions:edit:all'::"text"));



CREATE POLICY "Allow moderators to fully manage comments" ON "public"."question_comments" USING ("public"."has_permission"('comments:moderate'::"text"));



CREATE POLICY "Allow public read access to achievements" ON "public"."achievements" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to active quiz modes" ON "public"."quiz_modes" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Allow public read access to comments" ON "public"."question_comments" FOR SELECT USING (("is_deleted" = false));



CREATE POLICY "Allow public read access to published categories" ON "public"."categories" FOR SELECT USING (("is_published" = true));



CREATE POLICY "Allow public read access to published questions" ON "public"."questions" FOR SELECT USING (("is_published" = true));



CREATE POLICY "Allow public read access to user achievements" ON "public"."user_achievements" FOR SELECT USING (true);



CREATE POLICY "Allow public read of options for published questions" ON "public"."options" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."questions"
  WHERE (("questions"."id" = "options"."question_id") AND ("questions"."is_published" = true)))));



CREATE POLICY "Allow public read of published questions" ON "public"."questions" FOR SELECT USING (("is_published" = true));



CREATE POLICY "Allow question authors/editors to manage options" ON "public"."options" USING (("public"."has_permission"('questions:edit:all'::"text") OR ("public"."has_permission"('questions:edit:own'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."questions"
  WHERE (("questions"."id" = "options"."question_id") AND ("questions"."author_id" = "auth"."uid"())))))));



CREATE POLICY "Allow question deletion only by admins/authors of drafts" ON "public"."options" FOR DELETE USING (("public"."has_permission"('questions:delete'::"text") OR ("public"."has_permission"('questions:edit:own'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."questions"
  WHERE (("questions"."id" = "options"."question_id") AND ("questions"."author_id" = "auth"."uid"()) AND ("questions"."is_published" = false)))))));



CREATE POLICY "Allow system/admins to insert achievements" ON "public"."user_achievements" FOR INSERT WITH CHECK ("public"."has_permission"('gamification:manage'::"text"));



CREATE POLICY "Allow users to 'delete' (soft delete) their own comments" ON "public"."question_comments" FOR UPDATE USING (("auth"."uid"() = "author_id")) WITH CHECK (("is_deleted" = true));



CREATE POLICY "Allow users to see their own non-published questions" ON "public"."questions" FOR SELECT USING (("author_id" = "auth"."uid"()));



CREATE POLICY "Allow users to view their own roles" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create answers for their own ONGOING attempts" ON "public"."user_answers" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."quiz_attempts"
  WHERE (("quiz_attempts"."id" = "user_answers"."quiz_attempt_id") AND ("quiz_attempts"."user_id" = "auth"."uid"()) AND ("quiz_attempts"."status" = 'started'::"text")))));



CREATE POLICY "Users can create their own answers" ON "public"."user_answers" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."quiz_attempts"
  WHERE (("quiz_attempts"."id" = "user_answers"."quiz_attempt_id") AND ("quiz_attempts"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create their own quiz attempts" ON "public"."quiz_attempts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own quiz attempts" ON "public"."quiz_attempts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own answers" ON "public"."user_answers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."quiz_attempts"
  WHERE (("quiz_attempts"."id" = "user_answers"."quiz_attempt_id") AND ("quiz_attempts"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own ONGOING quiz attempts" ON "public"."quiz_attempts" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("status" = 'started'::"text"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view all profiles" ON "public"."profiles" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can view and update their own quiz attempts" ON "public"."quiz_attempts" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile." ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own quiz attempts" ON "public"."quiz_attempts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own roles" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "llow public read access to question_categories" ON "public"."question_categories" FOR SELECT USING (true);



ALTER TABLE "public"."options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_modes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."can_start_quiz"("user_id_input" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_start_quiz"("user_id_input" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_start_quiz"("user_id_input" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_users_with_email"("search_term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_users_with_email"("search_term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_users_with_email"("search_term" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_leaderboard"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_leaderboard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_leaderboard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_leaderboard"("category_id_filter" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_leaderboard"("category_id_filter" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_leaderboard"("category_id_filter" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quiz_performance_stats"("from_date" "text", "to_date" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_quiz_performance_stats"("from_date" "text", "to_date" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quiz_performance_stats"("from_date" "text", "to_date" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_rank"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_rank"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_rank"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_rank"("p_user_id" "uuid", "p_period" "text", "p_category_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_rank"("p_user_id" "uuid", "p_period" "text", "p_category_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_rank"("p_user_id" "uuid", "p_period" "text", "p_category_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_users_with_profiles"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_users_with_profiles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_users_with_profiles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_permission"("permission_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_permission"("permission_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("permission_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_all_time_leaderboard"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_all_time_leaderboard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_all_time_leaderboard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_category_leaderboards"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_category_leaderboards"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_category_leaderboards"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_monthly_leaderboard"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_monthly_leaderboard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_monthly_leaderboard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_weekly_leaderboard"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_weekly_leaderboard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_weekly_leaderboard"() TO "service_role";
























GRANT ALL ON TABLE "public"."achievements" TO "anon";
GRANT ALL ON TABLE "public"."achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."achievements" TO "service_role";



GRANT ALL ON SEQUENCE "public"."achievements_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."achievements_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."achievements_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."activity_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."activity_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."activity_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT INSERT ON TABLE "public"."profiles" TO "authenticator";



GRANT ALL ON TABLE "public"."quiz_attempts" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."leaderboard" TO "anon";
GRANT ALL ON TABLE "public"."leaderboard" TO "authenticated";
GRANT ALL ON TABLE "public"."leaderboard" TO "service_role";



GRANT ALL ON TABLE "public"."leaderboards" TO "anon";
GRANT ALL ON TABLE "public"."leaderboards" TO "authenticated";
GRANT ALL ON TABLE "public"."leaderboards" TO "service_role";



GRANT ALL ON SEQUENCE "public"."leaderboards_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."leaderboards_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."leaderboards_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."options" TO "anon";
GRANT ALL ON TABLE "public"."options" TO "authenticated";
GRANT ALL ON TABLE "public"."options" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."permissions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."permissions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."permissions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."question_categories" TO "anon";
GRANT ALL ON TABLE "public"."question_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."question_categories" TO "service_role";



GRANT ALL ON TABLE "public"."question_comments" TO "anon";
GRANT ALL ON TABLE "public"."question_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."question_comments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."question_comments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."question_comments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."question_comments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_answers" TO "anon";
GRANT ALL ON TABLE "public"."user_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."user_answers" TO "service_role";



GRANT ALL ON TABLE "public"."question_stats" TO "anon";
GRANT ALL ON TABLE "public"."question_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."question_stats" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_modes" TO "anon";
GRANT ALL ON TABLE "public"."quiz_modes" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_modes" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."roles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."roles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."roles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_achievements" TO "anon";
GRANT ALL ON TABLE "public"."user_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_achievements" TO "service_role";



GRANT ALL ON TABLE "public"."user_category_performance" TO "anon";
GRANT ALL ON TABLE "public"."user_category_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."user_category_performance" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
