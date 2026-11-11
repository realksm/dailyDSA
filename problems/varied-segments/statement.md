A community radio station has a playlist of $n$ songs that it plays in order. Song $i$ belongs to genre $g_i$.

The station sells advertising slots that interrupt a **consecutive** segment of songs, and advertisers pay most for segments with a pleasant variety: not too repetitive, not too chaotic. A segment is *varied* if the number of **different** genres in it is at least $A$ and at most $B$.

Count the varied segments, that is the pairs $(l, r)$ with $1 \le l \le r \le n$ such that $g_l, \ldots, g_r$ contains between $A$ and $B$ distinct values, inclusive.

## Input

The first line contains three integers $n$, $A$ and $B$.

The second line contains $n$ integers $g_1, g_2, \ldots, g_n$ — the genres in playlist order.

## Output

Print one integer — the number of varied segments.

## Constraints

- $1 \le n \le 2 \cdot 10^5$
- $1 \le A \le B \le n$
- $1 \le g_i \le 10^9$

The answer can exceed $2^{31}$.
