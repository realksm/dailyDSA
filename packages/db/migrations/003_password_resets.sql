-- Password reset by email. Only a SHA-256 of the emailed token is stored, so a leaked
-- database (or backup) can't be used to reset anyone's password.
CREATE TABLE password_resets (
  token_hash text PRIMARY KEY,                    -- hex sha256 of the token in the link
  user_id    int  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX password_resets_user_idx ON password_resets (user_id, created_at DESC);

-- Lets "log out everywhere" (after a password change/reset) find a user's sessions.
CREATE INDEX session_user_idx ON session (((sess ->> 'userId')::int));
