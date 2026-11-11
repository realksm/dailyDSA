A hospital keeps a record of how many hours one of its nurses worked on each of the last $n$ days: $h_i$ hours on day $i$. A day is *heavy* if she worked more than $L$ hours, and *light* otherwise.

The staff council is preparing a complaint about overwork and wants its strongest example: the longest stretch of **consecutive** days in which the heavy days strictly outnumber the light days.

Find the length of that stretch, or $0$ if there is none.

## Input

The first line contains two integers $n$ and $L$.

The second line contains $n$ integers $h_1, h_2, \ldots, h_n$.

## Output

Print one integer — the largest number of consecutive days with more heavy days than light days.

## Constraints

- $1 \le n \le 2 \cdot 10^5$
- $0 \le L \le 24$
- $0 \le h_i \le 24$
