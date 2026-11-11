During a drought, a village's $n$ houses get their water from a tanker. House $i$ needs $w_i$ litres for the day.

The tanker shuttles between the reservoir and the houses. On each trip it fills up at the reservoir (at most its capacity of $C$ litres), drives to **one** house and empties into that house's tank. A house that needs more than $C$ litres simply gets several trips, so house $i$ takes $\lceil w_i / C \rceil$ trips.

The driver can manage at most $T$ trips a day. The water board wants to hire the smallest tanker that is enough. What is the smallest integer capacity $C$ such that all houses get their water in at most $T$ trips?

## Input

The first line contains two integers $n$ and $T$.

The second line contains $n$ integers $w_1, w_2, \ldots, w_n$.

## Output

Print one integer — the smallest capacity $C$ that needs at most $T$ trips.

## Constraints

- $1 \le n \le 2 \cdot 10^5$
- $n \le T \le 10^{15}$
- $1 \le w_i \le 10^9$

The number of trips can exceed $2^{31}$ for small capacities.
