# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(57_000 + i)
MAXN = 100_000
V = 10**9


def emit(k, a, b):
    n, m = len(a), len(b)
    assert 1 <= n <= MAXN and 1 <= m <= MAXN and 1 <= k <= n * m
    assert all(1 <= x <= V for x in a) and all(1 <= x <= V for x in b)
    sys.stdout.write(f"{n} {m} {k}\n{' '.join(map(str, a))}\n{' '.join(map(str, b))}\n")


def rand(n, hi):
    return [rnd.randint(1, hi) for _ in range(n)]


if i == 1:  # sample: 3 5 6 6 8 9 → the 4th is 6
    emit(4, [3, 1, 4], [2, 5])
elif i == 2:  # sample: one main, the last combo
    emit(3, [7], [1, 4, 1])
elif i == 3:  # one main, one drink, both at the maximum
    emit(1, [V], [V])
elif i == 4:  # all prices equal
    emit(500, [10] * 40, [20] * 30)
elif i <= 7:  # small random
    a, b = rand(rnd.randint(1, 30), 50), rand(rnd.randint(1, 30), 50)
    emit(rnd.randint(1, len(a) * len(b)), a, b)
elif i == 8:  # medium random, small k
    a, b = rand(rnd.randint(2_000, 5_000), V), rand(rnd.randint(2_000, 5_000), V)
    emit(rnd.randint(1, 5_000), a, b)
elif i == 9:  # max: the very last combo (k = n * m, slow for popping k times)
    emit(MAXN * MAXN, rand(MAXN, V), rand(MAXN, V))
elif i == 10:  # max: the middle combo
    emit(MAXN * MAXN // 2, rand(MAXN, V), rand(MAXN, V))
elif i == 11:  # max: the cheapest combo
    emit(1, rand(MAXN, V), rand(MAXN, V))
elif i == 12:  # max: many repeated prices
    emit(rnd.randint(1, MAXN * MAXN), rand(MAXN, 100), rand(MAXN, 100))
elif i == 13:  # max: lopsided — few mains, many drinks
    a, b = rand(7, V), rand(MAXN, V)
    emit(rnd.randint(1, len(a) * len(b)), a, b)
else:  # max random
    emit(rnd.randint(1, MAXN * MAXN), rand(MAXN, V), rand(MAXN, V))
