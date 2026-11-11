A weather station has recorded one reading per day for $n$ days: $r_1, r_2, \ldots, r_n$. For a press release, the station wants to quote a **stretch** of at least $k$ consecutive days and its median reading, and it would like that median to be as high as possible.

The median of a stretch of $L$ days is found by sorting its $L$ readings in increasing order and taking the one at position $\lceil L/2 \rceil$ (counting from 1). So for an even $L$ it is the lower of the two middle readings: the median of $5, 1, 9, 3$ is $3$.

What is the largest median over all stretches of at least $k$ consecutive days?

## Input

The first line contains two integers $n$ and $k$.

The second line contains $n$ integers $r_1, r_2, \ldots, r_n$.

## Output

Print one integer — the largest median of a stretch of at least $k$ consecutive days.

## Constraints

- $1 \le k \le n \le 2 \cdot 10^5$
- $1 \le r_i \le 10^9$

Readings may repeat.
