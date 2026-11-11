# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(54_000 + i)
MAXN = 200_000
V = 10**9


def emit(trips, w):
    n = len(w)
    assert 1 <= n <= MAXN and n <= trips <= 10**15
    assert all(1 <= x <= V for x in w)
    sys.stdout.write(f"{n} {trips}\n{' '.join(map(str, w))}\n")


def rand(n, hi):
    return [rnd.randint(1, hi) for _ in range(n)]


if i == 1:  # sample
    emit(7, [9, 4, 6, 2])
elif i == 2:  # sample: one trip per house → the largest need
    emit(3, [5, 8, 3])
elif i == 3:  # a single house, one trip
    emit(1, [V])
elif i == 4:  # plenty of trips → capacity 1
    w = rand(30, 100)
    emit(sum(w) + 5, w)
elif i <= 7:  # small random
    w = rand(rnd.randint(3, 40), 100)
    emit(rnd.randint(len(w), sum(w)), w)
elif i == 8:  # medium random
    w = rand(rnd.randint(3_000, 8_000), V)
    emit(rnd.randint(len(w), 10 * len(w)), w)
elif i == 9:  # max: one trip each → answer = max need ~1e9 (slow for trying C = 1, 2, ...)
    emit(MAXN, rand(MAXN, V))
elif i == 10:  # max: trips = 2n, huge needs
    emit(2 * MAXN, rand(MAXN, V))
elif i == 11:  # max: trips large, small capacity
    w = rand(MAXN, V)
    emit(sum(w) // 1000, w)
elif i == 12:  # max: all needs equal
    emit(3 * MAXN + 17, [V] * MAXN)
elif i == 13:  # max: one giant need among tiny ones
    w = rand(MAXN - 1, 10) + [V]
    emit(MAXN + 99, w)
else:  # max random
    emit(rnd.randint(MAXN, 50 * MAXN), rand(MAXN, V))
