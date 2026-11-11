A farming co-op rents out its only combine harvester. From last season's records it knows what renting the machine out would have earned on each of the next $n$ days: $p_i$ rupees on day $i$. On some days $p_i$ is negative (rain, repairs, the cost of moving the machine).

A neighbouring farm wants the harvester for one block of **consecutive** days. The contract must last at least $L$ and at most $R$ days, and the co-op chooses the dates.

Find the largest total profit $p_l + p_{l+1} + \ldots + p_r$ over all blocks whose length $r - l + 1$ is between $L$ and $R$.

## Input

The first line contains three integers $n$, $L$ and $R$.

The second line contains $n$ integers $p_1, p_2, \ldots, p_n$.

## Output

Print one integer — the largest total over all allowed blocks. It may be negative.

## Constraints

- $1 \le L \le R \le n \le 2 \cdot 10^5$
- $-10^9 \le p_i \le 10^9$

The answer can exceed $2^{31}$ in absolute value.
