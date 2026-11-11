A street café sells $n$ main dishes and $m$ drinks. Main $i$ costs $a_i$ and drink $j$ costs $b_j$. Its lunch deal is a **combo**: any one main plus any one drink, for $a_i + b_j$.

The owner wants to print a menu card that lists all $n \cdot m$ combos, cheapest first. Combos with the same price are all listed (so a price can appear several times). The card is far too long to write out, but the owner wants to know one thing: what is the price of the $k$-th combo on the card?

## Input

The first line contains three integers $n$, $m$ and $k$.

The second line contains $n$ integers $a_1, \ldots, a_n$ — the prices of the mains.

The third line contains $m$ integers $b_1, \ldots, b_m$ — the prices of the drinks.

## Output

Print one integer — the $k$-th smallest of the $n \cdot m$ sums $a_i + b_j$.

## Constraints

- $1 \le n, m \le 10^5$
- $1 \le k \le n \cdot m$
- $1 \le a_i, b_j \le 10^9$

$k$ can exceed $2^{31}$. Prices may repeat.
