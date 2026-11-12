-- The weekly recap (apps/server/src/recap.ts): on Monday, last week's track, the group's solve rate and
-- your strongest / weakest pattern, on Today and in one email at 08:00 IST. On by default; switched off
-- on the Account page.
ALTER TABLE users ADD COLUMN weekly_recap boolean NOT NULL DEFAULT true;

-- One row per member and recapped week (its Monday), so a restart never sends it twice.
CREATE TABLE weekly_recaps (
  user_id    int  NOT NULL REFERENCES users(id),
  week_start date NOT NULL,
  sent_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start)
);
