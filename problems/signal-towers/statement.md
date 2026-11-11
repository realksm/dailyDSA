Along a straight coastal road stand $n$ radio towers, numbered $1$ to $n$ from west to east. Tower $i$ is $h_i$ metres tall.

Each tower relays its signal **eastwards** to the nearest tower that is strictly taller than itself. Shorter or equally tall towers in between don't block anything; they are simply skipped.

For every tower, find the tower it relays to.

## Input

The first line contains one integer $n$.

The second line contains $n$ integers $h_1, \ldots, h_n$ — the heights from west to east.

## Output

Print $n$ integers on one line, separated by spaces. The $i$-th is the number of the first tower east of tower $i$ that is strictly taller than tower $i$, or $0$ if there is none.

## Constraints

- $1 \le n \le 2 \cdot 10^5$
- $1 \le h_i \le 10^9$
