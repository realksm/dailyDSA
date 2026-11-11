A fishing co-op of $m$ families keeps a ledger of its daily net result: on day $i$ the co-op's cash changed by $c_i$ rupees. On good days $c_i$ is positive, on days with repairs it is negative.

At the end of the season the families want to look back at stretches of **consecutive** days whose net result could have been split evenly among all $m$ families, with nothing left over and nobody owing anything. A stretch from day $l$ to day $r$ qualifies when
$$c_l + c_{l+1} + \ldots + c_r$$
is divisible by $m$ (a net result of $0$ counts, as does a negative multiple of $m$).

Count the qualifying stretches, that is the pairs $(l, r)$ with $1 \le l \le r \le n$.

## Input

The first line contains two integers $n$ and $m$.

The second line contains $n$ integers $c_1, c_2, \ldots, c_n$.

## Output

Print one integer — the number of stretches whose total is divisible by $m$.

## Constraints

- $1 \le n \le 2 \cdot 10^5$
- $1 \le m \le 10^9$
- $-10^9 \le c_i \le 10^9$

The answer can exceed $2^{31}$.
