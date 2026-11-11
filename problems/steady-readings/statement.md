A greenhouse controller logs $n$ temperature readings $t_1, t_2, \ldots, t_n$, one per minute.

A stretch of **consecutive** readings is *steady* if its highest and lowest readings differ by at most $D$. A single reading is always steady.

To judge how stable the climate system is, the gardener wants the number of steady stretches: count the pairs $(l, r)$ with $1 \le l \le r \le n$ such that
$$\max(t_l, \ldots, t_r) - \min(t_l, \ldots, t_r) \le D.$$

## Input

The first line contains two integers $n$ and $D$.

The second line contains $n$ integers $t_1, t_2, \ldots, t_n$ — the readings in order.

## Output

Print one integer — the number of steady stretches.

## Constraints

- $1 \le n \le 2 \cdot 10^5$
- $0 \le D \le 10^9$
- $0 \le t_i \le 10^9$

The answer can exceed $2^{31}$.
