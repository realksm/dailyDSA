-- The 8 starting patterns (PLAN §2). Slugs match STARTING_PATTERNS in packages/shared.
INSERT INTO patterns (slug, name, sort_order) VALUES
  ('two-pointers',         'Two pointers',                1),
  ('sliding-window',       'Sliding window',              2),
  ('prefix-sums',          'Prefix sums',                 3),
  ('binary-search-answer', 'Binary search on the answer', 4),
  ('monotonic-stack',      'Monotonic stack',             5),
  ('bfs-dfs',              'BFS / DFS',                   6),
  ('dp-1d',                'Simple 1D DP',                7),
  ('heaps-top-k',          'Heaps / top-k',               8);
