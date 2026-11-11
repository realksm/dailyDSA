Mira runs a small weather station and writes the rainfall for every day into a ledger: on day $i$ it rained $a_i$ millimetres.

Farmers from the valley keep asking her the same kind of question: *"How much rain fell from day $l$ to day $r$, inclusive?"*

Answer all of their questions.

## Input

The first line contains two integers $n$ and $q$ — the number of days in the ledger and the number of questions.

The second line contains $n$ integers $a_1, a_2, \ldots, a_n$ — the rainfall on each day.

Each of the next $q$ lines contains two integers $l$ and $r$ — one question.

## Output

Print $q$ lines. The $k$-th line is the total rainfall from day $l$ to day $r$ for the $k$-th question.

## Constraints

- $1 \le n, q \le 2 \cdot 10^5$
- $0 \le a_i \le 10^9$
- $1 \le l \le r \le n$

Note that an answer can exceed $2^{31}$.
