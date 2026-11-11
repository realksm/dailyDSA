A small factory has $m$ machines that all make the same widget. Machine $i$ needs exactly $s_i$ seconds per widget, and it makes them one after another without pause, so after $T$ seconds it has finished $\lfloor T / s_i \rfloor$ widgets. All machines start at time $0$ and work at the same time.

A customer has ordered $G$ widgets. What is the earliest whole number of seconds $T$ after which the machines have finished at least $G$ widgets together?

## Input

The first line contains two integers $m$ and $G$.

The second line contains $m$ integers $s_1, s_2, \ldots, s_m$.

## Output

Print one integer — the smallest $T$ with $\lfloor T/s_1 \rfloor + \ldots + \lfloor T/s_m \rfloor \ge G$.

## Constraints

- $1 \le m \le 2 \cdot 10^5$
- $1 \le G \le 10^9$
- $1 \le s_i \le 10^9$

The answer can be as large as $10^{18}$.
