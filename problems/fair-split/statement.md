A warehouse has $n$ crates waiting on a conveyor belt, in a fixed order. Crate $i$ weighs $w_i$ kilograms.

Two trucks are loaded straight from the belt: the first crates go onto truck A until the foreman says stop, and all the remaining crates go onto truck B. Each truck must get at least one crate.

The foreman wants the trucks' loads to be as close as possible. If truck A gets crates $1..i$, the imbalance is
$$\left| (w_1 + \ldots + w_i) - (w_{i+1} + \ldots + w_n) \right|.$$

Find the smallest possible imbalance.

## Input

The first line contains one integer $n$.

The second line contains $n$ integers $w_1, w_2, \ldots, w_n$ — the weights in belt order.

## Output

Print one integer — the smallest imbalance over all $n - 1$ ways to split.

## Constraints

- $2 \le n \le 2 \cdot 10^5$
- $1 \le w_i \le 10^9$

The totals can exceed $2^{31}$.
