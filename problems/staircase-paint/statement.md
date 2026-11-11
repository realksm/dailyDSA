A sculptor is building a wall of $n$ columns of stacked tiles, numbered $1$ to $n$ from left to right. At the start every column has height $0$.

Her plan is a list of $q$ *staircase* steps. Step $(l, r, v)$ adds $v$ tiles to column $l$, $2v$ tiles to column $l + 1$, $3v$ to column $l + 2$, and so on, up to $(r - l + 1) \cdot v$ tiles on column $r$. Columns outside $[l, r]$ are not touched.

For example, on $n = 5$ columns the step $(2, 4, 3)$ turns heights $0\,0\,0\,0\,0$ into $0\,3\,6\,9\,0$.

Find the height of every column after all steps.

## Input

The first line contains two integers $n$ and $q$.

Each of the next $q$ lines contains three integers $l$, $r$ and $v$ — one step.

## Output

Print $n$ integers on one line, separated by spaces: the final heights of columns $1, 2, \ldots, n$.

## Constraints

- $1 \le n, q \le 2 \cdot 10^5$
- $1 \le l \le r \le n$
- $1 \le v \le 10^4$

Heights can exceed $2^{31}$.
