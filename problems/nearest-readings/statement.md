Two weather balloons were launched from the same field. Each one records the air temperature now and then, and the engineers want to check that their sensors agree.

Balloon A logged $n$ readings $a_1, \ldots, a_n$ and balloon B logged $m$ readings $b_1, \ldots, b_m$, in no particular order. To compare the sensors, the engineers want the pair of readings — one from each balloon — that are **closest to each other**.

Find the smallest value of $|a_i - b_j|$ over all $1 \le i \le n$ and $1 \le j \le m$.

## Input

The first line contains two integers $n$ and $m$.

The second line contains $n$ integers $a_1, \ldots, a_n$ — balloon A's readings.

The third line contains $m$ integers $b_1, \ldots, b_m$ — balloon B's readings.

## Output

Print one integer — the smallest difference.

## Constraints

- $1 \le n, m \le 2 \cdot 10^5$
- $-10^9 \le a_i, b_j \le 10^9$

The answer can exceed $2^{31}$.
