An apple orchard is laid out as a grid of $R \times C$ squares. The square in row $i$ and column $j$ holds $t_{i,j}$ apple trees (possibly none).

The orchard's owner leases out rectangular plots and charges by the tree, so buyers keep asking: *"How many trees are in the plot from row $r_1$, column $c_1$ to row $r_2$, column $c_2$?"* (both corners included).

Answer all $q$ questions.

## Input

The first line contains two integers $R$ and $C$.

Each of the next $R$ lines contains $C$ integers — row $i$ holds $t_{i,1}, \ldots, t_{i,C}$.

The next line contains one integer $q$.

Each of the next $q$ lines contains four integers $r_1$, $c_1$, $r_2$, $c_2$ — one plot.

## Output

Print $q$ lines. The $k$-th line is the number of trees in the $k$-th plot.

## Constraints

- $1 \le R, C \le 500$
- $0 \le t_{i,j} \le 10^6$
- $1 \le q \le 10^5$
- $1 \le r_1 \le r_2 \le R$, $1 \le c_1 \le c_2 \le C$

An answer can exceed $2^{31}$.
