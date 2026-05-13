-- Study Hall (May 2026, migration 021).
--
-- WHY: Reading a Library article once doesn't make it stick. Study Hall
-- is the loop that closes the learning gap — Chef Jennifer quizzes the
-- user on what they just read, gives immediate feedback, and the result
-- accrues in My Playbook over time. This turns the Library from a
-- one-and-done brochure into recurring content.
--
-- TWO TABLES:
--
-- 1. study_quizzes — cache of Chef Jennifer's generated questions per
--    article. One quiz per article (UNIQUE on article_id). First user
--    to take a quiz triggers generation; everyone after reads from
--    cache. Stable across users so two cooks who took the same article
--    see the same questions (good for word-of-mouth: "did you get the
--    butter question?").
--
--    questions jsonb shape:
--    [
--      {
--        "question": "What temperature does butter brown at?",
--        "options": ["210°F", "260°F", "320°F", "390°F"],
--        "correct": 2,                  // 0-indexed
--        "explanation": "320°F is when the milk solids start to color."
--      },
--      ...
--    ]
--
-- 2. study_hall_results — every completed quiz attempt by a user.
--    Lands in My Playbook as a "Lessons Learned" entry. Accumulates
--    history so the user can see their study record.
--
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS study_quizzes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id      uuid NOT NULL UNIQUE REFERENCES recipe_articles(id) ON DELETE CASCADE,
  questions       jsonb NOT NULL,
  created_at      timestamptz DEFAULT now()
);

-- Study Hall results are user-scoped — every attempt is a row, so
-- a user can take the same quiz twice (e.g. a week apart) and see
-- both attempts in their Playbook history.
CREATE TABLE IF NOT EXISTS study_hall_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id      uuid NOT NULL REFERENCES recipe_articles(id) ON DELETE CASCADE,
  article_title   text NOT NULL,
  score           int  NOT NULL,
  total           int  NOT NULL,
  taken_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_hall_results_user
  ON study_hall_results (user_id, taken_at DESC);

-- RLS — study_quizzes is read-by-anyone (the cache is shared across
-- users), writes go through the service role only (via the API route).
-- study_hall_results is owner-scoped.
ALTER TABLE study_quizzes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_hall_results   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can read study_quizzes" ON study_quizzes;
CREATE POLICY "anyone can read study_quizzes"
  ON study_quizzes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "owners can read their results" ON study_hall_results;
CREATE POLICY "owners can read their results"
  ON study_hall_results FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "owners can insert their results" ON study_hall_results;
CREATE POLICY "owners can insert their results"
  ON study_hall_results FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
