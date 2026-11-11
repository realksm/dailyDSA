# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(53_000 + i)
MAXN = 200_000
V = 10**9


def emit(p, a):
    n = len(a)
    assert 1 <= n <= MAXN and 1 <= p <= 10**9
    assert all(1 <= x <= V for x in a)
    sys.stdout.write(f"{n} {p}\n{' '.join(map(str, a))}\n")


def rand(n, hi):
    return [rnd.randint(1, hi) for _ in range(n)]


if i == 1:  # sample
    emit(7, [3, 1, 4, 2, 2])
elif i == 2:  # sample: only the whole ledger would work
    emit(10, [1, 2, 3])
elif i == 3:  # already divisible
    emit(5, [5, 10, 15])
elif i == 4:  # p = 1
    emit(1, rand(20, 100))
elif i == 5:  # a single evening, not divisible
    emit(4, [6])
elif i <= 8:  # small random
    emit(rnd.randint(2, 15), rand(rnd.randint(3, 40), 30))
elif i == 9:  # medium random
    emit(rnd.randint(1000, 10**6), rand(rnd.randint(3_000, 8_000), V))
elif i == 10:  # max: multiples of p except both ends: only the whole ledger works → -1
    p = 1000
    a = [rnd.randint(1, 10**6) * p for _ in range(MAXN)]
    a[0] += 1
    a[-1] += 1
    emit(p, a)
elif i == 11:  # max: everything divisible except one big block that must go
    p = 999_983
    a = [p] * MAXN
    for j in range(60_000, 140_000):
        a[j] = 1
    # the 80 000 ones sum to 80 000 < p, so they all have to go (or a block covering them)
    emit(p, a)
elif i == 12:  # max: large p
    emit(999_999_937, rand(MAXN, V))
elif i == 13:  # max: p = 2, odd total
    a = rand(MAXN, V)
    if sum(a) % 2 == 0:
        a[rnd.randrange(MAXN)] |= 1
        if sum(a) % 2 == 0:
            a[0] = a[0] + 1 if a[0] < V else a[0] - 1
    emit(2, a)
elif i == 14:  # max: all ones, p = n + 7 → impossible
    emit(MAXN + 7, [1] * MAXN)
else:  # max random
    emit(rnd.randint(10, 10**6), rand(MAXN, V))
