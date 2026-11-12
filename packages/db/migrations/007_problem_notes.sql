-- Private notes per problem ("what gave it away"), written on the problem page after solving it and
-- shown back on History and its pattern map. Only the member who wrote one ever sees it.
ALTER TABLE user_problems
  ADD COLUMN note            text CHECK (char_length(note) <= 2000),
  ADD COLUMN note_updated_at timestamptz;
