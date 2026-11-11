A trekking group arrives at a long, narrow river bank to camp for the night. Along the bank there are $n$ flat spots where a tent can stand; spot $i$ is $x_i$ metres from the bridge. No two spots are at the same place.

The group has $k$ tents. Everyone snores, so they want the tents as far apart as possible: they choose $k$ of the spots and want the **smallest** distance between any two chosen spots to be as **large** as possible.

What is the largest possible smallest distance?

## Input

The first line contains two integers $n$ and $k$.

The second line contains $n$ distinct integers $x_1, x_2, \ldots, x_n$ — the positions of the spots, in no particular order.

## Output

Print one integer — the largest possible minimum distance between two of the $k$ tents.

## Constraints

- $2 \le k \le n \le 2 \cdot 10^5$
- $0 \le x_i \le 10^9$, all distinct
