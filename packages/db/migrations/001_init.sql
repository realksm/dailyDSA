-- dailyDSA initial schema. Dates/weeks are IST (PLAN §1); the app computes the IST date
-- and stores plain DATEs, so the database never needs to know the timezone.

CREATE EXTENSION IF NOT EXISTS citext;

-- ───────────── accounts (PLAN §5) ─────────────
CREATE TYPE role AS ENUM ('admin', 'setter', 'solver');

CREATE TABLE users (
  id            serial PRIMARY KEY,
  email         citext NOT NULL UNIQUE,
  name          text   NOT NULL,
  password_hash text   NOT NULL,                -- argon2id
  role          role   NOT NULL DEFAULT 'solver',
  disabled      boolean NOT NULL DEFAULT false,
  invite_code   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE invite_codes (
  code       text PRIMARY KEY,
  max_uses   int  NOT NULL CHECK (max_uses > 0),
  uses       int  NOT NULL DEFAULT 0 CHECK (uses >= 0),
  expires_at timestamptz,
  disabled   boolean NOT NULL DEFAULT false,
  role       role NOT NULL DEFAULT 'solver',   -- lets the admin invite setters
  created_by int REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- connect-pg-simple's table layout
CREATE TABLE session (
  sid    varchar PRIMARY KEY,
  sess   json NOT NULL,
  expire timestamp(6) NOT NULL
);
CREATE INDEX session_expire_idx ON session (expire);

-- ───────────── patterns & problems (PLAN §2, §7) ─────────────
CREATE TABLE patterns (
  slug       text PRIMARY KEY,
  name       text NOT NULL,
  sort_order int  NOT NULL DEFAULT 0
);

CREATE TYPE problem_kind AS ENUM ('daily', 'track');
CREATE TYPE pool AS ENUM ('weekday', 'weekend');

CREATE TABLE problems (
  id            serial PRIMARY KEY,
  slug          text NOT NULL UNIQUE,           -- = folder name in problems/
  title         text NOT NULL,
  kind          problem_kind NOT NULL,
  pool          pool,                           -- daily only
  pattern_slug  text REFERENCES patterns(slug), -- hidden until solved/unlocked
  statement_md  text NOT NULL,
  input_spec    jsonb,                          -- editor template; NULL = generic template
  time_limits   jsonb NOT NULL,                 -- {"cpp":ms,"java":ms,"py":ms}, written by validation only
  memory_mb     int  NOT NULL DEFAULT 256,
  output_mb     int  NOT NULL DEFAULT 64,
  checker_py    text,                           -- NULL = whitespace-insensitive comparison
  sample_count  int  NOT NULL DEFAULT 1,
  test_count    int  NOT NULL,
  tests_hash    text NOT NULL,                  -- tests live on disk at <data>/tests/<slug>/<tests_hash>/
  validated_at  timestamptz NOT NULL,
  active        boolean NOT NULL DEFAULT true,  -- retired problems keep history but are never picked
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'daily') = (pool IS NOT NULL)),
  CHECK (kind = 'daily' AND pool = 'weekday' OR pattern_slug IS NOT NULL)  -- weekend & track need a pattern
);

-- Official reference solutions (pinned at the top of the Solutions tab).
CREATE TABLE problem_solutions (
  problem_id int  NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  lang       text NOT NULL CHECK (lang IN ('cpp', 'java', 'py')),
  code       text NOT NULL,
  PRIMARY KEY (problem_id, lang)
);

-- Progressive hints for track problems (PLAN §2): level 1..3.
CREATE TABLE problem_hints (
  problem_id int  NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  level      int  NOT NULL CHECK (level BETWEEN 1 AND 3),
  body_md    text NOT NULL,
  PRIMARY KEY (problem_id, level)
);

-- ───────────── tracks (PLAN §2) ─────────────
CREATE TABLE tracks (
  id           serial PRIMARY KEY,
  pattern_slug text NOT NULL UNIQUE REFERENCES patterns(slug),
  title        text NOT NULL,
  lesson_md    text NOT NULL DEFAULT '',        -- edited from the admin page
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE track_problems (
  track_id   int NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position   int NOT NULL CHECK (position BETWEEN 1 AND 5),  -- opens on Monday + (position-1) days
  problem_id int NOT NULL UNIQUE REFERENCES problems(id),
  PRIMARY KEY (track_id, position)
);

-- Which track runs which week. A track can run again later (repeat for newcomers).
CREATE TABLE track_weeks (
  week_start date PRIMARY KEY CHECK (extract(isodow FROM week_start) = 1),  -- a Monday (IST)
  track_id   int  NOT NULL REFERENCES tracks(id)
);

-- ───────────── daily problem (PLAN §1) ─────────────
-- One row per IST date, written once at rollover (or ahead of time by a pin), never recomputed.
CREATE TABLE daily_schedule (
  day        date PRIMARY KEY,
  problem_id int  NOT NULL REFERENCES problems(id),
  pinned_by  int  REFERENCES users(id),         -- NULL = automatic pick
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX daily_schedule_problem_idx ON daily_schedule (problem_id, day DESC);

-- ───────────── solving (PLAN §3, §4) ─────────────
CREATE TYPE submission_kind AS ENUM ('run', 'submit');
CREATE TYPE submission_status AS ENUM ('queued', 'running', 'done');

-- Also the judge queue: the single worker claims the oldest queued row with FOR UPDATE SKIP LOCKED.
CREATE TABLE submissions (
  id            bigserial PRIMARY KEY,
  user_id       int  NOT NULL REFERENCES users(id),
  problem_id    int  NOT NULL REFERENCES problems(id),
  lang          text NOT NULL CHECK (lang IN ('cpp', 'java', 'py')),
  code          text NOT NULL,
  kind          submission_kind NOT NULL,
  custom_input  text,                            -- Run only
  status        submission_status NOT NULL DEFAULT 'queued',
  verdict       text,                            -- AC/WA/TLE/MLE/OLE/RE/CE/IE once done
  result        jsonb,                           -- JudgeResult (packages/shared)
  max_cpu_ms    int,
  max_memory_kb int,
  created_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz
);
CREATE INDEX submissions_queue_idx ON submissions (id) WHERE status = 'queued';
CREATE INDEX submissions_user_idx ON submissions (user_id, created_at DESC);
-- Solutions tab: accepted submissions per problem.
CREATE INDEX submissions_accepted_idx ON submissions (problem_id, lang) WHERE kind = 'submit' AND verdict = 'AC';

-- Per-user, per-problem history: drives "solved", "solved after viewing solutions",
-- hints used, review banners ("you solved this 30 days ago") and track progress.
CREATE TABLE user_problems (
  user_id               int NOT NULL REFERENCES users(id),
  problem_id            int NOT NULL REFERENCES problems(id),
  first_attempt_at      timestamptz,             -- first non-CE submit: enables "Show solutions"
  solved_at             timestamptz,             -- first AC submit
  solved_verdict_lang   text,
  solutions_unlocked_at timestamptz,             -- via button (before solving) or by solving
  hints_used            int NOT NULL DEFAULT 0 CHECK (hints_used BETWEEN 0 AND 3),
  submit_count          int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, problem_id)
);
