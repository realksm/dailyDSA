-- Streak-saver email (apps/server/src/reminders.ts): at 21:00 IST, members with a streak who haven't
-- solved today's daily get one reminder. On by default; switched off on the Account page.
ALTER TABLE users ADD COLUMN remind_streak boolean NOT NULL DEFAULT true;

-- One row per member and IST day a reminder went out, so a restart never sends it twice.
CREATE TABLE streak_reminders (
  user_id int  NOT NULL REFERENCES users(id),
  day     date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
