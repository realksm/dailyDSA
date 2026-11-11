A lab logs $n$ sensor readings $a_1, a_2, \ldots, a_n$, in the order they were taken. During calibration, the engineers need two readings that differ by **exactly** $K$.

Find two different positions $i \ne j$ such that

$$a_j - a_i = K.$$

## Input

The first line contains two integers $n$ and $K$.

The second line contains $n$ integers $a_1, a_2, \ldots, a_n$.

## Output

If such positions exist, print two integers $i$ and $j$ (1-based) with $i \ne j$ and $a_j - a_i = K$. If there are several answers, print any of them.

Otherwise, print `-1`.

## Constraints

- $2 \le n \le 2 \cdot 10^5$
- $0 \le K \le 10^9$
- $-10^9 \le a_i \le 10^9$

Note that $i$ does not have to be smaller than $j$, and that for $K = 0$ you need two *different* positions holding the same value.
