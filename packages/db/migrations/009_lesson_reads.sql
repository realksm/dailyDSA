-- When a member first opened a track's lesson (POST /api/tracks/:pattern/lesson-read, sent by the
-- lesson page). Today and the Tracks library use it to say "read the lesson first" only until then.
CREATE TABLE lesson_reads (
  user_id  int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id int NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  read_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, track_id)
);
