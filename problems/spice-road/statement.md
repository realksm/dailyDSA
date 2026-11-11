The old spice road through town is lined with $n$ market stalls in a row, numbered $1$ to $n$. Stall $i$ sells exactly one kind of spice, $s_i$. There are $K$ kinds of spice, numbered $1$ to $K$, and every kind is sold by at least one stall.

A cook needs one of every kind for a new curry blend. She will walk past a block of **consecutive** stalls and buy from them, and she wants that block to be as short as possible.

Find the smallest number of consecutive stalls that together sell all $K$ kinds.

## Input

The first line contains two integers $n$ and $K$.

The second line contains $n$ integers $s_1, s_2, \ldots, s_n$ — the kind of spice each stall sells.

## Output

Print one integer — the length of the shortest block of consecutive stalls that sells every kind.

## Constraints

- $1 \le K \le n \le 2 \cdot 10^5$
- $1 \le s_i \le K$
- every kind from $1$ to $K$ appears at least once
