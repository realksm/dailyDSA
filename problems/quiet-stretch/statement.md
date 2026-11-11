The reading room of the city library has a noise sensor that logs one reading per minute: during minute $i$ the level was $a_i$.

The librarian wants to book a study session of exactly $k$ **consecutive** minutes from the log's period for next week, at the time of day that was quietest. The noise of a session is the sum of its readings.

Find the smallest total noise of any $k$ consecutive minutes.

## Input

The first line contains two integers $n$ and $k$ — the number of readings and the session length.

The second line contains $n$ integers $a_1, a_2, \ldots, a_n$ — the readings in order.

## Output

Print one integer — the smallest sum of $k$ consecutive readings.

## Constraints

- $1 \le k \le n \le 2 \cdot 10^5$
- $0 \le a_i \le 10^9$

The answer can exceed $2^{31}$.
