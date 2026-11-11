The door of a research lab logs every badge scan. The log is a list of $n$ badge numbers $b_1, b_2, \ldots, b_n$ in the order they were scanned.

The security team suspects that badges were being passed around, which shows up as the same badge being scanned many times in a short period. To calibrate their alarm, they want to know the longest stretch of **consecutive** scans in which no badge appears more than $k$ times.

Find the length of that stretch.

## Input

The first line contains two integers $n$ and $k$.

The second line contains $n$ integers $b_1, b_2, \ldots, b_n$ — the badge numbers in scan order.

## Output

Print one integer — the largest number of consecutive scans in which every badge number appears at most $k$ times.

## Constraints

- $1 \le k \le n \le 2 \cdot 10^5$
- $1 \le b_i \le 10^9$
