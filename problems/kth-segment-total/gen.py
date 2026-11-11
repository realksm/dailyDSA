# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(60_000 + i)
MAXN = 100_000
V = 10**9


def emit(k, t):
    n = len(t)
    assert 1 <= n <= MAXN and 1 <= k <= n * (n + 1) // 2
    assert all(1 <= x <= V for x in t)
    sys.stdout.write(f"{n} {k}\n{' '.join(map(str, t))}\n")


def rand(n, hi):
    return [rnd.randint(1, hi) for _ in range(n)]


if i == 1:  # sample: totals 1 2 2 3 3 4 4 5 6 8 → the 5th is 3
    emit(5, [3, 1, 2, 2])
elif i == 2:  # sample: the largest total is the whole range
    emit(6, [4, 4, 4])
elif i == 3:  # one day
    emit(1, [V])
elif i == 4:  # all equal, middle k
    emit(30 * 31 // 4, [7] * 30)
elif i <= 7:  # small random
    n = rnd.randint(2, 40)
    emit(rnd.randint(1, n * (n + 1) // 2), rand(n, rnd.choice([3, 1000])))
elif i == 8:  # medium random, small k
    emit(rnd.randint(1, 20_000), rand(rnd.randint(3_000, 8_000), V))
elif i == 9:  # max: the last run (the whole range, ~1e14; slow for popping k times)
    emit(MAXN * (MAXN + 1) // 2, rand(MAXN, V))
elif i == 10:  # max: the middle run
    emit(MAXN * (MAXN + 1) // 4, rand(MAXN, V))
elif i == 11:  # max: the smallest run total
    emit(1, rand(MAXN, V))
elif i == 12:  # max: all ones → many equal totals
    emit(rnd.randint(1, MAXN * (MAXN + 1) // 2), [1] * MAXN)
elif i == 13:  # max: small takings, huge k
    emit(MAXN * (MAXN + 1) // 2 - rnd.randint(0, 1000), rand(MAXN, 5))
else:  # max random
    emit(rnd.randint(1, MAXN * (MAXN + 1) // 2), rand(MAXN, V))
