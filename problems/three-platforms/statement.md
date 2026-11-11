A courier company moves parcels through a junction where three railway lines meet. To combine three parcels into one delivery, a courier meets **one train from each line** at the junction, waiting from the first of the three arrivals until the last one.

Today's timetables are known: trains of line A arrive at minutes $a_1, \ldots, a_{n_a}$, trains of line B at minutes $b_1, \ldots, b_{n_b}$, and trains of line C at minutes $c_1, \ldots, c_{n_c}$. The lists are not sorted.

Choose one train from each line so that the courier's wait — the time between the earliest and the latest of the three arrivals — is as short as possible. Print that wait:

$$\min_{i, j, k} \Big( \max(a_i, b_j, c_k) - \min(a_i, b_j, c_k) \Big).$$

## Input

The first line contains three integers $n_a$, $n_b$ and $n_c$.

The next three lines contain the arrival times of lines A, B and C, in that order.

## Output

Print one integer — the shortest possible wait.

## Constraints

- $1 \le n_a, n_b, n_c \le 2 \cdot 10^5$
- $0 \le a_i, b_j, c_k \le 10^{12}$

Several trains (even of different lines) may arrive at the same minute.
