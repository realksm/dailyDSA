-- Hints (PLAN §2): when a solver took their first and latest hint on a problem. "Solved with
-- hints" = the first hint came before the first accepted submit, the same way "solved after viewing
-- solutions" compares solutions_unlocked_at with solved_at. The latest one counts as activity in history.
ALTER TABLE user_problems
  ADD COLUMN first_hint_at timestamptz,
  ADD COLUMN last_hint_at  timestamptz;
