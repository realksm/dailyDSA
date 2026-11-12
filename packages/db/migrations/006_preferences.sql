-- Account preferences (Account page, GET/PUT /api/me/settings), saved on the server so they follow the
-- member to every browser. NULL = not chosen: the editor opens in the last language used here, at 14 px.
ALTER TABLE users
  ADD COLUMN default_lang     text     CHECK (default_lang IN ('cpp', 'java', 'py')),
  ADD COLUMN editor_font_size smallint CHECK (editor_font_size BETWEEN 11 AND 22),
  ADD COLUMN theme            text     CHECK (theme IN ('auto', 'light', 'dark'));  -- NULL: never chosen, the browser's choice stands
