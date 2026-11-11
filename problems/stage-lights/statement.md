The school theatre has a row of $n$ stage lamps, numbered $1$ to $n$. Before the show every lamp is at brightness $0$.

The lighting script is a list of $q$ commands. Command $(l, r, v)$ changes the brightness of every lamp from $l$ to $r$ by $v$ (a negative $v$ dims them). Brightness may go below zero in this simplified model.

The stage manager wants to know where every lamp ends up after the whole script has run.

## Input

The first line contains two integers $n$ and $q$.

Each of the next $q$ lines contains three integers $l$, $r$ and $v$ — one command.

## Output

Print $n$ integers on one line, separated by spaces: the final brightness of lamps $1, 2, \ldots, n$.

## Constraints

- $1 \le n, q \le 2 \cdot 10^5$
- $1 \le l \le r \le n$
- $-10^9 \le v \le 10^9$

The brightness can exceed $2^{31}$ in absolute value.
