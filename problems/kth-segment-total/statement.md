A bakery has kept its takings for $n$ days in a row: on day $i$ it took $t_i$ coins, and it was never a day without a sale, so every $t_i$ is positive.

The accountant is fond of statistics. She looks at every **run** of consecutive days — from some day $l$ to some day $r \ge l$ — and writes down the run's total takings $t_l + t_{l+1} + \ldots + t_r$. That gives $n(n+1)/2$ totals, one per run, even when two runs have the same total. Then she sorts the list in increasing order.

What is the $k$-th number on her sorted list?

## Input

The first line contains two integers $n$ and $k$.

The second line contains $n$ integers $t_1, t_2, \ldots, t_n$.

## Output

Print one integer — the $k$-th smallest run total.

## Constraints

- $1 \le n \le 10^5$
- $1 \le k \le n(n+1)/2$
- $1 \le t_i \le 10^9$

Both $k$ and the answer can exceed $2^{31}$.
