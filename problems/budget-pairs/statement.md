The campus electronics club is ordering gadgets for a workshop. The shop lists $n$ gadgets; gadget $i$ costs $p_i$ rupees.

The club wants to buy exactly **two different gadgets**, and together they must cost at most $B$ rupees. Before deciding, the treasurer wants to know how many choices there are.

Count the pairs of indices $(i, j)$ with $i < j$ such that $p_i + p_j \le B$.

## Input

The first line contains two integers $n$ and $B$ — the number of gadgets and the budget.

The second line contains $n$ integers $p_1, p_2, \ldots, p_n$ — the prices.

## Output

Print one integer — the number of valid pairs.

## Constraints

- $1 \le n \le 2 \cdot 10^5$
- $1 \le p_i \le 10^9$
- $1 \le B \le 2 \cdot 10^9$

Two gadgets with the same price are still different gadgets. The answer can exceed $2^{31}$.
