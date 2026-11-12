A river is crossed by a straight line of $n$ spots, numbered $1$ to $n$ from the near bank. Spot $i$ is either a stepping stone (`o`) or open water (`~`). The near bank is spot $0$, and everything past spot $n$ is the far bank.

You start on the near bank and only ever jump forwards. Each jump has one of $m$ allowed **strides** $d_1, \ldots, d_m$: from spot $p$ a jump of stride $d$ lands on spot $p + d$. A jump may land on a stone, never in the water. A jump that goes past spot $n$ lands on the far bank, and the crossing ends there.

Two crossings are different if their sequences of strides are different. For example, with strides $1$ and $2$ and the river `o~oo`, there are three crossings: $1, 2, 2$ (the last jump lands on the bank) and $1, 2, 1, 1$ and $1, 2, 1, 2$.

Count the different crossings. The count can be huge, so print it modulo $10^9 + 7$.

## Input

The first line contains two integers $n$ and $m$.

The second line contains $m$ distinct integers $d_1, \ldots, d_m$ — the allowed strides.

The third line contains a string $s$ of length $n$ made of the characters `o` and `~`. Its $i$-th character describes spot $i$.

## Output

Print the number of different crossings modulo $10^9 + 7$. Print $0$ if the far bank can't be reached.

## Constraints

- $1 \le n \le 10^5$
- $1 \le m \le 10$
- $1 \le d_j \le 2 \cdot 10^5$, all different
