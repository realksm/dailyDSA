Kavya is planning a trek along a mountain trail with $n$ stretches between huts. Stretch $i$ is $\ell_i$ metres long, and the stretches must be walked in order.

She has $d$ days. Every day she walks one or more **consecutive** stretches and sleeps at the hut where she stops, so the trek splits the stretches into at most $d$ consecutive groups. (She may finish early and use fewer days.)

She wants the hardest day to be as easy as possible. What is the smallest possible length of the longest day?

## Input

The first line contains two integers $n$ and $d$.

The second line contains $n$ integers $\ell_1, \ldots, \ell_n$ — the lengths of the stretches in order.

## Output

Print one integer — the smallest possible length of the longest day, in metres.

## Constraints

- $1 \le d \le n \le 2 \cdot 10^5$
- $1 \le \ell_i \le 10^9$

The answer can exceed $2^{31}$.
