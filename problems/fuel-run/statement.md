A delivery van follows a fixed route of $n$ legs, always in the same order. Leg $i$ burns $f_i$ litres of fuel.

Next week the fuel station on the route is closed, so the van will drive on a single tank of $T$ litres. The dispatcher may start the van at the beginning of any leg, and it then drives the following legs in order until the fuel runs out. A leg can only be driven if the fuel left covers all of it.

What is the largest number of **consecutive** legs the van can drive on one tank?

## Input

The first line contains two integers $n$ and $T$ — the number of legs and the tank size.

The second line contains $n$ integers $f_1, f_2, \ldots, f_n$ — the fuel each leg burns, in route order.

## Output

Print one integer — the maximum number of consecutive legs whose total fuel is at most $T$, or $0$ if no single leg fits.

## Constraints

- $1 \le n \le 2 \cdot 10^5$
- $1 \le f_i \le 10^9$
- $1 \le T \le 10^{15}$

$T$ and the fuel totals can exceed $2^{31}$.
