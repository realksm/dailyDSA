A warehouse keeps $n$ stacks of crates in a single row. Stack $i$ weighs $a_i$ kilograms.

Before a building inspection, the row has to look **balanced**: the weights must read the same from left to right as from right to left. For example, stacks weighing $5, 2, 5$ are balanced, but $5, 2, 3$ are not.

The only thing the forklift can do is **merge** two neighbouring stacks: it puts one on top of the other, and the new stack takes their place in the row, weighing their sum. For example, merging the middle two stacks of $4, 1, 3, 4$ gives $4, 4, 4$.

What is the smallest number of merges that makes the row balanced? (A single stack is always balanced.)

## Input

The first line contains one integer $n$.

The second line contains $n$ integers $a_1, \ldots, a_n$ — the weights of the stacks from left to right.

## Output

Print one integer — the smallest number of merges.

## Constraints

- $1 \le n \le 2 \cdot 10^5$
- $1 \le a_i \le 10^9$
