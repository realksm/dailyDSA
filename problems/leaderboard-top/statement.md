A pinball machine keeps a leaderboard that only ever shows the **$k$ best scores** played on it so far. The games of the day finish one after another, and the $i$-th game ends with score $a_i$.

After each game the screen also shows the **total** of the scores on the leaderboard: the sum of the $k$ highest scores among the games so far. While fewer than $k$ games have been played, every score is on the board.

For example, with $k = 2$ and the scores $4, 9, 1, 6$, the totals are $4$, $13$, $13$ and $15$.

Print the total shown after every game.

## Input

The first line contains two integers $n$ and $k$ — the number of games and the size of the leaderboard.

The second line contains $n$ integers $a_1, \ldots, a_n$ — the scores, in the order the games end.

## Output

Print $n$ integers on one line, separated by spaces. The $i$-th is the total shown after game $i$. Totals can exceed $2^{31}$, so use 64-bit integers.

## Constraints

- $1 \le k \le n \le 2 \cdot 10^5$
- $0 \le a_i \le 10^9$; scores may repeat (equal scores are separate entries on the board)
