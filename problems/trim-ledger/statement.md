A small theatre company sold tickets on $n$ evenings and wrote the takings into a ledger: $a_i$ rupees on evening $i$. The company has $p$ members and wants to pay out the season's takings in equal shares, so the total must be divisible by $p$.

It isn't, so the treasurer will move one block of **consecutive** evenings to next season's books. To keep the paperwork small, the block should be as short as possible. The block may be empty (if the total is already divisible), but it may not be the whole ledger.

Find the length of the shortest block of consecutive evenings whose removal leaves a total divisible by $p$, or $-1$ if no allowed block works.

## Input

The first line contains two integers $n$ and $p$.

The second line contains $n$ integers $a_1, a_2, \ldots, a_n$.

## Output

Print one integer — the length of the shortest block to remove, $0$ if nothing needs to be removed, or $-1$ if it is impossible.

## Constraints

- $1 \le n \le 2 \cdot 10^5$
- $1 \le p \le 10^9$
- $1 \le a_i \le 10^9$

The total can exceed $2^{31}$.
